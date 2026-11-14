export interface NasaSourceInfo {
  id: string;
  title: string;
  organization: string;
  url: string;
  description: string;
  usedFor: string;
}

export const NASA_SCIENTIFIC_SOURCES: NasaSourceInfo[] = [
  {
    id: 'donki',
    title: 'DONKI — Space Weather Database of Notifications, Knowledge, Information',
    organization: 'NASA CCMC / Goddard Space Flight Center',
    url: 'https://ccmc.gsfc.nasa.gov/tools/DONKI/',
    description:
      'Registra erupciones solares reales, eyecciones de masa coronal y tormentas geomagnéticas o de radiación en el espacio.',
    usedFor: 'Eventos solares y alertas de radiación en AstroColony.',
  },
  {
    id: 'osdr',
    title: 'OSDR — Open Science Data Repository',
    organization: 'NASA Biological and Physical Sciences',
    url: 'https://osdr.nasa.gov/bio/repo/',
    description:
      'Archivo abierto de investigaciones sobre cómo los vuelos espaciales afectan la salud de los astronautas y organismos vivos.',
    usedFor: 'Impacto en la salud de la tripulación y soporte vital.',
  },
  {
    id: 'radlab',
    title: 'RadLab — OSDR Radiation Dosimetry Database',
    organization: 'NASA OSDR / Estación Espacial Internacional',
    url: 'https://visualization.osdr.nasa.gov/radlab/gui/data-api/',
    description:
      'Mediciones reales de dosis de radiación registradas a bordo de la Estación Espacial Internacional.',
    usedFor: 'Importancia del blindaje y los refugios contra radiación.',
  },
  {
    id: 'mars-trek',
    title: 'NASA Mars Trek',
    organization: 'NASA JPL / Solar System Treks',
    url: 'https://trek.nasa.gov/mars/',
    description:
      'Mapas reales de elevación, terreno e imágenes de la superficie marciana recopiladas por misiones como Curiosity y Perseverance.',
    usedFor: 'Ambientación del puesto avanzado en Marte y tormentas de polvo.',
  },
];
