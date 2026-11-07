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

export default function PrivacidadPage() {
  const { config } = useConfiguracionSitio()

  const razonSocial = config.razon_social || '[Razón social de la empresa]'
  const nit = config.nit || '[NIT]'
  const direccion = config.direccion || '[Dirección de la empresa]'
  const ciudad = config.ciudad || '[Ciudad, País]'
  const correo = config.correo || '[correo@empresa.com]'

  useEffect(() => {
    document.title = 'Política de tratamiento de datos personales · Nexpak'
  }, [])

  return (
    <LegalLayout
      titulo="Política de tratamiento de datos personales"
      subtitulo="Conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013 (Colombia)"
      actualizado="2025"
    >
      <Seccion titulo="1. Responsable del tratamiento">
        <p>
          <strong>{razonSocial}</strong>, identificada con NIT {nit}, con domicilio en {direccion}, {ciudad},
          es la responsable del tratamiento de los datos personales recolectados a través de la plataforma Nexpak.
        </p>
        <p>Correo de contacto para asuntos de privacidad: <strong>{correo}</strong></p>
      </Seccion>

      <Separador />

      <Seccion titulo="2. Datos personales que se recolectan">
        <p>Nexpak recolecta los siguientes datos de las personas naturales que intervienen en cada envío:</p>
        <p><strong>Del remitente:</strong></p>
        <ul className="m-0 pl-5 flex flex-col gap-1">
          <li>Nombre completo</li>
          <li>Número de teléfono</li>
          <li>Correo electrónico</li>
          <li>Dirección de recogida</li>
          <li>País y ciudad de origen</li>
        </ul>
        <p><strong>Del destinatario:</strong></p>
        <ul className="m-0 pl-5 flex flex-col gap-1">
          <li>Nombre completo</li>
          <li>Número de teléfono</li>
          <li>Correo electrónico</li>
          <li>Dirección de entrega</li>
          <li>País y ciudad de destino</li>
          <li>Número de documento de identidad (para trámites aduaneros)</li>
        </ul>
        <p>
          Los datos del destinatario en la consulta pública de rastreo se muestran de forma parcialmente oculta
          (ej. "Juan P.") para proteger la privacidad del titular.
        </p>
      </Seccion>

      <Separador />

      <Seccion titulo="3. Finalidad del tratamiento">
        <p>Los datos personales recolectados se usan exclusivamente para:</p>
        <ul className="m-0 pl-5 flex flex-col gap-1">
          <li>Gestionar y ejecutar el servicio de transporte y envío internacional contratado.</li>
          <li>Permitir el rastreo del estado del envío por parte del destinatario o remitente.</li>
          <li>Cumplir con los requisitos legales y aduaneros de los países de origen y destino.</li>
          <li>Comunicar novedades, retrasos o incidencias relacionadas con el envío.</li>
          <li>Generar documentos de transporte (guía, rótulo) necesarios para la operación logística.</li>
        </ul>
        <p>
          Los datos <strong>no</strong> se venden, ceden ni comparten con terceros para fines comerciales o publicitarios.
        </p>
      </Seccion>

      <Separador />

      <Seccion titulo="4. Tiempo de conservación">
        <p>
          Los datos se conservan durante el tiempo que sea necesario para cumplir la finalidad del tratamiento y por el
          período mínimo exigido por la normativa aduanera y tributaria vigente, que en Colombia es de <strong>5 años</strong>
          {' '}contados desde la fecha de la operación. Pasado este período, los datos son inactivados en la base de datos.
        </p>
      </Seccion>

      <Separador />

      <Seccion titulo="5. Derechos de los titulares">
        <p>
          De conformidad con la Ley 1581 de 2012, los titulares de los datos tienen derecho a:
        </p>
        <ul className="m-0 pl-5 flex flex-col gap-1">
          <li><strong>Conocer</strong> los datos personales que se tienen sobre ellos.</li>
          <li><strong>Actualizar</strong> los datos cuando estén desactualizados o sean inexactos.</li>
          <li><strong>Rectificar</strong> los datos cuando sean incorrectos o incompletos.</li>
          <li><strong>Suprimir</strong> los datos cuando no sean necesarios para la finalidad que motivó su recolección,
            salvo obligación legal de conservarlos.</li>
          <li><strong>Revocar la autorización</strong> para el tratamiento cuando no se respeten los principios de la ley.</li>
          <li><strong>Presentar quejas</strong> ante la Superintendencia de Industria y Comercio (SIC) por infracciones a la ley.</li>
        </ul>
      </Seccion>

      <Separador />

      <Seccion titulo="6. Cómo ejercer los derechos">
        <p>
          Para ejercer cualquiera de los derechos anteriores, el titular o su representante legal puede enviar una
          solicitud escrita al correo <strong>{correo}</strong>, indicando:
        </p>
        <ul className="m-0 pl-5 flex flex-col gap-1">
          <li>Nombre completo e identificación del titular.</li>
          <li>Descripción clara de la solicitud y el derecho que desea ejercer.</li>
          <li>Número de guía del envío al que hace referencia (si aplica).</li>
        </ul>
        <p>
          Nexpak responderá en un plazo máximo de <strong>15 días hábiles</strong> contados a partir de la recepción
          de la solicitud. Si la consulta no puede atenderse en ese plazo, se informará al titular dentro de los
          primeros 10 días hábiles.
        </p>
      </Seccion>

      <Separador />

      <Seccion titulo="7. Medidas de seguridad">
        <p>
          Nexpak implementa medidas técnicas y organizativas para proteger los datos personales contra pérdida,
          acceso no autorizado, divulgación, alteración o destrucción. Entre ellas:
        </p>
        <ul className="m-0 pl-5 flex flex-col gap-1">
          <li>Cifrado de la conexión mediante TLS/HTTPS.</li>
          <li>Control de acceso basado en roles: solo el personal autorizado puede consultar datos completos de destinatarios.</li>
          <li>Respaldos periódicos cifrados de la base de datos.</li>
          <li>Acceso a la plataforma administrativa protegido por contraseña y autenticación gestionada por Supabase Auth.</li>
        </ul>
      </Seccion>

      <Separador />

      <Seccion titulo="8. Cambios a esta política">
        <p>
          Nexpak puede actualizar esta política cuando sea necesario. Las modificaciones se publicarán en este mismo
          enlace con la fecha de actualización. Se recomienda revisar periódicamente este documento.
        </p>
      </Seccion>
    </LegalLayout>
  )
}
