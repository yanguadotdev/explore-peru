# Explora Perú — KUNTUR Viajes por el Perú

Experiencia interactiva en WebGL para descubrir el Perú: sus 25 regiones (24 departamentos y el
Callao), de la costa a la selva, cruzando los Andes. La marca **KUNTUR** es ficticia: es una pieza
de portfolio pensada para que viajeros de otros países exploren el mapa y sus curiosidades.

## Contenido

- **25 regiones**, cada una con su capital, su zona (costa, sierra o selva), la altitud de la
  capital, tres curiosidades y un imprescindible (`src/data/stops.ts`).
- **Ruta con sellos** de 8 paradas, de norte a sur: Loreto → Amazonas → La Libertad → Lima → Ica →
  Arequipa → Puno → Cusco. Cada parada visitada suma un sello al pasaporte viajero.
- Datos curiosos del Perú en el loader.

## Secuencia

1. **Loader**: velo de papel con el patrón topográfico, contador, ruta de Tumbes a Tacna y datos
   "¿Sabías que?". Al terminar se lee "25 *Regiones* 3 *Mundos*" y el velo se quema desde el centro.
2. **Hero**: foto de Machu Picchu en WebGL con zoom lento, parallax y un "empujón" al entrar. El
   título "Explora Perú" se entrelaza con la línea de la ruta, y el botón pasa de píldora a círculo.
3. **Transición**: la foto se quema y revela el diorama.
4. **Mapa 3D**: el Perú como losa elevada sobre un mundo continuo (Pacífico y países vecinos), que se pierde en la bruma.
   - Pacífico con aguas poco profundas y espuma en la orilla; países vecinos rotulados.
   - Costa desértica (huarangos, cactus, oasis de Huacachina, líneas de Nazca), Andes con nieve
     en las cumbres y altiplano, selva amazónica con ríos (Amazonas, Marañón, Ucayali, Urubamba,
     Madre de Dios) y el lago Titicaca con las islas de los uros.
   - Hitos en la ruta: Kuélap, Chan Chan, Lima, el Misti, Machu Picchu y casas palafito en Loreto.
   - Departamentos dibujados sobre el relieve; el que tiene el cursor encima (o está abierto) se ilumina.
   - Pines en las 25 regiones, lista de regiones, pasaporte de sellos y transporte a elegir
     (combi, llama o tren andino).
5. **Página de región** (clic en un pin, en la lista o en un sello): la cámara se acerca al pin,
   un velo de papel se abre desde él con contador y ruta, y se quema revelando la página:
   - Hero a pantalla completa con la foto de la región, título letra a letra, región anterior y
     siguiente, y el sello de la ruta si corresponde.
   - Al hacer scroll la foto se encoge como una postal, sube un titular gigante que
     aparece palabra por palabra, y un relleno marrón con borde líquido de ruido (técnica de
     IronHill, de Codegrid) inunda la pantalla; el titular se vuelve a escribir en crema entre
     fotos flotando, y al cerrar la sección el crema sube con el mismo borde líquido.
   - "Historias del camino": una tarjeta que crece a pantalla completa y se vuelve un slider con
     las tres curiosidades; cada foto entra con el mismo borde líquido (WebGL).
   - Desvíos a las regiones vecinas y una tarjeta hacia la siguiente región.
   - "Volver al mapa" / "Explorar en 3D" pliega la página y regresa al diorama.

La geografía está simplificada a mano: es un mapa ilustrado, no cartografía exacta.

## Stack

| Capa | Tecnología |
| --- | --- |
| UI | React 19 + CSS Modules |
| 3D | Three.js (shaders propios, `InstancedMesh`, sombras, render targets) |
| Animación | GSAP (timelines + `CustomEase` propios) |
| Scroll | Lenis (panel de cada región) |
| Audio | Howler.js (sonidos sintetizados con `scripts/gen-audio.mjs`) |
| Build | Vite |

## Scripts

```bash
pnpm install
pnpm dev        # http://localhost:5178
pnpm build      # type-check + build de producción en dist/
pnpm audio      # regenera los WAV de public/audio
```

Atajos de desarrollo (solo en `dev`): `http://localhost:5178/?map` salta directo al mapa y
`?map&region=cusco` abre además la página de una región.

El fondo del hero se elige en `src/webgl/Experience.ts` (`HERO_BACKGROUND`). Si la foto no carga,
se usa la escena 3D de montañas.

## Recursos externos (`public/`)

- `machu-picchu.jpg`: foto del hero.
- `onboarding/`: fotos de [Unsplash](https://unsplash.com) (licencia Unsplash, uso libre):
  - `vinicunca.jpg` — Montaña de Siete Colores, por Johnson Wang
  - `huacachina.jpg` — Oasis de Huacachina, por Domenica Basantes
  - `llama.jpg` — Llama en los Andes, por Sofia Guaico
- `regions/<id>/`: fotos de [Unsplash](https://unsplash.com) (licencia Unsplash) para cada región:
  `hero.jpg` y `s1`–`s3.jpg`. Los ids de origen están en `src/data/regionPhotos.ts`
  (`https://unsplash.com/photos/<id>`).
- `pattern-alt.png`: patrón topográfico del loader.
- `fonts/`: Centra No2, Heldies, Barlow ExtraBold y Krona One.

> Centra No2 y Heldies son fuentes comerciales, y el patrón y algunas fotos provienen de webs de
> referencia. Antes de publicar el proyecto hay que comprar las licencias y usar imágenes propias o
> con licencia. Barlow y Krona One son libres (OFL).
