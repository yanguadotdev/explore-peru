import { STOPS } from '../src/data/stops'
import { expect, expectRegionOpen, gotoMap, gotoRegion, regionPage, scrollTo, scrollToBottom, test } from './fixtures'

// ------------------------------------------------------------------ home

test('home: loader → hero → map', async ({ page }) => {
  test.setTimeout(240_000)
  await page.goto('/')
  // the loader counts up, then the hero appears
  await expect(page.getByRole('progressbar', { name: 'Cargando la experiencia' })).toBeVisible()
  const start = page.getByRole('button', { name: /Iniciar el viaje/ })
  await expect(start).toBeVisible({ timeout: 60_000 })
  await expect(page.getByRole('heading', { level: 1, name: 'Explora Perú' })).toBeVisible()
  await page.getByRole('button', { name: 'Entrar sin sonido' }).click()
  // the map UI comes in
  await expect(page.getByRole('button', { name: /Regiones/ })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('button', { name: /Colecciona los sellos/ })).toBeVisible()
  await expect(page).toHaveURL(/\/$/)
})

// ------------------------------------------------------------------ map UI

test('map: the regions list opens a region page and updates the URL', async ({ page }) => {
  await gotoMap(page)
  await page.getByRole('button', { name: /Regiones/ }).click()
  await page.getByRole('button', { name: /Cajamarca/ }).click()
  await expectRegionOpen(page, 'Cajamarca', 'cajamarca')
})

test('map: the passport modal opens and a stamp leads to its region', async ({ page }) => {
  await gotoMap(page)
  await page.getByRole('button', { name: /Colecciona los sellos/ }).click()
  const passport = page.getByRole('dialog', { name: 'Pasaporte de sellos' })
  await expect(passport).toBeVisible()
  await passport.getByRole('button', { name: 'Arequipa' }).click()
  await expectRegionOpen(page, 'Arequipa', 'arequipa')
})

test('map: the transport switcher swaps vehicles', async ({ page }) => {
  await gotoMap(page)
  await page.getByRole('button', { name: /Cambiar transporte/ }).click()
  const llama = page.getByRole('radio', { name: 'Llama' })
  await expect(llama).toBeVisible()
  await llama.click()
  await expect(llama).toHaveAttribute('aria-checked', 'true')
})

// ------------------------------------------------------------------ routing

test('routing: a deep link goes through the loader straight to the region', async ({ page }) => {
  await page.goto('/regions/cusco')
  await expectRegionOpen(page, 'Cusco', 'cusco')
  // the hero of the home page is skipped
  await expect(page.getByRole('button', { name: /Iniciar el viaje/ })).toBeHidden()
})

test('routing: an unknown region redirects home', async ({ page }) => {
  await page.goto('/regions/narnia?map')
  await expect(page).toHaveURL(/\/$/)
  await expect(regionPage(page)).toBeHidden()
})

test('routing: browser back / forward open and close pages', async ({ page }) => {
  await gotoMap(page)
  await page.getByRole('button', { name: /Regiones/ }).click()
  await page.getByRole('button', { name: /Lima/ }).first().click()
  await expectRegionOpen(page, 'Lima', 'lima')
  await page.goBack()
  await expect(page).toHaveURL(/\/(\?map)?$/)
  await expect(regionPage(page)).toBeHidden()
  await page.goForward()
  await expectRegionOpen(page, 'Lima', 'lima')
})

// ------------------------------------------------------------------ region page

test('region: "Volver al mapa" and Escape close the page', async ({ page }) => {
  await gotoRegion(page, 'Puno', 'puno')
  await regionPage(page).getByRole('button', { name: /Volver al mapa/ }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(regionPage(page)).toBeHidden()
  await expect(page.getByRole('button', { name: /Regiones/ })).toBeVisible()

  await page.getByRole('button', { name: /Regiones/ }).click()
  await page.getByRole('button', { name: /Puno/ }).click()
  await expectRegionOpen(page, 'Puno', 'puno')
  await page.keyboard.press('Escape')
  await expect(page).toHaveURL(/\/$/)
  await expect(regionPage(page)).toBeHidden()
})

test('region: scrolling the whole page shows every section', async ({ page }) => {
  await gotoRegion(page, 'Loreto', 'loreto')
  const dlg = regionPage(page)
  const stop = STOPS.find((s) => s.id === 'loreto')!
  await scrollTo(page, dlg.getByRole('heading', { name: /Historias del camino/ }))
  await scrollTo(page, dlg.getByRole('heading', { name: stop.story[0].title }))
  await scrollTo(page, dlg.getByRole('heading', { name: 'Explora también' }))
  await scrollToBottom(page)
  await expect(dlg.getByRole('button', { name: /Continuar el viaje/ })).toBeInViewport()
  // the header progress reached the last section
  await expect(dlg.getByRole('button', { name: 'Desvíos' })).toBeVisible()
})

test('region: the story slider changes story with arrows, thumbnails and swipe', async ({ page }) => {
  await gotoRegion(page, 'Ica', 'ica')
  const dlg = regionPage(page)
  const stop = STOPS.find((s) => s.id === 'ica')!
  const story = (i: number) => dlg.getByRole('heading', { level: 3, name: stop.story[i].title })
  // scroll until the card has grown enough for its arrows to show
  await scrollTo(page, dlg.getByRole('button', { name: /Siguiente\s*historia/ }))
  await expect(story(0)).toBeVisible()

  await dlg.getByRole('button', { name: /Siguiente\s*historia/ }).click()
  await expect(story(1)).toBeVisible()
  await dlg.getByRole('button', { name: /Anterior\s*historia/ }).click()
  await expect(story(0)).toBeVisible()
  // a thumbnail on the road
  await dlg.getByRole('button', { name: stop.story[2].title }).first().click()
  await expect(story(2)).toBeVisible()
  // swipe left → next (wraps around to the first story)
  const box = (await dlg.locator('canvas[data-photo]').boundingBox())!
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.4)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.4, { steps: 8 })
  await page.mouse.up()
  await expect(story(0)).toBeVisible()
})

