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

export default function TerminosPage() {
  const { config } = useConfiguracionSitio()

  const razonSocial = config.razon_social || '[Razón social de la empresa]'
  const nit = config.nit || '[NIT]'
  const correo = config.correo || '[correo@empresa.com]'

  useEffect(() => {
    document.title = 'Términos del servicio · Nexpak'
  }, [])

  return (
    <LegalLayout
      titulo="Términos del servicio"
      subtitulo="Condiciones generales del servicio de envíos internacionales Nexpak"
      actualizado="2025"
    >
      <p className="text-ink text-base leading-relaxed">
        Al contratar el servicio de envíos de <strong>{razonSocial}</strong> (NIT {nit}), usted acepta
        los presentes términos y condiciones. Le recomendamos leerlos detenidamente.
      </p>

      <Separador />

      <Seccion titulo="1. El servicio">
        <p>
          Nexpak es una agencia de envíos internacionales que gestiona el transporte de paquetes entre
          países y entre estados, en modalidad estándar o express. El servicio incluye la recepción del
          paquete en origen, el transporte internacional, los trámites aduaneros y la entrega en destino.
        </p>
        <p>
          La plataforma de rastreo en <strong>nexpak.com</strong> permite consultar el estado de cada envío
          mediante el número de guía.
        </p>
      </Seccion>

      <Separador />

      <Seccion titulo="2. Contratación y guía">
        <p>
          El servicio se contrata directamente con un operador de Nexpak. Una vez registrado el envío,
          el sistema genera automáticamente un <strong>número de guía único</strong> (formato NXP-XXXXXXX)
          que identifica el paquete durante todo su recorrido.
        </p>
        <p>
          El remitente es responsable de proporcionar datos correctos y completos del paquete y del destinatario.
          Datos incorrectos pueden ocasionar demoras, retención aduanera o imposibilidad de entrega.
        </p>
      </Seccion>

      <Separador />

      <Seccion titulo="3. Responsabilidades del cliente">
        <p>Al contratar el servicio, el remitente declara y acepta que:</p>
        <ul className="m-0 pl-5 flex flex-col gap-1">
          <li>El contenido del paquete es lícito y está permitido para su exportación e importación.</li>
          <li>El valor declarado del paquete es veraz.</li>
          <li>Los datos del destinatario son correctos y actuales.</li>
          <li>Los impuestos de importación en el país de destino son responsabilidad del destinatario,
            salvo acuerdo previo por escrito con Nexpak.</li>
        </ul>
      </Seccion>

      <Separador />

      <Seccion titulo="4. Objetos prohibidos">
        <p>No se aceptan envíos que contengan, entre otros:</p>
        <ul className="m-0 pl-5 flex flex-col gap-1">
          <li>Estupefacientes, sustancias psicoactivas o sus precursores.</li>
          <li>Armas de fuego, municiones o explosivos.</li>
          <li>Dinero en efectivo o instrumentos negociables al portador.</li>
          <li>Artículos falsificados o que infrinjan derechos de propiedad intelectual.</li>
          <li>Mercancías cuya importación o exportación esté prohibida por la legislación de los países
            de origen o destino.</li>
          <li>Materiales peligrosos, inflamables o radiactivos no declarados.</li>
        </ul>
        <p>
          Nexpak se reserva el derecho de no aceptar o retener cualquier envío que incumpla estas restricciones,
          y está obligada a informar a las autoridades competentes en caso de detectar objetos prohibidos.
        </p>
      </Seccion>

      <Separador />

      <Seccion titulo="5. Tiempos de entrega">
        <p>
          Los tiempos de entrega indicados son estimados y pueden variar por causas fuera del control de Nexpak,
          como demoras en aduana, condiciones climáticas, días festivos o restricciones operativas. Nexpak no
          garantiza fechas exactas de entrega.
        </p>
      </Seccion>

      <Separador />

      <Seccion titulo="6. Límite de responsabilidad">
        <p>
          En caso de pérdida o daño del paquete imputable a Nexpak, la indemnización se limita al
          <strong> valor declarado</strong> del paquete. Nexpak no responde por lucro cesante, pérdidas
          indirectas ni daños consecuentes.
        </p>
        <p>
          Para paquetes sin valor declarado, la indemnización máxima es equivalente a [monto máximo
          definido en el contrato de servicio].
        </p>
      </Seccion>

      <Separador />

      <Seccion titulo="7. Privacidad">
        <p>
          El tratamiento de los datos personales de remitentes y destinatarios se rige por nuestra{' '}
          <a href="/privacidad" className="text-accent-strong underline hover:no-underline">
            Política de tratamiento de datos personales
          </a>{' '}
          y el{' '}
          <a href="/aviso-privacidad" className="text-accent-strong underline hover:no-underline">
            Aviso de privacidad
          </a>.
        </p>
      </Seccion>

      <Separador />

      <Seccion titulo="8. Modificaciones">
        <p>
          Nexpak puede actualizar estos términos. Las modificaciones se publicarán en este enlace.
          El uso continuado del servicio después de la publicación de cambios implica su aceptación.
        </p>
      </Seccion>

      <Separador />

      <Seccion titulo="9. Ley aplicable y jurisdicción">
        <p>
          Estos términos se rigen por la legislación de Colombia. Para cualquier controversia, las partes
          se someten a la jurisdicción de los jueces competentes de la ciudad de {config.ciudad || '[Ciudad]'}.
        </p>
      </Seccion>

      <Separador />

      <Seccion titulo="10. Contacto">
        <p>
          Para cualquier consulta relacionada con estos términos, escríbanos a <strong>{correo}</strong>.
        </p>
      </Seccion>
    </LegalLayout>
  )
}
