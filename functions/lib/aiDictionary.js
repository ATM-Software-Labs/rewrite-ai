/**
 * Diccionario Industrial Anti-Detección IA (GPTZero, Turnitin, Copyleaks, ZeroGPT)
 * Colección exhaustiva de patrones, muletillas, n-gramas sintéticos y motor de sanitización.
 */

export const BANNED_PHRASES_ES = [
  // Conectores y transiciones robóticas
  'en resumen', 'en conclusión', 'en definitiva', 'por consiguiente', 'por ende', 
  'asimismo', 'no obstante', 'cabe señalar', 'cabe destacar que', 'cabe destacar',
  'cabe mencionar', 'es fundamental destacar', 'es de vital importancia', 'es menester',
  'es imperativo', 'en este sentido', 'en este orden de ideas', 'en lo que respecta a',
  'a fin de cuentas', 'a grandes rasgos', 'en resumidas cuentas', 'de cara a', 
  'a la hora de', 'en última instancia', 'como se ha mencionado', 'huelga decir',
  'no cabe duda de que', 'como es bien sabido', 'poner de relieve', 'dar pie a',
  'abrir la puerta a', 'marcar un hito', 'un punto de inflexión', 'de suma importancia',

  // Fórmulas trilladas de IA
  'a día de hoy', 'en el panorama actual', 'en el mundo actual', 'en la era digital',
  'un tapiz de', 'un tapiz', 'un sinfín de', 'un abanico de posibilidades', 'un abanico de',
  'un crisol de', 'un faro de', 'una encrucijada', 'desempeña un papel fundamental',
  'desempeña un papel', 'juega un papel crucial', 'juega un papel determinante',
  'juega un papel', 'cobra especial relevancia', 'cobrar protagonismo', 'sentar las bases',
  'adentrarse en', 'sumergirse en', 'sumergirse', 'no solo', 'sino también',

  // Jerga corporativa y financiera predecible
  'desglose geográfico', 'vaivenes políticos y de divisas', 'vaivenes políticos',
  'vaivenes de divisas', 'vaivenes', 'fuentes de ingresos diversificadas',
  'verdaderas corporaciones globales', 'verdaderas corporaciones', 'corporaciones globales',
  'ecosistema dinámico', 'entorno dinámico', 'apalancar', 'sinergia', 'paradigma',
  'holístico', 'disruptivo', 'palanca de crecimiento', 'de vital trascendencia',

  // Intensificadores genéricos de IA
  'crucial', 'fundamental', 'vital', 'primordial', 'imprescindible', 'de suma trascendencia'
];

export const BANNED_PHRASES_EN = [
  // Stock connectors & transitions
  'in conclusion', 'to sum up', 'it is worth noting', 'furthermore', 'moreover',
  'needless to say', 'it goes without saying', 'in essence', 'by and large',
  'at the end of the day', 'at its core', 'in light of', 'in the realm of',
  'in today\'s world', 'in today\'s fast-paced world', 'in modern times',
  'as we move forward', 'a myriad of', 'a plethora of', 'a wide array of',

  // Clichés and metaphors
  'delve into', 'delve', 'tapestry of', 'tapestry', 'testament to', 'beacon of',
  'multifaceted', 'crucial', 'paramount', 'pivotal', 'underscores the importance',
  'underscores', 'encompasses', 'vibrant', 'notably', 'it is important to note',
  'seamlessly integrated', 'seamless', 'fostering a culture', 'fostering',
  'holistic approach', 'holistic', 'interplay between', 'interplay',
  'cornerstone of', 'cornerstone', 'navigating the landscape', 'plays a crucial role',
  'plays a pivotal role', 'shedding light on', 'serves as a reminder',
  'embark on a journey', 'embark', 'game-changer', 'paradigm shift',
  'dynamic environment', 'paving the way for', 'deep dive', 'revolutionizing the way'
];

