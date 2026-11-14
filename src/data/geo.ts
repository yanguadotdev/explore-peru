// Geographic projection for the Peru diorama.
// Simple equirectangular projection: longitude → x, latitude → z (north = -z).

export const LON0 = -75
export const LAT0 = -9.2
/** world units per degree */
export const SCALE = 6

export function project(lon: number, lat: number): [number, number] {
  return [(lon - LON0) * SCALE, -(lat - LAT0) * SCALE]
}

export function unproject(x: number, z: number): [number, number] {
  return [x / SCALE + LON0, -z / SCALE + LAT0]
}
