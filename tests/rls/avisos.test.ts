import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { COMPANIAS, USUARIOS, clienteServicio, entrarComo } from "./clientes";

/**
 * Los avisos se cierran solos cuando dejan de tocar, y lo que viene después
 * de una fecha se avisa al llegar la fecha (REVISION, 18 nov).
 *
 * Con candidaturas y una compañía creadas para la prueba. Se borran al
 * acabar, y con ellas sus reuniones y sus avisos.
 */

const COHORTE = "00000000-0000-0000-0003-000000000001";
const ORGANIZACION = "00000000-0000-0000-0001-000000000001";
const servicio = clienteServicio();
const creadas: string[] = [];
let companiaId = "";
let adminId = "";
let equipoId = "";

const ayer = () => new Date(Date.now() - 86_400_000);
const enHoras = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

async function idDe(email: string) {
  const { data } = await servicio.from("profiles").select("id").eq("email", email).single();
  return data!.id as string;
}

async function candidatura(estado = "reunion") {
  const sufijo = crypto.randomUUID().slice(0, 8);
  const { data, error } = await servicio
    .from("candidaturas")
    .insert({
      cohort_id: COHORTE,
      nombre: `RLS Avisos ${sufijo}`,
      contacto_nombre: "Prueba",
      contacto_email: `rls.avisos.${sufijo}@ejemplo.test`,
      estado,
      estado_declarado: "mvp",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  creadas.push(data!.id);
  return data!.id as string;
}

async function abiertos(filtro: { candidatura_id?: string; company_id?: string; reunion_id?: string }) {
  let q = servicio.from("avisos").select("tipo, para").is("cerrado_at", null);
  for (const [k, v] of Object.entries(filtro)) q = q.eq(k, v);
  const { data } = await q;
  return data ?? [];
}

beforeAll(async () => {
  adminId = await idDe(USUARIOS.admin);
  equipoId = await idDe(USUARIOS.equipoIwl);
});

afterAll(async () => {
  if (creadas.length) await servicio.from("candidaturas").delete().in("id", creadas);
  if (companiaId) await servicio.from("companies").delete().eq("id", companiaId);
});

describe("anota la reunión", () => {
  it("al día siguiente avisa a quien la propuso y a quien fue de IWL, una vez; al anotarla se cierra", async () => {
    const id = await candidatura();
    const inicio = ayer();
    inicio.setUTCHours(9, 0, 0, 0);
    const { data: r, error } = await servicio
      .from("candidatura_reuniones")
      .insert({
        candidatura_id: id,
        estado: "confirmada",
        franjas: [{ inicio: inicio.toISOString(), fin: new Date(inicio.getTime() + 3_600_000).toISOString() }],
        elegida: { inicio: inicio.toISOString(), fin: new Date(inicio.getTime() + 3_600_000).toISOString() },
        propuesta_por: adminId,
        personas_iwl: [equipoId],
        formato: "videollamada",
        enlace: "https://meet.ejemplo.test/abc",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    // Nadie con sesión lo dispara
    const admin = await entrarComo(USUARIOS.admin);
    expect((await admin.rpc("avisar_reuniones_por_anotar")).error).not.toBeNull();

    expect((await servicio.rpc("avisar_reuniones_por_anotar")).error).toBeNull();
    await servicio.rpc("avisar_reuniones_por_anotar");
    const avisos = await abiertos({ reunion_id: r!.id });
    expect(avisos.map((a) => a.tipo)).toEqual(["reunion_anotar", "reunion_anotar"]);
    expect(new Set(avisos.map((a) => a.para))).toEqual(new Set([adminId, equipoId]));

    // Cada uno ve el suyo
    const equipo = await entrarComo(USUARIOS.equipoIwl);
    const { data: suyos } = await equipo.from("avisos").select("tipo").eq("reunion_id", r!.id);
    expect(suyos).toEqual([{ tipo: "reunion_anotar" }]);

    await servicio.from("candidatura_reuniones").update({ estado: "celebrada", celebrada_on: inicio.toISOString().slice(0, 10) }).eq("id", r!.id);
    expect(await abiertos({ reunion_id: r!.id })).toEqual([]);
  });

  it("una reunión de hoy todavía no pide anotarse", async () => {
    const id = await candidatura();
    const hoy = new Date();
    await servicio.from("candidatura_reuniones").insert({
      candidatura_id: id,
      estado: "confirmada",
      franjas: [{ inicio: hoy.toISOString(), fin: enHoras(1) }],
      elegida: { inicio: hoy.toISOString(), fin: enHoras(1) },
      propuesta_por: adminId,
    });
    await servicio.rpc("avisar_reuniones_por_anotar");
    expect(await abiertos({ candidatura_id: id })).toEqual([]);
  });
});

describe("se cierran solos", () => {
  it("las otras fechas, cuando pasan todas: sale «sin fecha», que se cierra al proponer otras", async () => {
    const id = await candidatura();
    const pasada = ayer().toISOString();
    const { data: r } = await servicio
      .from("candidatura_reuniones")
      .insert({
        candidatura_id: id,
        estado: "contrapropuesta",
        propuesta_de: "candidata",
        franjas: [{ inicio: pasada, fin: pasada }],
      })
      .select("id")
      .single();
    await servicio.from("avisos").insert({ tipo: "reunion_contrapropuesta", candidatura_id: id, reunion_id: r!.id });

    await servicio.rpc("avisar_reuniones_caducadas");
    expect((await abiertos({ candidatura_id: id })).map((a) => a.tipo)).toEqual(["reunion_caducada"]);

    await servicio.from("candidatura_reuniones").insert({
      candidatura_id: id,
      estado: "propuesta",
      franjas: [{ inicio: enHoras(48), fin: enHoras(49) }],
      propuesta_por: adminId,
    });
    expect(await abiertos({ candidatura_id: id })).toEqual([]);
  });

  it("todo lo de una candidatura, al descartarla", async () => {
    const id = await candidatura("nda");
    await servicio.from("avisos").insert([
      { tipo: "nda_firmado", candidatura_id: id },
      { tipo: "nda_comentario", candidatura_id: id },
    ]);
    expect(await abiertos({ candidatura_id: id })).toHaveLength(2);

    const { error } = await servicio
      .from("candidaturas")
      .update({
        estado: "descartada",
        descartada_desde: "nda",
        descartada_motivo: "Prueba de avisos",
        descartada_at: new Date().toISOString(),
      })
      .eq("id", id);
    expect(error).toBeNull();
    expect(await abiertos({ candidatura_id: id })).toEqual([]);
  });

  it("todo lo de una compañía, al archivarla", async () => {
    const sufijo = crypto.randomUUID().slice(0, 8);
    const { data: co } = await servicio
      .from("companies")
      .insert({ organization_id: ORGANIZACION, name: `RLS Avisos ${sufijo}`, slug: `rls-avisos-${sufijo}` })
      .select("id")
      .single();
    companiaId = co!.id;
    await servicio.from("avisos").insert({ tipo: "situacion_dicha", company_id: companiaId });
    expect(await abiertos({ company_id: companiaId })).toHaveLength(1);

    await servicio
      .from("companies")
      .update({ archived_at: new Date().toISOString(), archive_reason: "Prueba de avisos" })
      .eq("id", companiaId);
    expect(await abiertos({ company_id: companiaId })).toEqual([]);
  });
});

describe("los que faltaban (REVISION, 19 nov)", () => {
  const MAREA = COMPANIAS.marea;

  it("una candidatura nueva va a todo IWL, no a mentores ni fundadoras; pasar a revisión la cierra", async () => {
    const id = await candidatura("presentada");
    const [aviso] = await abiertos({ candidatura_id: id });
    expect(aviso).toEqual({ tipo: "candidatura_nueva", para: null });

    for (const [quien, ve] of [
      [USUARIOS.equipoIwl, 1],
      [USUARIOS.mentorProducto, 0],
      [USUARIOS.fundadoraMarea, 0],
    ] as const) {
      const cliente = await entrarComo(quien);
      const { data } = await cliente.from("avisos").select("id").eq("candidatura_id", id);
      expect(data ?? [], quien).toHaveLength(ve);
    }

    await servicio.from("candidaturas").update({ estado: "en_revision" }).eq("id", id);
    expect(await abiertos({ candidatura_id: id })).toEqual([]);
  });

  it("un acta pide firma a cada miembro; firmar cierra el suyo, y borrar el borrador cierra el resto", async () => {
    const id = await candidatura("comite");
    const { data: acta } = await servicio
      .from("comite_actas")
      .insert({ candidatura_id: id, resumen: "Prueba de avisos", decision: "aplazada", revision_on: "2030-01-01" })
      .select("id")
      .single();
    await servicio.from("comite_firmas").insert([
      { acta_id: acta!.id, profile_id: adminId },
      { acta_id: acta!.id, profile_id: equipoId },
    ]);
    const porFirmar = async () =>
      (await servicio.from("avisos").select("para").eq("acta_id", acta!.id).is("cerrado_at", null)).data ?? [];
    expect(new Set((await porFirmar()).map((a) => a.para))).toEqual(new Set([adminId, equipoId]));

    // Cada uno ve el suyo, no el del otro
    const equipo = await entrarComo(USUARIOS.equipoIwl);
    const { data: suyos } = await equipo.from("avisos").select("para").eq("acta_id", acta!.id);
    expect(suyos).toEqual([{ para: equipoId }]);

    await servicio.rpc("firmar_acta", { p_acta: acta!.id, p_profile: adminId, p_ip: "1.2.3.4", p_ua: "prueba" });
    expect(await porFirmar()).toEqual([{ para: equipoId }]);

    // Otra acta sin firmar, que se borra: su aviso queda cerrado y sin acta
    const { data: borrador } = await servicio
      .from("comite_actas")
      .insert({ candidatura_id: id, resumen: "Borrador", decision: "aplazada", revision_on: "2030-01-01" })
      .select("id")
      .single();
    await servicio.from("comite_firmas").insert({ acta_id: borrador!.id, profile_id: equipoId });
    const { data: delBorrador } = await servicio.from("avisos").select("id").eq("acta_id", borrador!.id).single();
    await servicio.from("comite_actas").delete().eq("id", borrador!.id);
    const { data: quedo } = await servicio.from("avisos").select("acta_id, cerrado_at").eq("id", delBorrador!.id).single();
    expect(quedo!.acta_id).toBeNull();
    expect(quedo!.cerrado_at).not.toBeNull();
  });

  it("un documento entregado va a quien lo pidió; si lo mueve IWL, no avisa; validarlo lo cierra", async () => {
    const { data: area } = await servicio.from("dd_areas").select("id").eq("is_active", true).limit(1).single();
    const { data: puntos } = await servicio
      .from("dd_items")
      .insert([
        { company_id: MAREA, area_id: area!.id, title: "RLS pedido por el equipo", created_by: equipoId },
        { company_id: MAREA, area_id: area!.id, title: "RLS que mueve IWL" },
      ])
      .select("id, title");
    const porTitulo = (titulo: string) => puntos!.find((p) => p.title === titulo)!.id;
    const [pedido, deIwl] = [porTitulo("RLS pedido por el equipo"), porTitulo("RLS que mueve IWL")];
    try {
      await servicio.from("dd_items").update({ status: "en_revision" }).eq("id", pedido);
      const { data: a } = await servicio
        .from("avisos")
        .select("tipo, para, para_iwl")
        .eq("dd_item_id", pedido)
        .is("cerrado_at", null)
        .single();
      expect(a).toEqual({ tipo: "documento_entregado", para: equipoId, para_iwl: false });

      const admin = await entrarComo(USUARIOS.admin);
      await admin.from("dd_items").update({ status: "en_revision" }).eq("id", deIwl);
      expect((await servicio.from("avisos").select("id").eq("dd_item_id", deIwl)).data).toEqual([]);

      await admin.from("dd_items").update({ status: "validado" }).eq("id", pedido);
      expect((await servicio.from("avisos").select("id").eq("dd_item_id", pedido).is("cerrado_at", null)).data).toEqual([]);
    } finally {
      await servicio.from("dd_items").delete().in("id", [pedido, deIwl]);
    }
  });

  it("los correos sin enviar son un aviso solo, que se cierra cuando no queda ninguno", async () => {
    const { count: antes } = await servicio.from("correos").select("id", { count: "exact", head: true }).eq("estado", "sin_enviar");
    expect(antes, "la prueba parte sin correos sin enviar").toBe(0);
    const { data: filas } = await servicio
      .from("correos")
      .insert(
        [1, 2].map((n) => ({
          evento: "recordatorio",
          destinatario: `rls.correos.${n}@ejemplo.test`,
          asunto: "Prueba",
          estado: "sin_enviar",
        })),
      )
      .select("id");
    const ids = filas!.map((f) => f.id);
    const abiertosDeCorreos = async () =>
      (await servicio.from("avisos").select("id").eq("tipo", "correos_sin_enviar").is("cerrado_at", null)).data ?? [];
    try {
      const [aviso] = await abiertosDeCorreos();
      expect(await abiertosDeCorreos()).toHaveLength(1);

      await servicio.from("correos").update({ estado: "enviado" }).eq("id", ids[0]);
      expect(await abiertosDeCorreos()).toHaveLength(1);
      await servicio.from("correos").update({ estado: "enviado" }).eq("id", ids[1]);
      expect(await abiertosDeCorreos()).toEqual([]);
      await servicio.from("avisos").delete().eq("id", aviso.id);
    } finally {
      await servicio.from("correos").delete().in("id", ids);
    }
  });
});