// regression: this used to throw and blank the whole screen
test('region: "Explorar en 3D" from the slider returns to the map', async ({ page }) => {
  await gotoRegion(page, 'Loreto', 'loreto')
  const dlg = regionPage(page)
  const stop = STOPS.find((s) => s.id === 'loreto')!
  await scrollTo(page, dlg.getByRole('heading', { level: 3, name: stop.story[0].title }))
  await dlg.getByRole('button', { name: /Explorar en\s*3D/ }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(regionPage(page)).toBeHidden()
  // the map is alive: the UI responds and the canvas is still there
  await expect(page.getByRole('button', { name: /Regiones/ })).toBeVisible()
  await expect(page.locator('canvas.webgl')).toBeVisible()
  await page.getByRole('button', { name: /Regiones/ }).click()
  await page.getByRole('button', { name: /Tacna/ }).click()
  await expectRegionOpen(page, 'Tacna', 'tacna')
})

test('region: prev / next region buttons, detours and the next-region card navigate', async ({ page }) => {
  const i = STOPS.findIndex((s) => s.id === 'cusco')
  const next = STOPS[(i + 1) % STOPS.length]
  const prev = STOPS[(i - 1 + STOPS.length) % STOPS.length]
  await gotoRegion(page, 'Cusco', 'cusco')

  await regionPage(page).getByRole('button', { name: new RegExp(`Siguiente\\s*${next.name}`) }).click()
  await expectRegionOpen(page, next.name, next.id)

  await regionPage(page).getByRole('button', { name: new RegExp(`Anterior\\s*${STOPS[i].name}`) }).click()
  await expectRegionOpen(page, 'Cusco', 'cusco')

  await regionPage(page).getByRole('button', { name: new RegExp(`Anterior\\s*${prev.name}`) }).click()
  await expectRegionOpen(page, prev.name, prev.id)

  // a detour, then the tilted next-region card at the very bottom
  const dlg = regionPage(page)
  const visit = dlg.getByRole('button', { name: /^Visitar / }).first()
  await scrollTo(page, visit)
  const target = ((await visit.textContent()) ?? '').replace('Visitar', '').trim()
  await visit.click()
  const detour = STOPS.find((s) => s.name === target)!
  await expectRegionOpen(page, detour.name, detour.id)

  await scrollToBottom(page)
  const k = STOPS.findIndex((s) => s.id === detour.id)
  const after = STOPS[(k + 1) % STOPS.length]
  await regionPage(page).getByRole('button', { name: /Continuar el viaje/ }).click()
  await expectRegionOpen(page, after.name, after.id)
})

test('region: it works on a phone-sized screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await gotoRegion(page, 'Arequipa', 'arequipa')
  await scrollToBottom(page)
  await regionPage(page).getByRole('button', { name: /Explorar en\s*3D/ }).click()
  await expect(regionPage(page)).toBeHidden()
})

// ------------------------------------------------------------------ every region

test('every region page opens with its photos', async ({ page }) => {
  test.setTimeout(400_000)
  await gotoRegion(page, STOPS[0].name, STOPS[0].id)
  for (let i = 0; i < STOPS.length; i++) {
    const stop = STOPS[i]
    const dlg = regionPage(page)
    await expectRegionOpen(page, stop.name, stop.id)
    // hero photo really loaded
    const hero = dlg.locator('img[data-hero-img]')
    await expect.poll(() => hero.evaluate((img: HTMLImageElement) => img.naturalWidth), { timeout: 20_000 }).toBeGreaterThan(0)
    // go on to the next region with the hero button
    if (i < STOPS.length - 1) {
      await dlg.getByRole('button', { name: new RegExp(`Siguiente\\s*${STOPS[i + 1].name}`) }).click()
    }
  }
})
