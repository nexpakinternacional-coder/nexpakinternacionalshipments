import { useEffect } from 'react'
import { LegalLayout } from './LegalLayout'
import { useConfiguracionSitio } from '../../hooks/useConfiguracionSitio'

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="m-0 font-display font-bold text-navy text-xl">{titulo}</h2>
      <div className="text-ink text-base leading-relaxed flex flex-col gap-2">{children}</div>
    </section>
  )
}

function Separador() {
  return <hr className="border-border" />
}

export default function AvisoPrivacidadPage() {
  const { config } = useConfiguracionSitio()

  const razonSocial = config.razon_social || '[Razón social de la empresa]'
  const nit = config.nit || '[NIT]'
  const direccion = config.direccion || '[Dirección de la empresa]'
  const ciudad = config.ciudad || '[Ciudad, País]'
  const correo = config.correo || '[correo@empresa.com]'

  useEffect(() => {
    document.title = 'Aviso de privacidad · Nexpak'
  }, [])

  return (
    <LegalLayout
      titulo="Aviso de privacidad"
      subtitulo="Resumen de cómo tratamos sus datos personales"
      actualizado="2025"
    >
      <p className="text-ink text-base leading-relaxed">
        En cumplimiento de la Ley 1581 de 2012 (Protección de Datos Personales) y el Decreto 1377 de 2013,
        le informamos cómo <strong>{razonSocial}</strong> (NIT {nit}) trata sus datos personales cuando usa
        nuestro servicio de envíos internacionales.
      </p>

      <Separador />

      <Seccion titulo="¿Quién trata sus datos?">
        <p>
          <strong>{razonSocial}</strong>, identificada con NIT {nit}.
          Domicilio: {direccion}, {ciudad}.
          Contacto: <strong>{correo}</strong>.
        </p>
      </Seccion>

      <Separador />

      <Seccion titulo="¿Qué datos recolectamos?">
        <p>
          Nombre, teléfono, correo electrónico, dirección, ciudad y país del remitente y del destinatario de cada
          envío. Del destinatario también recolectamos el número de documento de identidad, cuando es requerido
          por la aduana del país de destino.
        </p>
      </Seccion>

      <Separador />

      <Seccion titulo="¿Para qué usamos sus datos?">
        <ul className="m-0 pl-5 flex flex-col gap-1">
          <li>Ejecutar y gestionar el envío contratado.</li>
          <li>Permitir el rastreo del estado del paquete.</li>
          <li>Cumplir requisitos legales y aduaneros.</li>
          <li>Comunicarle novedades sobre su envío.</li>
        </ul>
        <p>Sus datos <strong>no</strong> se venden ni se comparten con terceros para fines distintos a los del servicio.</p>
      </Seccion>

      <Separador />

      <Seccion titulo="¿Cuánto tiempo los guardamos?">
        <p>
          Durante el tiempo necesario para prestar el servicio y por el mínimo exigido por la normativa aduanera
          y tributaria, generalmente <strong>5 años</strong> desde la fecha de la operación.
        </p>
      </Seccion>

      <Separador />

      <Seccion titulo="Sus derechos">
        <p>
          Usted puede <strong>conocer, actualizar, rectificar y suprimir</strong> sus datos personales, y revocar
          la autorización de tratamiento, escribiéndonos a <strong>{correo}</strong>.
          Respondemos en máximo <strong>15 días hábiles</strong>.
        </p>
        <p>
          También puede presentar una queja ante la Superintendencia de Industria y Comercio (SIC)
          si considera que sus derechos han sido vulnerados.
        </p>
      </Seccion>

      <Separador />

      <Seccion titulo="Autorización">
        <p>
          Al contratar nuestro servicio de envíos y proporcionar sus datos, usted autoriza el tratamiento
          descrito en este aviso y en nuestra{' '}
          <a href="/privacidad" className="text-accent-strong underline hover:no-underline">
            Política de tratamiento de datos personales
          </a>.
        </p>
      </Seccion>
    </LegalLayout>
  )
}
