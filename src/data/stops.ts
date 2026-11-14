import { project } from './geo'

export type IconKey =
  | 'beach'
  | 'wave'
  | 'pyramid'
  | 'ruins'
  | 'church'
  | 'fortress'
  | 'dolphin'
  | 'orchid'
  | 'mountain'
  | 'textile'
  | 'city'
  | 'port'
  | 'train'
  | 'dance'
  | 'desert'
  | 'canyon'
  | 'machu'
  | 'macaw'
  | 'lake'
  | 'volcano'
  | 'grape'
  | 'flag'
  | 'compass'

export type Region = 'Costa' | 'Sierra' | 'Selva'

export type Stop = {
  id: string
  /** 'stop' = on the stamp route; 'detour' = every other region */
  kind: 'stop' | 'detour'
  /** order on the route (1..8); 0 for regions off the route */
  index: number
  name: string
  capital: string
  /** natural region shown as the "stage" label */
  stage: Region
  /** capital altitude, metres above sea level (approx.) */
  altitude: number
  lon: number
  lat: number
  x: number
  z: number
  icon: IconKey
  teaser: string
  story: { title: string; body: string }[]
  /** "must-see" line */
  note: string
}

type Raw = Omit<Stop, 'x' | 'z' | 'kind' | 'index'> & { route?: number }

