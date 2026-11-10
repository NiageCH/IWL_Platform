import { cache } from "react";
import { clienteServidor } from "@/lib/supabase/servidor";
import { leerRevisionesComite } from "@/lib/datos/comite";
import {
  UMBRALES_POR_DEFECTO,
  estaDetenido,
  pasoEnCurso,
  pasosDeOnboarding,
  type DatosOnboarding,
  type Paso,
  type Umbrales,
} from "@/lib/onboarding";

/**
 * Lectura del alta de cada persona: las fechas que hacen falta para la
 * línea de pasos de `lib/onboarding.ts`.
 *
 * Todo con el cliente de sesión: lo ve quien RLS deje. Los perfiles, las
 * candidaturas y las firmas del NDA son de IWL; los avisos, de dirección.
 */

type Cliente = Awaited<ReturnType<typeof clienteServidor>>;

export const leerUmbrales = cache(async (): Promise<Umbrales> => {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "onboarding_umbrales")
    .maybeSingle();
  const v = (data?.value ?? {}) as Partial<Umbrales>;
  return {
    atencion_dias: Number(v.atencion_dias ?? UMBRALES_POR_DEFECTO.atencion_dias),
    vencido_dias: Number(v.vencido_dias ?? UMBRALES_POR_DEFECTO.vencido_dias),
  };
});

interface Perfil {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
  primer_acceso_at: string | null;
  contrasena_cambiada_at: string | null;
}

const COLUMNAS_PERFIL = "id, full_name, email, created_at, primer_acceso_at, contrasena_cambiada_at";

/** Lo que hace falta de varias candidaturas a la vez, en cuatro consultas */
async function datosDeCandidaturas(supabase: Cliente, ids: string[]) {
  if (!ids.length) return new Map<string, NonNullable<DatosOnboarding["candidatura"]>>();

  const [{ data: firmas }, { data: entregas }, { data: documentos }, { data: eventos }] =
    await Promise.all([
      supabase.from("nda_firmas").select("candidatura_id, firmado_at, contrafirmado_at").in("candidatura_id", ids),
      supabase.from("candidatura_entregas").select("candidatura_id, obligatoria, documentos").in("candidatura_id", ids),
      supabase.from("candidatura_documentos").select("candidatura_id, created_at").in("candidatura_id", ids),
      supabase
        .from("candidatura_eventos")
        .select("candidatura_id, tipo, hasta, ocurrido_on")
        .in("candidatura_id", ids),
    ]);

  const salida = new Map<string, NonNullable<DatosOnboarding["candidatura"]>>();
  for (const id of ids) {
    const firma = firmas?.find((f) => f.candidatura_id === id);
    const obligatorias = (entregas ?? []).filter((e) => e.candidatura_id === id && e.obligatoria);
    const ultima = (documentos ?? [])
      .filter((d) => d.candidatura_id === id)
      .map((d) => d.created_at)
      .sort()
      .at(-1) ?? null;

    /*
     * El comité que cuenta aquí es el de después del due diligence: un
     * comité anotado después de que IWL firmara el NDA, o el paso a
     * «Acuerdo propuesto», que no se da sin él.
     */
    const desde = firma?.contrafirmado_at?.slice(0, 10) ?? null;
    const propios = (eventos ?? []).filter((e) => e.candidatura_id === id);
    const comite =
      propios
        .filter((e) => e.tipo === "comite" && (!desde || e.ocurrido_on >= desde))
        .map((e) => e.ocurrido_on)
        .sort()
        .at(-1) ??
      propios
        .filter((e) => e.tipo === "cambio_estado" && e.hasta === "acuerdo")
        .map((e) => e.ocurrido_on)
        .sort()
        .at(-1) ??
      null;

    salida.set(id, {
      descartada: false,
      ndaElla: firma?.firmado_at ?? null,
      ndaIwl: firma?.contrafirmado_at ?? null,
      entregas: obligatorias.length
        ? {
            cumplidas: obligatorias.filter((e) => (e.documentos ?? 0) > 0).length,
            total: obligatorias.length,
            ultima,
          }
        : null,
      comite,
      acuerdo: null,
    });
  }
  return salida;
}

