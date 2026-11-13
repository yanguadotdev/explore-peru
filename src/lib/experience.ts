import type { Experience } from '../webgl/Experience'

let instance: Experience | null = null
export const setExperience = (e: Experience) => (instance = e)
export const getExperience = () => instance
