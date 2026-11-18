import { test as base, expect, type Locator, type Page } from '@playwright/test'

/*
  Shared fixture: every test fails if the page logs a console error or throws
  an uncaught exception at any point (the kind of bug that blanked the screen
  when leaving a region page).
*/
export const test = base.extend<{ errors: string[] }>({
  errors: [
    async ({ page }, use) => {
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(`console.error: ${m.text()}`)
      })
      await use(errors)
      expect(errors, 'console errors / uncaught exceptions').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }

// ------------------------------------------------------------------ helpers

/** The region page dialog (the passport modal is a dialog too). */
export const regionPage = (page: Page) => page.getByRole('dialog', { name: /^Región / })

/** Opens the map directly (dev shortcut ?map skips loader + hero). */
export async function gotoMap(page: Page) {
  await page.goto('/?map')
  await expect(page.getByRole('button', { name: /Regiones/ })).toBeVisible()
}

/** Waits until the region page for `name` is fully shown (loader gone, hero title in). */
export async function expectRegionOpen(page: Page, name: string, id: string) {
  await expect(page).toHaveURL(new RegExp(`/regions/${id}(\\?|$)`))
  const dlg = regionPage(page)
  await expect(dlg).toBeVisible()
  await expect(dlg.getByRole('heading', { level: 1, name })).toBeVisible()
  await expect(page.getByTestId('region-loader')).toBeHidden()
  await expect(page).toHaveTitle(new RegExp(`^${name} ·`))
}

/** Opens a region page straight from its URL (skipping the site loader). */
export async function gotoRegion(page: Page, name: string, id: string) {
  await page.goto(`/regions/${id}?map`)
  await expectRegionOpen(page, name, id)
}

/** Scrolls the region page like a user (wheel → Lenis) until `target` is in view. */
export async function scrollTo(page: Page, target: Locator, maxSteps = 200) {
  await page.mouse.move(page.viewportSize()!.width / 2, page.viewportSize()!.height / 2)
  const vh = page.viewportSize()!.height
  for (let i = 0; i < maxSteps; i++) {
    // short timeout: hidden elements (not yet revealed) are not in the tree and would block
    const box = (await target.count()) ? await target.first().boundingBox({ timeout: 300 }).catch(() => null) : null
    const inView = box && box.y >= 0 && box.y + Math.min(box.height, vh * 0.5) <= vh
    if (inView && (await target.isVisible())) return
    // scrolled past it (e.g. it only fades in once on screen): come back up a little
    const dy = box && box.y + box.height < 0 ? -250 : 250
    await page.mouse.wheel(0, dy)
    await page.waitForTimeout(110)
  }
  throw new Error(`could not scroll to ${target}`)
}

/** Wheel-scrolls the whole region page to the bottom. */
export async function scrollToBottom(page: Page) {
  await page.mouse.move(720, 450)
  let last = -1
  for (let i = 0; i < 400; i++) {
    await page.mouse.wheel(0, 600)
    await page.waitForTimeout(40)
    const top = await page.evaluate(() => document.querySelector('[data-scroller]')?.scrollTop ?? 0)
    if (Math.abs(top - last) < 1 && i > 10) return
    last = top
  }
}
