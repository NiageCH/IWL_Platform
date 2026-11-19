import { FranjaAviso } from "@/components/vistas/franja-aviso";
import { CorreosDeTodos } from "@/components/vistas/correos";
import { leerCorreosDeTodos } from "@/lib/datos/correos";

export const metadata = { title: "Correos · Administración" };

export default async function Pagina({ searchParams }: PageProps<"/admin/correos">) {
  const { aviso } = await searchParams;
  const correos = await leerCorreosDeTodos();
  return (
    <>
      <FranjaAviso aviso={aviso} />
      <CorreosDeTodos {...correos} />
    </>
  );
}