function datosDePerfil(p: Perfil | null | undefined) {
  return {
    cuentaCreada: p?.created_at ?? null,
    primerAcceso: p?.primer_acceso_at ?? null,
    contrasenaCambiada: p?.contrasena_cambiada_at ?? null,
  };
}

export interface AltaDe {
  persona: { id: string; nombre: string; correo: string | null } | null;
  pasos: Paso[];
}

/** La línea de una candidatura: la de su candidata */
export async function leerAltaCandidatura(id: string): Promise<AltaDe> {
  const supabase = await clienteServidor();
  const umbrales = await leerUmbrales();

  const { data: c } = await supabase
    .from("candidaturas")
    .select("id, estado, profile_id, acuerdo_firmado_on, contacto_nombre, contacto_email")
    .eq("id", id)
    .maybeSingle();
  if (!c) return { persona: null, pasos: [] };

  const { data: perfil } = c.profile_id
    ? await supabase.from("profiles").select(COLUMNAS_PERFIL).eq("id", c.profile_id).maybeSingle()
    : { data: null };

  const extra = (await datosDeCandidaturas(supabase, [c.id])).get(c.id)!;
  const pasos = pasosDeOnboarding(
    {
      ...datosDePerfil(perfil as Perfil | null),
      candidatura: {
        ...extra,
        descartada: c.estado === "descartada",
        acuerdo: c.estado === "firmada" ? (c.acuerdo_firmado_on ?? null) : null,
      },
    },
    umbrales,
  );

  return {
    persona: {
      id: c.profile_id ?? "",
      nombre: (perfil as Perfil | null)?.full_name ?? c.contacto_nombre,
      correo: (perfil as Perfil | null)?.email ?? c.contacto_email,
    },
    pasos,
  };
}

/**
 * La línea de una compañía.
 *
 * Si vino del embudo, la de su candidatura. Si se dio de alta directamente,
 * una por cada persona del equipo fundador, hasta la contraseña: ahí no
 * hay NDA ni due diligence de selección.
 */
export async function leerAltaCompania(companyId: string): Promise<AltaDe[]> {
  const supabase = await clienteServidor();

  const { data: cand } = await supabase
    .from("candidaturas")
    .select("id")
    .eq("company_id", companyId)
    .maybeSingle();
  if (cand) return [await leerAltaCandidatura(cand.id)];

  const umbrales = await leerUmbrales();
  const { data: miembros } = await supabase
    .from("company_members")
    .select(`profiles(${COLUMNAS_PERFIL})`)
    .eq("company_id", companyId)
    .eq("member_role", "fundadora");

  return (miembros ?? [])
    .map((m) => m.profiles as unknown as Perfil | null)
    .filter((p): p is Perfil => Boolean(p))
    .map((p) => ({
      persona: { id: p.id, nombre: p.full_name ?? p.email ?? "Sin nombre", correo: p.email },
      pasos: pasosDeOnboarding({ ...datosDePerfil(p), candidatura: null }, umbrales),
    }));
}

export interface AltaEnCurso {
  /** A dónde lleva pulsarla: la candidatura o la compañía */
  href: string;
  donde: string;
  persona: string;
  correo: string | null;
  paso: Paso;
  detenido: boolean;
}

/**
 * Todas las altas con un paso abierto, para el inicio de dirección.
 *
 * Candidaturas vivas con cuenta, y compañías dadas de alta directamente
 * cuyo equipo fundador no ha terminado de entrar.
 */
