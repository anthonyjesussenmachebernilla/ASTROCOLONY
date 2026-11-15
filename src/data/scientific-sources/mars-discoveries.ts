/**
 * Educational copy prepared with ChatGPT/Codex assistance and grounded in the
 * linked NASA records. Photographs are credited individually, not AI art.
 * Verified against NASA Image Library on 2026-11-15.
 */
export const SOLAR_DUST_DISCOVERY = {
  topic: 'solar-dust',
  nasaId: 'PIA25286',
  title: 'El polvo también llega a los paneles',
  alt: 'Panel solar de InSight cubierto de polvo, fotografiado en Marte.',
  explanation: 'InSight tomó esta foto en Marte. Su panel solar está cubierto de polvo.',
  missionConnection: 'El polvo deja pasar menos luz y el panel produce menos electricidad. En Aurora-1, revisa los paneles antes de decidir cómo repartir la energía.',
  more: 'La foto se tomó el 24 de abril de 2022, durante el sol 1211 de la misión InSight. Un sol es un día en Marte. La base Aurora-1 y sus porcentajes de recursos son parte del juego.',
  sourceUrl: 'https://images.nasa.gov/details/PIA25286',
  credit: 'NASA/JPL-Caltech',
  photoPlace: 'Fotografía en Marte',
  tag: 'Marte real',
  contextNote: 'Aurora-1 es una simulación educativa. Esta foto muestra una misión real en Marte.',
} as const;

export const NASA_DISCOVERIES = {
  'solar-dust': SOLAR_DUST_DISCOVERY,
  'space-garden': {
    topic: 'space-garden', nasaId: 'iss055e000821',
    title: '¡También crecen plantas en el espacio!',
    alt: 'El astronauta Scott Tingle revisa lechugas rojas en la instalación Veggie de la estación espacial.',
    explanation: 'Scott Tingle revisa lechugas en Veggie, un pequeño espacio de cultivo en la Estación Espacial Internacional.',
    missionConnection: 'Las plantas necesitan luz y agua. En Aurora-1, iluminar más los cultivos ayuda a producir alimentos, pero consume electricidad.',
    more: 'La foto se tomó el 3 de marzo de 2018 en el laboratorio Columbus, durante el experimento Veg-03. Cultivar plantas en órbita ayuda a estudiar cómo producir alimentos durante las misiones. No muestra un invernadero en Marte.',
    sourceUrl: 'https://images.nasa.gov/details/iss055e000821', credit: 'NASA',
    photoPlace: 'Fotografía en la Estación Espacial Internacional', tag: 'Ciencia real',
    contextNote: 'Esta foto muestra cultivos en órbita de la Tierra. El invernadero marciano de Aurora-1 es una simulación.',
  },
  'mars-oxygen': {
    topic: 'mars-oxygen', nasaId: 'PIA24203',
    title: 'Un experimento para obtener oxígeno',
    alt: 'El instrumento dorado MOXIE instalado dentro del rover Perseverance durante su preparación.',
    explanation: 'Este es MOXIE, un experimento que viajó a Marte con Perseverance para probar cómo obtener oxígeno del dióxido de carbono de su atmósfera.',
    missionConnection: 'Producir oxígeno requiere equipos y energía. En Aurora-1, compara cuánto aire recupera cada plan y cuánta electricidad utiliza.',
    more: 'La fotografía muestra MOXIE instalado dentro del rover durante su preparación. Fue una demostración tecnológica: no abasteció de aire a una base habitada. Sus resultados ayudan a investigar equipos futuros más grandes.',
    sourceUrl: 'https://images.nasa.gov/details/PIA24203', credit: 'NASA/JPL-Caltech',
    photoPlace: 'Fotografía de MOXIE antes del lanzamiento', tag: 'Ciencia real',
    contextNote: 'La foto muestra un instrumento real durante su preparación. El hábitat y sus reservas de oxígeno pertenecen al juego.',
  },
  'rover-power': {
    topic: 'rover-power', nasaId: 'KSC-2011-6694',
    title: 'No toda la energía viene del Sol',
    alt: 'Técnicos preparan el generador eléctrico de Curiosity en el Centro Espacial Kennedy.',
    explanation: 'En la Tierra, un equipo prepara el generador de Curiosity. Este rover utiliza un sistema que convierte calor en electricidad.',
    missionConnection: 'Una misión necesita planear de dónde obtiene su energía y cómo la reparte. En Aurora-1 trabajamos con paneles solares; Curiosity utiliza una fuente diferente.',
    more: 'El generador se llama MMRTG. Aprovecha el calor de la desintegración de un material radiactivo para producir electricidad de día y de noche. La fotografía muestra preparativos en el Centro Espacial Kennedy, antes del lanzamiento; no es una central eléctrica en Marte.',
    sourceUrl: 'https://images.nasa.gov/details/KSC-2011-6694', credit: 'NASA/Cory Huston',
    photoPlace: 'Fotografía en la Tierra · Centro Espacial Kennedy', tag: 'Ciencia real',
    contextNote: 'La foto muestra preparativos de una misión real en la Tierra. El centro de energía de Aurora-1 es ficticio.',
  },
  'thermal-testing': {
    topic: 'thermal-testing', nasaId: 'PIA13805',
    title: 'Probar antes de viajar',
    alt: 'Curiosity se prepara para pruebas solares y térmicas en una cámara que simula condiciones espaciales.',
    explanation: 'Curiosity se prepara para unas pruebas en una cámara especial. Allí se ensayan condiciones parecidas a las que encontrará en Marte.',
    missionConnection: 'Los equipos necesitan funcionar a temperaturas adecuadas. En Aurora-1, revisar la refrigeración y el regulador ayuda a comprender por qué mantener los sistemas también requiere energía.',
    more: 'Esta imagen muestra los preparativos de las pruebas solares y térmicas de marzo de 2011. Antes de una misión, los ingenieros prueban cómo se comportan los equipos en condiciones ambientales exigentes.',
    sourceUrl: 'https://images.nasa.gov/details/PIA13805', credit: 'NASA/JPL-Caltech',
    photoPlace: 'Fotografía de pruebas en la Tierra', tag: 'Ciencia real',
    contextNote: 'Esta foto muestra pruebas reales antes del viaje. La avería del regulador de Aurora-1 es parte de la historia del juego.',
  },
} as const;

export type DiscoveryTopic = keyof typeof NASA_DISCOVERIES;

export function isDiscoveryTopic(topic: string | null): topic is DiscoveryTopic {
  return topic !== null && Object.prototype.hasOwnProperty.call(NASA_DISCOVERIES, topic);
}