export const REPLACEMENTS_ES = [
  // Coletillas sintácticas relativas (máximo disparador de GPTZero)
  [/(?:,\s*|\s+)lo que (permite|facilita|garantiza|asegura|hace|genera|evita)\b/gi, '. Esto $1'],
  [/(?:,\s*|\s+)lo que (las|los|la|le|el) (protege|ayuda|impulsa|favorece|sitúa|coloca)\b/gi, '. Así $1 $2'],
  [/(?:,\s*|\s+)lo que demuestra\b/gi, '. De este modo queda claro'],
  [/(?:,\s*|\s+)sentando las bases (de|para)\b/gi, '. Esto sienta las bases $1'],
  [/(?:,\s*|\s+)jugando un papel (clave|crucial|fundamental|determinante)\b/gi, ' y resulta decisivo'],
  [/(?:,\s*|\s+)marcando un antes y un después\b/gi, ' y supone un punto de inflexión'],

  // Clichés corporativos y financieros
  [/\bdesglose geogr[aá]fico\b/gi, 'origen de los ingresos'],
  [/\bvaivenes pol[ií]ticos y de divisas\b/gi, 'sobresaltos políticos o caídas de moneda'],
  [/\bvaivenes pol[ií]ticos\b/gi, 'sobresaltos políticos'],
  [/\bvaivenes de divisas\b/gi, 'fluctuaciones de moneda'],
  [/\bvaivenes\b/gi, 'oscilaciones'],
  [/\bfuentes de ingresos diversificadas\b/gi, 'ingresos bien repartidos'],
  [/\bverdaderas corporaciones globales\b/gi, 'empresas globales de verdad'],
  [/\bcorporaciones globales\b/gi, 'empresas multinacionales'],

  // Transiciones formales de IA
  [/\bcabe destacar que\b/gi, 'conviene fijarse en que'],
  [/\bcabe destacar\b/gi, 'hay que notar'],
  [/\bcabe señalar que\b/gi, 'conviene ver que'],
  [/\bcabe señalar\b/gi, 'a su vez'],
  [/\bes fundamental destacar que\b/gi, 'importa ver que'],
  [/\bes fundamental que\b/gi, 'hace falta que'],
  [/\bes fundamental\b/gi, 'es clave'],
  [/\bes de vital importancia\b/gi, 'resulta clave'],
  [/\bcobra especial relevancia\b/gi, 'toma protagonismo'],
  [/\ben este sentido\b/gi, 'por eso mismo'],
  [/\ba d[ií]a de hoy\b/gi, 'hoy'],
  [/\ben el panorama actual\b/gi, 'en el mercado actual'],
  [/\ben el mundo actual\b/gi, 'hoy'],
  [/\bun sinf[ií]n de\b/gi, 'muchos'],
  [/\bun abanico de posibilidades\b/gi, 'muchas opciones'],
  [/\bun abanico de\b/gi, 'una variedad de'],
  [/\bun tapiz de\b/gi, 'un mosaico de'],
  [/\bun tapiz\b/gi, 'un entramado'],
  [/\btestimonio de\b/gi, 'prueba de'],
  [/\bdesempeña un papel\b/gi, 'actúa como factor'],
  [/\bjuega un papel determinante\b/gi, 'pesa mucho'],
  [/\bjuega un papel crucial\b/gi, 'es determinante'],
  [/\bjuega un papel\b/gi, 'influye'],
  [/\ben resumen\b/gi, 'en pocas palabras'],
  [/\ben conclusi[oó]n\b/gi, 'al final'],
  [/\ba fin de cuentas\b/gi, 'al cabo'],
  [/\bpor consiguiente\b/gi, 'por tanto'],
  [/\bpor ende\b/gi, 'por eso'],
  [/\bde cara a\b/gi, 'para'],
  [/\ba la hora de\b/gi, 'al'],
  [/\ben lo que respecta a\b/gi, 'sobre'],
  [/\bno solo (.+?), sino tambi[eé]n\b/gi, '$1 y a la vez']
];

