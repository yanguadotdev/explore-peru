# Ruta del Café — ALTURA Café de Origen

Experiencia interactiva en WebGL para una marca de café de especialidad **ficticia** (pieza de portfolio).
Cuenta el viaje del grano en seis paradas, desde la finca a 2.100 msnm hasta la taza en el pueblo.

Montañas, terreno, vegetación, edificios, vehículos, ilustraciones y audio se generan por código
(el audio con `scripts/gen-audio.mjs`).

Recursos externos en `public/` (tomados de la referencia, expedia.com/route66):

- `pattern-alt.png`: patrón topográfico del loader.
- `fonts/`: Centra No2 (títulos y textos), Heldies (manuscrita), Barlow ExtraBold (cifras) y Krona One (etiquetas).

> Centra No2 y Heldies son fuentes comerciales, y el patrón es un recurso de la web de referencia.
> Antes de publicar el proyecto hay que comprar las licencias de las fuentes y reemplazar el patrón por
> uno propio. Barlow y Krona One tienen licencia libre (OFL).

## Stack

| Capa | Tecnología |
| --- | --- |
| UI | React 19 + CSS Modules |
| 3D | Three.js (shaders propios, `InstancedMesh`, sombras, render targets) |
| Animación | GSAP (timelines + `CustomEase` propios: `alt.in`, `alt.out`, `alt.inOut`) |
| Scroll | Lenis (panel de historia de cada parada) |
| Audio | Howler.js |
| Build | Vite |

## Secuencia

1. **Loader**: velo de papel con curvas de nivel procedurales (shader), contador, ruta SVG que se dibuja
   con un grano de café viajando por ella, y datos "¿Sabías que?". Al terminar, el texto se transforma en
   "De la *Montaña* a tu *Taza*" y el velo se **tuesta** desde el centro (quemado fbm con borde encendido).
2. **Hero**: amanecer cafetero en 3D con crestas por capas y perspectiva aérea, niebla en los valles,
   palmas de cera, aves y parallax de cámara. Título con revelado letra a letra, perfil de altitud
   animado y CTA en forma de píldora que se convierte en círculo al pasar el cursor.
3. **Transición**: la cámara entra en la niebla y el fotograma se quema hacia el diorama, que llega
   desenfocado y se enfoca mientras la ruta se dibuja sola.
4. **Mapa 3D (diorama)**: maqueta sobre papel con estratos de tierra a los lados, río animado, terrazas
   de café siguiendo las curvas de nivel, cafetos con cerezas, bosque de niebla con viento, nubes con
   sombra, humo de la tostaduría y un vehículo recorriendo la ruta. Tiene tilt-shift, viñeta y grano.
   - Arrastrar con inercia y zoom con la rueda.
   - Pines con hover: tarjeta ilustrada que sigue al pin.
   - Clic en un pin: la cámara vuela a la parada, se abre el panel con la historia (Lenis) y se gana
     un sello con animación.
   - Pasaporte de sellos (X/6), lista de paradas, cambio de transporte (jeep, mula, chiva), sonido
     y onboarding.

## Scripts

```bash
pnpm install
pnpm dev        # http://localhost:5178
pnpm build      # type-check + build de producción en dist/
pnpm audio      # regenera los WAV de public/audio
```

Atajo de desarrollo: `http://localhost:5178/?map` salta directo al mapa (solo en `dev`).

## Estructura

```
src/
  App.tsx                 orquesta loader → hero → mapa
  components/             Loader, Hero, MapUI (+ CSS modules), iconos, ilustraciones, sellos
  data/stops.ts           paradas, desvíos, textos y datos curiosos
  lib/                    store, eases GSAP, audio (Howler)
  webgl/
    Experience.ts         renderer, render targets y pase de composición (quemado, tilt-shift, grano)
    LoaderOverlay.ts      velo topográfico del loader + disolución
    HeroScene.ts          escena de montañas del hero
    MapScene.ts           diorama, cámara con inercia, picking de pines
    map/                  terreno, ruta y pines, vegetación y edificios, vehículos
    shaders/chunks.ts     ruido, fbm, turbulencia y campo de quemado compartidos
```
