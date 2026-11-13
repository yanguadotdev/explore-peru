export type IconKey =
  | 'cherry'
  | 'tanks'
  | 'patio'
  | 'sack'
  | 'roaster'
  | 'cup'
  | 'mirador'
  | 'waterfall'
  | 'market'

export type Stop = {
  id: string
  kind: 'stop' | 'detour'
  index: number
  name: string
  stage: string
  altitude: number
  x: number
  z: number
  icon: IconKey
  teaser: string
  story: { title: string; body: string }[]
  note?: string
}

export const STOPS: Stop[] = [
  {
    id: 'finca',
    kind: 'stop',
    index: 1,
    name: 'Finca La Neblina',
    stage: 'Cosecha',
    altitude: 2100,
    x: -42,
    z: -22,
    icon: 'cherry',
    teaser: 'Donde empieza todo: cerezas rojas entre la niebla.',
    story: [
      {
        title: 'Recolección a mano',
        body: 'En la ladera más alta de la ruta, los recolectores pasan varias veces por el mismo cafeto: solo se arrancan las cerezas que están completamente rojas. Una mata no madura toda a la vez, y de esa paciencia depende la dulzura de la taza.',
      },
      {
        title: 'La altura importa',
        body: 'A más de dos mil metros, las noches frías hacen que el fruto crezca despacio. El grano se vuelve más denso y concentra más azúcares, que después se transforman en notas de fruta y flores.',
      },
      {
        title: 'Sombra y bosque',
        body: 'Los cafetos crecen bajo árboles de sombra que protegen el suelo, guardan la humedad y dan hogar a cientos de aves. La finca es parte del bosque, no un claro dentro de él.',
      },
    ],
    note: 'Cereza madura · notas de panela y frutos rojos',
  },
  {
    id: 'beneficio',
    kind: 'stop',
    index: 2,
    name: 'Beneficio El Despulpe',
    stage: 'Despulpado y fermentación',
    altitude: 1850,
    x: -26,
    z: -11,
    icon: 'tanks',
    teaser: 'El agua de la montaña separa la semilla del fruto.',
    story: [
      {
        title: 'Del fruto a la semilla',
        body: 'El mismo día de la cosecha, las cerezas pasan por la despulpadora: la pulpa se separa y queda el grano cubierto por una capa dulce y pegajosa llamada mucílago.',
      },
      {
        title: 'Fermentar con calma',
        body: 'En los tanques, el grano reposa entre 12 y 36 horas. Las levaduras y bacterias trabajan el mucílago y aquí nacen muchos de los sabores que después reconocerás en la taza.',
      },
      {
        title: 'Lavado',
        body: 'Cuando el grano “suena a piedra” al moverlo con la mano, se lava con agua limpia. El agua usada se trata antes de volver al río: el beneficio cuida la cuenca de la que depende.',
      },
    ],
    note: 'Proceso lavado · acidez brillante',
  },
  {
    id: 'patios',
    kind: 'stop',
    index: 3,
    name: 'Patios del Sol',
    stage: 'Secado',
    altitude: 1600,
    x: -9,
    z: -3,
    icon: 'patio',
    teaser: 'Días de sol y rastrillo hasta llegar al punto justo.',
    story: [
      {
        title: 'Al sol, sin prisa',
        body: 'El grano húmedo se extiende en patios y marquesinas. Varias veces al día se voltea con rastrillos de madera para que seque parejo y no aparezcan mohos.',
      },
      {
        title: 'El punto de humedad',
        body: 'El objetivo es bajar del 50% de humedad a cerca del 11%. Muy seco, el grano se quiebra; muy húmedo, se daña en la bodega. El caficultor lo prueba con los dientes y con la experiencia de años.',
      },
      {
        title: 'Pergamino',
        body: 'Seco, el grano conserva una cascarilla protectora: el pergamino. Así viaja montaña abajo, protegido como una semilla dentro de su sobre.',
      },
    ],
    note: 'Café pergamino seco · 11% de humedad',
  },
  {
    id: 'trilladora',
    kind: 'stop',
    index: 4,
    name: 'Trilladora San Isidro',
    stage: 'Trilla y selección',
    altitude: 1450,
    x: 9,
    z: 6,
    icon: 'sack',
    teaser: 'El pergamino se retira y cada grano se clasifica.',
    story: [
      {
        title: 'Quitar el pergamino',
        body: 'En la trilladora, una máquina retira la cascarilla y deja al descubierto el café verde: el grano tal como llega a los tostadores de todo el mundo.',
      },
      {
        title: 'Seleccionar',
        body: 'Mallas de distintos tamaños separan los granos y unas manos expertas retiran los defectuosos: negros, partidos o picados. Un solo grano malo puede arruinar una taza.',
      },
      {
        title: 'Costales de fique',
        body: 'El café verde se empaca en costales de fibra natural que dejan respirar el grano. Cada costal lleva el nombre de la finca y su altura: su origen viaja con él.',
      },
    ],
    note: 'Café verde · grado excelso',
  },
  {
    id: 'tostaduria',
    kind: 'stop',
    index: 5,
    name: 'Tostaduría Fuego Lento',
    stage: 'Tueste',
    altitude: 1350,
    x: 25,
    z: 12,
    icon: 'roaster',
    teaser: 'Calor, tiempo y oído atento al primer crack.',
    story: [
      {
        title: 'Del verde al marrón',
        body: 'Dentro del tambor, el grano gira a más de 200 °C. Pierde agua, cambia de color y desarrolla cientos de compuestos aromáticos que no existían en el grano verde.',
      },
      {
        title: 'El primer crack',
        body: 'Como palomitas de maíz, los granos crujen cuando el vapor rompe su estructura. A partir de ese sonido, cada segundo cuenta: el tostador decide cuánto dulzor, acidez y cuerpo tendrá el café.',
      },
      {
        title: 'Reposo',
        body: 'Recién tostado, el café libera gas. Unos días de reposo en bolsas con válvula hacen que el sabor se asiente antes de llegar a tu molino.',
      },
    ],
    note: 'Tueste medio · caramelo y cacao',
  },
  {
    id: 'pueblo',
    kind: 'stop',
    index: 6,
    name: 'La Taza · Pueblo de Altura',
    stage: 'Preparación',
    altitude: 1250,
    x: 42,
    z: 19,
    icon: 'cup',
    teaser: 'El final del camino es una taza humeante en la plaza.',
    story: [
      {
        title: 'Moler al momento',
        body: 'En la cafetería de la plaza, el café se muele justo antes de prepararlo. Molido, el grano empieza a perder aroma en minutos.',
      },
      {
        title: 'Agua y tiempo',
        body: 'Agua entre 90 y 96 °C, la molienda adecuada para cada método y la proporción justa. Pequeños cambios revelan sabores distintos de un mismo grano.',
      },
      {
        title: 'Cerrar el círculo',
        body: 'Cada taza resume meses de trabajo: la flor del cafeto, la cosecha, el agua del río, el sol de los patios y el fuego del tostador. Seis paradas, una cosecha.',
      },
    ],
    note: 'Filtrado · dulce, limpio y floral',
  },
  {
    id: 'mirador',
    kind: 'detour',
    index: 0,
    name: 'Mirador de las Nubes',
    stage: 'Desvío',
    altitude: 2250,
    x: -50,
    z: -33,
    icon: 'mirador',
    teaser: 'Al amanecer, el valle entero queda bajo un mar de nubes.',
    story: [],
  },
  {
    id: 'cascada',
    kind: 'detour',
    index: 0,
    name: 'Cascada Escondida',
    stage: 'Desvío',
    altitude: 1700,
    x: -6,
    z: -21,
    icon: 'waterfall',
    teaser: 'Agua fría de páramo que alimenta los beneficios de la zona.',
    story: [],
  },
  {
    id: 'mercado',
    kind: 'detour',
    index: 0,
    name: 'Mercado del Domingo',
    stage: 'Desvío',
    altitude: 1240,
    x: 30,
    z: 27,
    icon: 'market',
    teaser: 'Panela, frutas y café recién tostado cada fin de semana.',
    story: [],
  },
]

export const MAIN_STOPS = STOPS.filter((s) => s.kind === 'stop')

export const FACTS = [
  'El café es el fruto de un arbusto: el grano es la semilla de una cereza roja.',
  'Un cafeto tarda unos tres años en dar su primera cosecha.',
  'La altura hace al grano más denso: crece más lento y concentra más azúcares.',
  'Cada cereza guarda normalmente dos semillas enfrentadas por su cara plana.',
  'El grano verde se tuesta a más de 200 °C: ahí nacen sus aromas.',
]
