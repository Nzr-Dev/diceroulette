/**
 * Legal texts. They are plain data (title + paragraphs) and the page prints them as text, never as HTML.
 * Only English and Spanish exist: other languages show the English text.
 * {email} and {site} are replaced when shown.
 */
export interface LegalSection {
  title: string
  paragraphs: string[]
}
export interface LegalDocument {
  title: string
  sections: LegalSection[]
}
export type LegalKind = 'privacy' | 'terms'
export type LegalLang = 'en' | 'es'

export const LEGAL_TEXT: Record<LegalLang, Record<LegalKind, LegalDocument>> = {
  en: {
    privacy: {
      title: 'Privacy policy',
      sections: [
        {
          title: 'Who is responsible',
          paragraphs: [
            '{site} is a personal project. You can contact the person responsible about your data at {email}.',
            'You can use {site} without an account. In that case we do not receive any of your data: everything stays in your browser.',
          ],
        },
        {
          title: 'Without an account',
          paragraphs: [
            'Your tables, dice, wheels, counters, timers and history are saved only on your device, in your browser (IndexedDB). They are never sent to us.',
            'We also save in your browser your choices of theme, language and screen-on, and a copy of the app files so it can work offline. These are needed for the app to work and are not used to track you.',
            'When you share a table with a link, the table data travels inside the link after the # sign. Browsers do not send that part to any server.',
          ],
        },
        {
          title: 'With an account',
          paragraphs: [
            'If you sign in with Google, we receive your name, email address, profile picture and Google account identifier. We use them only to identify your account.',
            'We then store your tables (the content you create) so you can use them on all your devices. Your history is never uploaded.',
            'We use one session cookie to keep you signed in. It is strictly necessary for the service you asked for, so it does not need a banner. It expires automatically and is removed when you sign out.',
            'Legal basis: your consent when you sign in (you can leave at any time) and the need to provide the sync service you asked for. We keep your data until you delete your account. Tables you delete stay 30 days in the trash and are then erased.',
          ],
        },
        {
          title: 'Visit statistics',
          paragraphs: [
            'We use Vercel Web Analytics to count visits. It uses no cookies and stores nothing in your browser. It records only aggregated data about each page view (page, country, device type, browser and system) and cannot identify you or follow you across other sites. We remove everything after the # sign and any query from the address before it is sent.',
          ],
        },
        {
          title: 'Who processes data',
          paragraphs: [
            'To run the service we use: Vercel (hosting and statistics), Neon (database) and Google (sign-in). Some of these companies are based in the United States and protect international transfers with the mechanisms allowed by data protection law.',
            'We do not sell your data and there is no advertising on {site}. If advertising is added in the future, this policy will be updated first and you will be asked for consent where the law requires it.',
          ],
        },
        {
          title: 'Your rights',
          paragraphs: [
            'You can ask to access, correct, delete or take away your data, to limit or object to its use, and to withdraw your consent. Most of it you can do yourself: export any table as a file in your library, and delete your account (and all the tables in the cloud) from the account panel in your library.',
            'For anything else, write to {email}. If you think your rights were not respected, you can complain to your data protection authority (in Spain, the Agencia Española de Protección de Datos, www.aepd.es).',
          ],
        },
        {
          title: 'Children',
          paragraphs: ['{site} is not aimed at children under 14. Do not create an account if you are under that age.'],
        },
        {
          title: 'Changes',
          paragraphs: ['If this policy changes in an important way, we will say so on the site. The date at the top shows the last review.'],
        },
      ],
    },
    terms: {
      title: 'Terms of use',
      sections: [
        {
          title: 'The service',
          paragraphs: [
            '{site} offers dice, wheels, counters and timers for games. It is free and provided «as is», without guarantees. It may change, stop working for a while or be discontinued.',
            'Random results are generated with your browser’s secure random generator. We do not guarantee any result and {site} is not a gambling service.',
          ],
        },
        {
          title: 'Your content',
          paragraphs: [
            'The tables you create are yours. Do not upload anything illegal or that you do not have the right to use. We only store your tables to give you the sync service and we do not read or use them for any other purpose.',
            'Keep your own backups (export your tables as files). We do our best, but we cannot promise that nothing will ever be lost.',
          ],
        },
        {
          title: 'Fair use',
          paragraphs: [
            'Do not try to break, overload or abuse the service, to access other people’s data, or to use it for anything illegal. We can suspend an account that does.',
            'There are limits on the size of tables and on the storage of each account, shown in the Help page.',
          ],
        },
        {
          title: 'Ownership',
          paragraphs: ['The code, design and name of {site} belong to its author. All rights are reserved: seeing the source code does not give permission to copy or reuse it.'],
        },
        {
          title: 'Liability and law',
          paragraphs: [
            'As far as the law allows, we are not liable for losses caused by the use of the service or by its interruption. This does not limit rights that the law gives to consumers.',
            'These terms are governed by Spanish law. Questions: {email}.',
          ],
        },
      ],
    },
  },
  es: {
    privacy: {
      title: 'Política de privacidad',
      sections: [
        {
          title: 'Quién es el responsable',
          paragraphs: [
            '{site} es un proyecto personal. Puedes contactar con el responsable sobre tus datos en {email}.',
            'Puedes usar {site} sin cuenta. En ese caso no recibimos ningún dato tuyo: todo se queda en tu navegador.',
          ],
        },
        {
          title: 'Sin cuenta',
          paragraphs: [
            'Tus mesas, dados, ruletas, contadores, temporizadores e historial se guardan solo en tu dispositivo, en tu navegador (IndexedDB). Nunca se nos envían.',
            'También guardamos en tu navegador tus elecciones de tema, idioma y pantalla encendida, y una copia de los archivos de la app para que funcione sin conexión. Son necesarios para que la app funcione y no se usan para rastrearte.',
            'Cuando compartes una mesa con un enlace, los datos de la mesa viajan dentro del enlace, después del signo #. Los navegadores no envían esa parte a ningún servidor.',
          ],
        },
        {
          title: 'Con cuenta',
          paragraphs: [
            'Si inicias sesión con Google, recibimos tu nombre, correo electrónico, foto de perfil e identificador de la cuenta de Google. Solo los usamos para identificar tu cuenta.',
            'Entonces guardamos tus mesas (el contenido que creas) para que puedas usarlas en todos tus dispositivos. Tu historial nunca se sube.',
            'Usamos una cookie de sesión para mantenerte conectado. Es estrictamente necesaria para el servicio que has pedido, por eso no necesita banner. Caduca automáticamente y se borra al cerrar sesión.',
            'Base legal: tu consentimiento al iniciar sesión (puedes irte cuando quieras) y la necesidad de prestar el servicio de sincronización que has pedido. Conservamos tus datos hasta que elimines tu cuenta. Las mesas que borras están 30 días en la papelera y después se eliminan.',
          ],
        },
        {
          title: 'Estadísticas de visitas',
          paragraphs: [
            'Usamos Vercel Web Analytics para contar visitas. No usa cookies ni guarda nada en tu navegador. Solo registra datos agregados de cada visita a una página (página, país, tipo de dispositivo, navegador y sistema) y no puede identificarte ni seguirte por otros sitios. Antes de enviarla quitamos de la dirección todo lo que va detrás del # y cualquier parámetro.',
          ],
        },
        {
          title: 'Quién trata los datos',
          paragraphs: [
            'Para dar el servicio usamos: Vercel (alojamiento y estadísticas), Neon (base de datos) y Google (inicio de sesión). Algunas de estas empresas están en Estados Unidos y protegen las transferencias internacionales con los mecanismos que permite la normativa de protección de datos.',
            'No vendemos tus datos y {site} no tiene publicidad. Si en el futuro se añade publicidad, esta política se actualizará antes y se te pedirá consentimiento cuando la ley lo exija.',
          ],
        },
        {
          title: 'Tus derechos',
          paragraphs: [
            'Puedes pedir acceder a tus datos, corregirlos, eliminarlos o llevártelos, limitar u oponerte a su uso y retirar tu consentimiento. Casi todo puedes hacerlo tú: exporta cualquier mesa como archivo desde tu biblioteca y elimina tu cuenta (y todas las mesas en la nube) desde el panel de cuenta de la biblioteca.',
            'Para cualquier otra cosa, escribe a {email}. Si crees que no se han respetado tus derechos, puedes reclamar ante tu autoridad de protección de datos (en España, la Agencia Española de Protección de Datos, www.aepd.es).',
          ],
        },
        {
          title: 'Menores',
          paragraphs: ['{site} no está dirigido a menores de 14 años. No crees una cuenta si tienes menos de esa edad.'],
        },
        {
          title: 'Cambios',
          paragraphs: ['Si esta política cambia de forma importante, lo diremos en la web. La fecha de arriba indica la última revisión.'],
        },
      ],
    },
    terms: {
      title: 'Condiciones de uso',
      sections: [
        {
          title: 'El servicio',
          paragraphs: [
            '{site} ofrece dados, ruletas, contadores y temporizadores para juegos. Es gratuito y se ofrece «tal cual», sin garantías. Puede cambiar, dejar de funcionar durante un tiempo o dejar de ofrecerse.',
            'Los resultados aleatorios se generan con el generador aleatorio seguro de tu navegador. No garantizamos ningún resultado y {site} no es un servicio de juego de azar.',
          ],
        },
        {
          title: 'Tu contenido',
          paragraphs: [
            'Las mesas que creas son tuyas. No subas nada ilegal ni que no tengas derecho a usar. Solo guardamos tus mesas para darte el servicio de sincronización y no las leemos ni las usamos para ningún otro fin.',
            'Guarda tus propias copias de seguridad (exporta tus mesas como archivos). Hacemos lo posible, pero no podemos prometer que nunca se pierda nada.',
          ],
        },
        {
          title: 'Uso razonable',
          paragraphs: [
            'No intentes romper, sobrecargar ni abusar del servicio, acceder a datos de otras personas ni usarlo para nada ilegal. Podemos suspender una cuenta que lo haga.',
            'Hay límites en el tamaño de las mesas y en el almacenamiento de cada cuenta, que se muestran en la página de ayuda.',
          ],
        },
        {
          title: 'Propiedad',
          paragraphs: ['El código, el diseño y el nombre de {site} pertenecen a su autor. Todos los derechos reservados: ver el código fuente no da permiso para copiarlo ni reutilizarlo.'],
        },
        {
          title: 'Responsabilidad y ley aplicable',
          paragraphs: [
            'En la medida que permita la ley, no somos responsables de las pérdidas causadas por el uso del servicio ni por su interrupción. Esto no limita los derechos que la ley da a los consumidores.',
            'Estas condiciones se rigen por la ley española. Consultas: {email}.',
          ],
        },
      ],
    },
  },
}

/** Text for a language: Spanish and Catalan speakers get Spanish, everyone else English. */
export function legalDocument(kind: LegalKind, locale: string): { doc: LegalDocument; lang: LegalLang } {
  const lang: LegalLang = locale === 'es' || locale === 'ca' ? 'es' : 'en'
  return { doc: LEGAL_TEXT[lang][kind], lang }
}