const RAW: Raw[] = [
  {
    id: 'tumbes',
    name: 'Tumbes',
    capital: 'Tumbes',
    stage: 'Costa',
    altitude: 7,
    lon: -80.45,
    lat: -3.75,
    icon: 'beach',
    teaser: 'Sol todo el año, manglares y el mar más cálido del Perú.',
    story: [
      { title: 'Manglares en la frontera', body: 'El Santuario Nacional Los Manglares de Tumbes protege el bosque de manglar más extenso del país: un laberinto de raíces y canales donde se crían cangrejos, conchas negras y cientos de aves.' },
      { title: 'Aquí llegó Pizarro', body: 'En 1532 las naves de Francisco Pizarro desembarcaron en las costas de Tumbes, el inicio del encuentro entre el mundo andino y Europa.' },
      { title: 'Playas tibias', body: 'Zorritos y Punta Sal tienen aguas cálidas casi todo el año: el lugar ideal para ver ballenas jorobadas entre julio y octubre.' },
    ],
    note: 'Imperdible: un paseo en bote por los manglares de Puerto Pizarro',
  },
  {
    id: 'piura',
    name: 'Piura',
    capital: 'Piura',
    stage: 'Costa',
    altitude: 29,
    lon: -80.25,
    lat: -5.15,
    icon: 'wave',
    teaser: 'La ciudad del eterno calor y las olas más largas del Pacífico.',
    story: [
      { title: 'El extremo de un continente', body: 'Punta Pariñas, en Talara, es el punto más occidental de toda Sudamérica.' },
      { title: 'Paraíso del surf', body: 'Máncora, Lobitos y Cabo Blanco atraen a surfistas de todo el mundo con olas largas y un mar cálido.' },
      { title: 'Manos de filigrana', body: 'En Catacaos, artesanos tejen sombreros de paja toquilla y trabajan la plata en filigrana con técnicas heredadas por generaciones.' },
    ],
    note: 'Imperdible: un atardecer en Máncora y un seco de chabelo',
  },
  {
    id: 'lambayeque',
    name: 'Lambayeque',
    capital: 'Chiclayo',
    stage: 'Costa',
    altitude: 27,
    lon: -79.75,
    lat: -6.45,
    icon: 'pyramid',
    teaser: 'La tierra de los señores de Sipán y de las pirámides de barro.',
    story: [
      { title: 'El Señor de Sipán', body: 'En 1987 se halló intacta la tumba de un gobernante mochica cubierto de oro y plata. Hoy se exhibe en el Museo Tumbas Reales de Sipán.' },
      { title: 'El valle de las pirámides', body: 'Túcume reúne 26 pirámides de adobe construidas por los lambayeque: un paisaje que parece de otro planeta.' },
      { title: 'Sabores del norte', body: 'El arroz con pato y el King Kong, un dulce de manjar blanco, son orgullo de Chiclayo.' },
    ],
    note: 'Imperdible: el Museo Tumbas Reales de Sipán',
  },
  {
    id: 'cajamarca',
    name: 'Cajamarca',
    capital: 'Cajamarca',
    stage: 'Sierra',
    altitude: 2750,
    lon: -78.6,
    lat: -6.6,
    icon: 'church',
    teaser: 'Donde cambió la historia: el encuentro de Atahualpa y Pizarro.',
    story: [
      { title: 'El rescate del inca', body: 'En 1532 el inca Atahualpa fue capturado en Cajamarca. Ofreció llenar una habitación con oro a cambio de su libertad: el Cuarto del Rescate aún se puede visitar.' },
      { title: 'Baños del Inca', body: 'Sus aguas termales, que superan los 70 °C, ya eran usadas por los incas antes de la llegada de los españoles.' },
      { title: 'Tierra de quesos', body: 'Sus valles verdes producen quesos, manjar blanco y uno de los carnavales más alegres del país.' },
    ],
    note: 'Imperdible: el Carnaval de Cajamarca',
  },
  {
    id: 'amazonas',
    name: 'Amazonas',
    capital: 'Chachapoyas',
    stage: 'Selva',
    altitude: 2335,
    lon: -77.9,
    lat: -5.6,
    icon: 'fortress',
    route: 2,
    teaser: 'Fortalezas entre las nubes y cataratas de cientos de metros.',
    story: [
      { title: 'Kuélap', body: 'Los chachapoyas levantaron esta ciudadela amurallada sobre una montaña a 3 000 metros, con cientos de casas circulares. Es más antigua que Machu Picchu.' },
      { title: 'La catarata de Gocta', body: 'Con 771 metros de caída en dos saltos, es una de las cascadas más altas del mundo, escondida en el bosque de neblina.' },
      { title: 'Guardianes de piedra', body: 'Los sarcófagos de Karajía, figuras de más de dos metros en lo alto de un acantilado, vigilan el valle desde hace siglos.' },
    ],
    note: 'Imperdible: subir a Kuélap en teleférico',
  },
  {
    id: 'loreto',
    name: 'Loreto',
    capital: 'Iquitos',
    stage: 'Selva',
    altitude: 106,
    lon: -74.4,
    lat: -4.4,
    icon: 'dolphin',
    route: 1,
    teaser: 'Donde nace el río Amazonas y se navega entre delfines rosados.',
    story: [
      { title: 'Nace el Amazonas', body: 'Cerca de Nauta, los ríos Marañón y Ucayali se unen y forman el Amazonas, el río más caudaloso del planeta.' },
      { title: 'Una ciudad sin carreteras', body: 'Iquitos es la ciudad más grande del mundo a la que no se puede llegar por carretera: solo en avión o en barco.' },
      { title: 'Pacaya-Samiria', body: 'Esta reserva inundable, la más grande del Perú, es hogar de delfines rosados, guacamayos y la victoria regia, un nenúfar gigante.' },
    ],
    note: 'Imperdible: navegar al atardecer buscando delfines rosados',
  },
  {
    id: 'sanmartin',
    name: 'San Martín',
    capital: 'Moyobamba',
    stage: 'Selva',
    altitude: 860,
    lon: -76.75,
    lat: -7.3,
    icon: 'orchid',
    teaser: 'Orquídeas, cascadas y el mejor cacao de la selva alta.',
    story: [
      { title: 'Ciudad de las orquídeas', body: 'Moyobamba, la primera ciudad fundada por los españoles en la Amazonía peruana, es famosa por sus cientos de especies de orquídeas.' },
      { title: 'Del cacao al chocolate', body: 'Sus valles producen cacao fino de aroma que llega a chocolaterías de todo el mundo.' },
      { title: 'Tarapoto', body: 'La "ciudad de las palmeras" es la puerta a cataratas como Ahuashiyacu y a la laguna Azul.' },
    ],
    note: 'Imperdible: un baño en las cataratas de Ahuashiyacu',
  },
  {
    id: 'lalibertad',
    name: 'La Libertad',
    capital: 'Trujillo',
    stage: 'Costa',
    altitude: 34,
    lon: -78.25,
    lat: -8.0,
    icon: 'ruins',
    route: 3,
    teaser: 'La ciudad de barro más grande de América y la tierra de la marinera.',
    story: [
      { title: 'Chan Chan', body: 'La capital del reino chimú fue la ciudad de adobe más grande de la América precolombina. Es Patrimonio de la Humanidad desde 1986.' },
      { title: 'Caballitos de totora', body: 'En Huanchaco los pescadores aún salen al mar en balsas de totora, una técnica usada desde hace unos 3 000 años.' },
      { title: 'La marinera', body: 'Trujillo es la capital de la marinera, un baile elegante con pañuelos que tiene su gran concurso nacional cada año.' },
    ],
    note: 'Imperdible: ver los caballitos de totora volver al atardecer en Huanchaco',
  },
  {
    id: 'ancash',
    name: 'Áncash',
    capital: 'Huaraz',
    stage: 'Sierra',
    altitude: 3052,
    lon: -77.6,
    lat: -9.4,
    icon: 'mountain',
    teaser: 'La cordillera tropical más alta del mundo y lagunas turquesa.',
    story: [
      { title: 'El techo del Perú', body: 'El Huascarán, con 6 768 metros, es la montaña más alta del país. Su parque nacional es Patrimonio de la Humanidad.' },
      { title: 'Chavín de Huántar', body: 'Este centro ceremonial de unos 3 000 años esconde galerías subterráneas y el Lanzón, una escultura de piedra que solo se ve en la penumbra.' },
      { title: 'Lagunas de colores', body: 'La Laguna 69 y Llanganuco brillan con un azul turquesa gracias a los minerales de los glaciares.' },
    ],
    note: 'Imperdible: la caminata a la Laguna 69',
  },
  {
    id: 'huanuco',
    name: 'Huánuco',
    capital: 'Huánuco',
    stage: 'Sierra',
    altitude: 1894,
    lon: -76.0,
    lat: -9.45,
    icon: 'ruins',
    teaser: 'Templos de 4 000 años y la Bella Durmiente de Tingo María.',
    story: [
      { title: 'El templo de las manos cruzadas', body: 'Kotosh es uno de los templos más antiguos del Perú, con unos 4 000 años. Sus muros conservan dos manos cruzadas modeladas en barro.' },
      { title: 'Un clima envidiado', body: 'Los huanuqueños dicen que su ciudad tiene el mejor clima del mundo: soleada y templada casi todo el año.' },
      { title: 'La Bella Durmiente', body: 'En Tingo María, una cadena de montañas dibuja la silueta de una mujer recostada sobre la selva.' },
    ],
    note: 'Imperdible: la Cueva de las Lechuzas en Tingo María',
  },
  {
    id: 'pasco',
    name: 'Pasco',
    capital: 'Cerro de Pasco',
    stage: 'Sierra',
    altitude: 4380,
    lon: -75.7,
    lat: -10.5,
    icon: 'mountain',
    teaser: 'Una de las ciudades más altas del mundo y un bosque de piedras.',
    story: [
      { title: 'Ciudad en las alturas', body: 'Cerro de Pasco, a más de 4 300 metros, es una de las ciudades más altas del planeta.' },
      { title: 'Bosque de piedras', body: 'En Huayllay, el viento y el agua tallaron miles de rocas con formas de animales y rostros.' },
      { title: 'Un pedazo de Austria', body: 'En la selva de Oxapampa y Pozuzo viven descendientes de colonos austriacos y alemanes llegados en 1859.' },
    ],
    note: 'Imperdible: el Bosque de Piedras de Huayllay',
  },
  {
    id: 'ucayali',
    name: 'Ucayali',
    capital: 'Pucallpa',
    stage: 'Selva',
    altitude: 154,
    lon: -73.6,
    lat: -9.7,
    icon: 'textile',
    teaser: 'Ríos inmensos y el arte geométrico del pueblo shipibo-konibo.',
    story: [
      { title: 'El arte kené', body: 'Las mujeres shipibo-konibo pintan y bordan diseños geométricos que representan la energía de la naturaleza. El kené es Patrimonio Cultural de la Nación.' },
      { title: 'Yarinacocha', body: 'Esta laguna en forma de media luna es perfecta para navegar, ver delfines y visitar comunidades nativas.' },
      { title: 'El río Ucayali', body: 'Uno de los ríos que, al unirse con el Marañón, da origen al Amazonas.' },
    ],
    note: 'Imperdible: un atardecer en la laguna de Yarinacocha',
  },
  {
    id: 'lima',
    name: 'Lima',
    capital: 'Lima',
    stage: 'Costa',
    altitude: 154,
    lon: -76.7,
    lat: -11.85,
    icon: 'city',
    route: 4,
    teaser: 'La capital gastronómica de América, frente al Pacífico.',
    story: [
      { title: 'La Ciudad de los Reyes', body: 'Fundada en 1535, su centro histórico de balcones de madera e iglesias barrocas es Patrimonio de la Humanidad.' },
      { title: 'Caral', body: 'A tres horas al norte está Caral, la ciudad más antigua de América, con unos 5 000 años de historia.' },
      { title: 'Ceviche y algo más', body: 'Lima es una de las capitales gastronómicas del mundo: ceviche, causa, anticuchos y una cocina que mezcla siglos de culturas.' },
    ],
    note: 'Imperdible: un ceviche frente al mar en Miraflores',
  },
  {
    id: 'callao',
    name: 'Callao',
    capital: 'Callao',
    stage: 'Costa',
    altitude: 5,
    lon: -77.13,
    lat: -12.05,
    icon: 'port',
    teaser: 'El primer puerto del Perú y la puerta de entrada al país.',
    story: [
      { title: 'El gran puerto', body: 'El Callao es el puerto más importante del Perú desde la época colonial.' },
      { title: 'La fortaleza del Real Felipe', body: 'Construida en el siglo XVIII para defender el puerto de piratas y corsarios, es una de las fortificaciones más grandes que dejó España en América.' },
      { title: 'Lobos marinos', body: 'Frente a sus costas, las islas Palomino albergan colonias de lobos marinos con los que se puede nadar.' },
    ],
    note: 'Imperdible: nadar con lobos marinos en las islas Palomino',
  },
  {
    id: 'junin',
    name: 'Junín',
    capital: 'Huancayo',
    stage: 'Sierra',
    altitude: 3259,
    lon: -75.1,
    lat: -11.55,
    icon: 'train',
    teaser: 'Un tren que cruza los Andes a casi 4 800 metros.',
    story: [
      { title: 'El tren de las alturas', body: 'El Ferrocarril Central une Lima con Huancayo y cruza los Andes a casi 4 800 metros: uno de los trenes más altos del mundo.' },
      { title: 'El valle del Mantaro', body: 'Un valle fértil de pueblos artesanos: mates burilados, tejidos y platería.' },
      { title: 'Selva central', body: 'Al este, La Merced y Satipo son la puerta a cataratas, cafetales y comunidades asháninkas.' },
    ],
    note: 'Imperdible: la feria dominical de Huancayo',
  },
  {
    id: 'huancavelica',
    name: 'Huancavelica',
    capital: 'Huancavelica',
    stage: 'Sierra',
    altitude: 3676,
    lon: -75.0,
    lat: -12.95,
    icon: 'dance',
    teaser: 'Tierra de minas de mercurio y de la danza de tijeras.',
    story: [
      { title: 'La mina de Santa Bárbara', body: 'En la colonia, su mercurio era clave para extraer la plata de Potosí, en la actual Bolivia.' },
      { title: 'La danza de tijeras', body: 'Bailarines que golpean grandes tijeras de metal en duelos acrobáticos. Es Patrimonio Cultural Inmaterial de la Humanidad.' },
      { title: 'Paisajes de altura', body: 'Lagunas, puyas de Raimondi y pueblos de piedra en plena cordillera.' },
    ],
    note: 'Imperdible: un duelo de danzantes de tijeras',
  },
  {
    id: 'ica',
    name: 'Ica',
    capital: 'Ica',
    stage: 'Costa',
    altitude: 406,
    lon: -75.55,
    lat: -14.3,
    icon: 'desert',
    route: 5,
    teaser: 'Líneas gigantes en el desierto, un oasis y la cuna del pisco.',
    story: [
      { title: 'Las líneas de Nazca', body: 'Un colibrí, un mono y una araña de cientos de metros dibujados en el desierto hace unos 2 000 años. Solo se aprecian desde el aire.' },
      { title: 'El oasis de Huacachina', body: 'Una laguna rodeada de palmeras y dunas gigantes, perfecta para el sandboard.' },
      { title: 'Paracas', body: 'Sus islas Ballestas son hogar de pingüinos de Humboldt, lobos marinos y miles de aves marinas.' },
    ],
    note: 'Imperdible: sobrevolar las líneas de Nazca',
  },
  {
    id: 'ayacucho',
    name: 'Ayacucho',
    capital: 'Ayacucho',
    stage: 'Sierra',
    altitude: 2761,
    lon: -74.1,
    lat: -13.9,
    icon: 'church',
    teaser: 'La ciudad de las iglesias, retablos y la batalla de la libertad.',
    story: [
      { title: 'Ciudad de las iglesias', body: 'Ayacucho tiene más de 30 templos coloniales, y su Semana Santa es una de las más famosas de América.' },
      { title: 'Retablos', body: 'Sus artesanos crean cajas de madera llenas de pequeñas figuras que cuentan escenas de la vida andina.' },
      { title: 'La batalla de Ayacucho', body: 'En la pampa de Quinua, en 1824, se libró la batalla que selló la independencia de Sudamérica.' },
    ],
    note: 'Imperdible: la Semana Santa ayacuchana',
  },
  {
    id: 'apurimac',
    name: 'Apurímac',
    capital: 'Abancay',
    stage: 'Sierra',
    altitude: 2377,
    lon: -73.0,
    lat: -14.05,
    icon: 'canyon',
    teaser: 'Cañones profundos y Choquequirao, la hermana de Machu Picchu.',
    story: [
      { title: 'El dios que habla', body: 'Apurímac significa "el dios que habla" en quechua, por el rugido de su río al pasar por cañones profundísimos.' },
      { title: 'Choquequirao', body: 'Una ciudadela inca entre montañas, a la que solo se llega tras dos días de caminata.' },
      { title: 'Valles templados', body: 'Abancay, la "ciudad de la eterna primavera", está rodeada de valles de caña de azúcar y frutas.' },
    ],
    note: 'Imperdible: la caminata a Choquequirao',
  },
  {
    id: 'cusco',
    name: 'Cusco',
    capital: 'Cusco',
    stage: 'Sierra',
    altitude: 3399,
    lon: -72.4,
    lat: -13.2,
    icon: 'machu',
    route: 8,
    teaser: 'El ombligo del mundo inca y la ciudadela de Machu Picchu.',
    story: [
      { title: 'Machu Picchu', body: 'Construida en el siglo XV entre montañas y nubes, es una de las Nuevas Siete Maravillas del Mundo.' },
      { title: 'La capital del imperio', body: 'Cusco fue la capital del Tahuantinsuyo. Sus muros de piedra, encajados sin mortero, siguen en pie tras siglos de terremotos.' },
      { title: 'Inti Raymi', body: 'Cada 24 de junio se celebra la Fiesta del Sol, una ceremonia inca que llena de color la explanada de Sacsayhuamán.' },
    ],
    note: 'Imperdible: amanecer en Machu Picchu',
  },
  {
    id: 'madrededios',
    name: 'Madre de Dios',
    capital: 'Puerto Maldonado',
    stage: 'Selva',
    altitude: 183,
    lon: -70.6,
    lat: -12.2,
    icon: 'macaw',
    teaser: 'La capital de la biodiversidad del Perú.',
    story: [
      { title: 'Manu', body: 'El Parque Nacional del Manu es uno de los lugares con más especies del planeta: jaguares, nutrias gigantes y más de mil tipos de aves.' },
      { title: 'Las collpas', body: 'Cientos de guacamayos se reúnen al amanecer en paredes de arcilla para comer minerales: un espectáculo de color en Tambopata.' },
      { title: 'Lagos de selva', body: 'El lago Sandoval, rodeado de palmeras de aguaje, es hogar de nutrias gigantes.' },
    ],
    note: 'Imperdible: la collpa de guacamayos al amanecer',
  },
  {
    id: 'puno',
    name: 'Puno',
    capital: 'Puno',
    stage: 'Sierra',
    altitude: 3827,
    lon: -70.1,
    lat: -14.9,
    icon: 'lake',
    route: 7,
    teaser: 'El lago navegable más alto del mundo y la capital del folclore.',
    story: [
      { title: 'El lago Titicaca', body: 'A 3 812 metros, es el lago navegable más alto del mundo. Según la leyenda, de sus aguas nacieron Manco Cápac y Mama Ocllo.' },
      { title: 'Islas flotantes', body: 'Los uros viven en islas que ellos mismos construyen con totora, una planta que renuevan constantemente.' },
      { title: 'La Candelaria', body: 'En febrero, miles de danzantes llenan Puno en la Fiesta de la Virgen de la Candelaria, Patrimonio Inmaterial de la Humanidad.' },
    ],
    note: 'Imperdible: dormir en una isla del lago Titicaca',
  },
  {
    id: 'arequipa',
    name: 'Arequipa',
    capital: 'Arequipa',
    stage: 'Sierra',
    altitude: 2335,
    lon: -72.4,
    lat: -15.9,
    icon: 'volcano',
    route: 6,
    teaser: 'La Ciudad Blanca, volcanes y el vuelo de los cóndores.',
    story: [
      { title: 'La Ciudad Blanca', body: 'Su centro histórico está construido con sillar, una piedra volcánica blanca. El volcán Misti, de 5 822 metros, la vigila.' },
      { title: 'El cañón del Colca', body: 'Uno de los cañones más profundos del mundo, donde los cóndores planean muy cerca de los visitantes.' },
      { title: 'Una ciudad dentro de otra', body: 'El monasterio de Santa Catalina es casi un pueblo de calles coloridas escondido en pleno centro.' },
    ],
    note: 'Imperdible: ver cóndores en la Cruz del Cóndor',
  },
  {
    id: 'moquegua',
    name: 'Moquegua',
    capital: 'Moquegua',
    stage: 'Costa',
    altitude: 1410,
    lon: -70.95,
    lat: -16.9,
    icon: 'grape',
    teaser: 'Viñedos en el desierto y la meseta sagrada de los wari.',
    story: [
      { title: 'Cerro Baúl', body: 'Una meseta de laderas imposibles donde los wari construyeron un enclave hace más de mil años.' },
      { title: 'Pisco y vino', body: 'Sus valles producen piscos y vinos desde la época colonial.' },
      { title: 'Casonas de quincha', body: 'Su centro conserva casas con techos de "mojinete", una forma de tejado típica de la zona.' },
    ],
    note: 'Imperdible: una ruta por las bodegas de pisco',
  },
  {
    id: 'tacna',
    name: 'Tacna',
    capital: 'Tacna',
    stage: 'Costa',
    altitude: 562,
    lon: -70.35,
    lat: -17.7,
    icon: 'flag',
    teaser: 'La Ciudad Heroica, en el extremo sur del Perú.',
    story: [
      { title: 'La Ciudad Heroica', body: 'Tras décadas bajo administración chilena, Tacna volvió al Perú en 1929.' },
      { title: 'El Paseo de la Bandera', body: 'Cada 28 de agosto, una enorme bandera peruana recorre sus calles en una de las celebraciones patrióticas más emotivas del país.' },
      { title: 'Petroglifos de Miculla', body: 'Cientos de grabados en roca con figuras de animales y personas, hechos hace siglos en el desierto.' },
    ],
    note: 'Imperdible: el Paseo de la Bandera',
  },
]

export const STOPS: Stop[] = RAW.map(({ route, ...r }) => {
  const [x, z] = project(r.lon, r.lat)
  return { ...r, x, z, kind: route ? 'stop' : 'detour', index: route ?? 0 }
})

/** The stamp route, in travel order (north-east Amazon → south-east Andes). */
export const MAIN_STOPS = STOPS.filter((s) => s.kind === 'stop').sort((a, b) => a.index - b.index)

export const FACTS = [
  'El Perú tiene 84 de las 117 zonas de vida que existen en el planeta.',
  'El lago Titicaca es el lago navegable más alto del mundo: está a 3 812 metros.',
  'En el Perú existen más de 3 000 variedades de papa nativa.',
  'El río Amazonas, el más caudaloso del mundo, nace en los Andes del sur del Perú.',
  'Machu Picchu fue construida en el siglo XV por el Imperio inca.',
  'El cañón del Colca, en Arequipa, es uno de los más profundos del mundo.',
]