export const leerAltasEnCurso = cache(async (): Promise<AltaEnCurso[]> => {
  const supabase = await clienteServidor();
  const umbrales = await leerUmbrales();
  const salida: AltaEnCurso[] = [];

  const { data: candidaturas } = await supabase
    .from("candidaturas")
    .select("id, nombre, estado, profile_id, contacto_nombre, contacto_email, is_demo")
    .not("profile_id", "is", null)
    .not("estado", "in", "(firmada,descartada)")
    .eq("is_demo", false);

  const conCuenta = candidaturas ?? [];
  const idsPerfil = conCuenta.map((c) => c.profile_id!).filter(Boolean);
  const { data: perfiles } = idsPerfil.length
    ? await supabase.from("profiles").select(COLUMNAS_PERFIL).in("id", idsPerfil)
    : { data: [] };
  const extras = await datosDeCandidaturas(supabase, conCuenta.map((c) => c.id));

  for (const c of conCuenta) {
    const perfil = (perfiles as Perfil[] | null)?.find((p) => p.id === c.profile_id);
    const pasos = pasosDeOnboarding(
      { ...datosDePerfil(perfil), candidatura: { ...extras.get(c.id)!, descartada: false, acuerdo: null } },
      umbrales,
    );
    const paso = pasoEnCurso(pasos);
    if (!paso) continue;
    salida.push({
      href: `/embudo/${c.id}`,
      donde: c.nombre,
      persona: perfil?.full_name ?? c.contacto_nombre,
      correo: perfil?.email ?? c.contacto_email,
      paso,
      detenido: estaDetenido(pasos),
    });
  }

  // Compañías sin candidatura: su equipo fundador, mientras no haya terminado de entrar
  const { data: fundadoras } = await supabase
    .from("company_members")
    .select(`companies!inner(slug, name, is_demo, archived_at), profiles!inner(${COLUMNAS_PERFIL})`)
    .eq("member_role", "fundadora")
    .is("profiles.contrasena_cambiada_at", null);

  for (const f of fundadoras ?? []) {
    const compania = f.companies as unknown as { slug: string; name: string; is_demo: boolean; archived_at: string | null };
    const perfil = f.profiles as unknown as Perfil;
    if (compania.is_demo || compania.archived_at) continue;
    const pasos = pasosDeOnboarding({ ...datosDePerfil(perfil), candidatura: null }, umbrales);
    const paso = pasoEnCurso(pasos);
    if (!paso) continue;
    salida.push({
      href: `/cartera/${compania.slug}`,
      donde: compania.name,
      persona: perfil.full_name ?? perfil.email ?? "Sin nombre",
      correo: perfil.email,
      paso,
      detenido: estaDetenido(pasos),
    });
  }

  return salida.sort((a, b) => (b.paso.dias ?? 0) - (a.paso.dias ?? 0));
});

export interface Aviso {
  id: string;
  tipo: "primer_acceso" | "nda_firmado" | "nda_comentario" | "situacion_dicha";
  created_at: string;
  persona: string;
  candidaturaId: string | null;
  /** El identificador de la compañía, para los avisos que son de una compañía */
  companiaSlug: string | null;
  donde: string | null;
}

/** Los avisos sin cerrar. Solo los ve dirección: RLS devuelve vacío al resto */
export const leerAvisos = cache(async (): Promise<Aviso[]> => {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("avisos")
    .select(
      "id, tipo, created_at, candidatura_id, profiles!avisos_profile_id_fkey(full_name, email), candidaturas(nombre), companies(name, slug)",
    )
    .is("cerrado_at", null)
    .order("created_at", { ascending: false });

  return (data ?? []).map((a) => {
    const p = a.profiles as unknown as { full_name: string | null; email: string | null } | null;
    const c = a.candidaturas as unknown as { nombre: string } | null;
    const co = a.companies as unknown as { name: string; slug: string } | null;
    return {
      id: a.id,
      tipo: a.tipo as Aviso["tipo"],
      created_at: a.created_at,
      persona: p?.full_name ?? p?.email ?? "Alguien",
      candidaturaId: a.candidatura_id,
      companiaSlug: co?.slug ?? null,
      donde: c?.nombre ?? co?.name ?? null,
    };
  });
});

/**
 * El número de la barra lateral: avisos sin cerrar más altas detenidas.
 * Lo que pide que dirección haga algo, y nada más.
 */
export const contarPendientesDireccion = cache(async (): Promise<number> => {
  const [avisos, altas, revisiones] = await Promise.all([
    leerAvisos(),
    leerAltasEnCurso(),
    leerRevisionesComite(),
  ]);
  return avisos.length + altas.filter((a) => a.detenido).length + revisiones.length;
});
