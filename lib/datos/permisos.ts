import { clienteServidor, personaActual, esIwl } from "@/lib/supabase/servidor";

/**
 * Qué puede hacer la persona que mira, en esta compañía.
 *
 * Es el espejo de las funciones `app.can_*` de la base. Sirve para decidir qué
 * se enseña, no para autorizar: quien autoriza es la base. Si estas dos cosas
 * discreparan, la que manda es la base y aquí solo se vería un botón que da
 * error al pulsarlo.
 */
export interface Permisos {
  esIwl: boolean;
  esAdmin: boolean;
  /** Pertenece al equipo fundador de esta compañía */
  esFundadora: boolean;
  /** Puede editar el contenido de la compañía */
  puedeEscribir: boolean;
  /** Puede validar y puntuar. Nunca la parte evaluada (§5, §11) */
  puedeValidar: boolean;
}

export async function permisosDeCompania(companyId: string): Promise<Permisos> {
  const persona = await personaActual();

  if (!persona) {
    return {
      esIwl: false,
      esAdmin: false,
      esFundadora: false,
      puedeEscribir: false,
      puedeValidar: false,
    };
  }

  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("company_members")
    .select("member_role")
    .eq("company_id", companyId)
    .eq("profile_id", persona.id);

  const papeles = new Set((data ?? []).map((m) => m.member_role));

  const iwl = esIwl(persona.role);
  const esFundadora = papeles.has("fundadora");
  const esRevisorAsignado =
    persona.role === "revisor_niage" && papeles.has("revisor_niage");

  return {
    esIwl: iwl,
    esAdmin: persona.role === "admin_iwl",
    esFundadora,
    puedeEscribir: iwl || esFundadora,
    puedeValidar: iwl || esRevisorAsignado,
  };
}