export const REPLACEMENTS_EN = [
  // Consequence & participle tails
  [/(?:,\s*|\s+)which (allows for|enables|facilitates|ensures|guarantees)\b/gi, '. This $1'],
  [/(?:,\s*|\s+)which (highlights|underscores|demonstrates|proves)\b/gi, '. This shows'],
  [/(?:,\s*|\s+)thereby (paving|allowing|ensuring|creating|fostering)\b/gi, '. This $1s'],
  [/(?:,\s*|\s+)serving as a testament to\b/gi, '. This proves'],
  [/(?:,\s*|\s+)playing a (crucial|pivotal|key|vital) role\b/gi, ' and plays a key part'],

  // Clichés
  [/\bdelve into\b/gi, 'explore'],
  [/\bdelve\b/gi, 'dig in'],
  [/\ba testament to\b/gi, 'clear proof of'],
  [/\btapestry of\b/gi, 'blend of'],
  [/\btapestry\b/gi, 'fabric'],
  [/\bbeacon of\b/gi, 'symbol of'],
  [/\bmultifaceted\b/gi, 'complex'],
  [/\bpivotal role\b/gi, 'major part'],
  [/\bcrucial role\b/gi, 'key part'],
  [/\bcrucial\b/gi, 'essential'],
  [/\bparamount\b/gi, 'vital'],
  [/\bin the realm of\b/gi, 'in'],
  [/\bfurthermore\b/gi, 'also'],
  [/\bmoreover\b/gi, 'besides'],
  [/\bin conclusion\b/gi, 'overall'],
  [/\bit is worth noting that\b/gi, 'notably,'],
  [/\bit is important to note that\b/gi, 'note that'],
  [/\bin today's fast-paced world\b/gi, 'today'],
  [/\bin today's world\b/gi, 'today'],
  [/\bnavigating the landscape\b/gi, 'navigating the market'],
  [/\bseamlessly integrated\b/gi, 'well integrated'],
  [/\bseamless\b/gi, 'smooth'],
  [/\bholistic approach\b/gi, 'broad view'],
  [/\bholistic\b/gi, 'complete'],
  [/\bcornerstone of\b/gi, 'base of'],
  [/\ba myriad of\b/gi, 'many'],
  [/\ba plethora of\b/gi, 'plenty of']
];

/**
 * Sanitiza quirúrgicamente el texto generado para eliminar artefactos sintácticos que disparan GPTZero:
 * 1. Puntos y comas (;) -> convertidos a puntos y mayúsculas o comas.
 * 2. Comillas en palabras sueltas ("palabra" -> palabra).
 * 3. Coletillas relativas residuales.
 * 4. Diccionario de reemplazo de clichés.
 */
export function sanitizeText(text, isEnglish = false) {
  if (!text) return '';
  let cleaned = String(text).trim();

  // Eliminar preámbulos y muletillas de apertura de IA
  cleaned = cleaned.replace(/^[¡!]?\s*(?:claro(?: que sí)?|por supuesto|desde luego|entendido|sure|certainly)[^.\n]*[.!:]?\s*/i, '');
  cleaned = cleaned.replace(/^(?:aquí\s+(?:te presento|tienes|está|va|adjunto)|here\s+(?:is|are))[^\n]*?:?\s*(\r?\n)*/i, '');
  cleaned = cleaned.replace(/^(?:versión humanizada|humanized version|texto reescrito)[^\n]*?:?\s*(\r?\n)*/i, '');
  cleaned = cleaned.trim();
  
  // Quitar comillas triples que a veces envuelven la respuesta
  if ((cleaned.startsWith('"""') && cleaned.endsWith('"""')) || (cleaned.startsWith("'''") && cleaned.endsWith("'''"))) {
    cleaned = cleaned.slice(3, -3).trim();
  }

  // REGLA CLAVE ANTI-GPTZERO 1: Eliminar puntos y comas (delator nº 1)
  cleaned = cleaned.replace(/;\s*([a-zñáéíóúA-ZÑÁÉÍÓÚ])/g, (m, c) => '. ' + c.toUpperCase());
  cleaned = cleaned.replace(/;\s*/g, '. ');

  // REGLA CLAVE ANTI-GPTZERO 2: Eliminar comillas en palabras sueltas ("multinacional" -> multinacional)
  cleaned = cleaned.replace(/[“"']([a-záéíóúñA-ZÁÉÍÓÚÑ\-]{3,25})[”"']/g, '$1');

  // Aplicar diccionario de reemplazos según idioma
  const rules = isEnglish ? REPLACEMENTS_EN : REPLACEMENTS_ES;
  for (const [pattern, replacement] of rules) {
    cleaned = cleaned.replace(pattern, replacement);
  }

  // Normalizar puntuación y espaciado
  cleaned = cleaned.replace(/\s+([.,;:!?])/g, '$1');
  cleaned = cleaned.replace(/\.{2,}/g, '.');
  cleaned = cleaned.replace(/[ \t]{2,}/g, ' ');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}
