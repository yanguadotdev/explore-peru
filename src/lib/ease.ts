import gsap from 'gsap'
import { CustomEase } from 'gsap/CustomEase'

gsap.registerPlugin(CustomEase)

// House easing curves — mirrored as CSS custom properties in styles/global.css
CustomEase.create('alt.out', 'M0,0 C0.16,1 0.3,1 1,1')
CustomEase.create('alt.inOut', 'M0,0 C0.65,0 0.25,1 1,1')
CustomEase.create('alt.in', 'M0,0 C0.7,0 0.84,0 1,1')

export { gsap }

// Lenis + ScrollTrigger run on the GSAP ticker: never skip frames after a hitch
gsap.ticker.lagSmoothing(0)
