const assert = require('node:assert/strict')
const { chromium } = require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core')
const url = process.env.NODE_BUDGET_TEST_URL || 'http://127.0.0.1:5173/scripts/fixtures/node-traffic-budget.html'
const endpoint = new URL(url)
assert(['127.0.0.1', 'localhost'].includes(endpoint.hostname), 'Fixture must stay on loopback')

async function setup(browser, width, english = false, light = false) {
    const context = await browser.newContext({ viewport: { width, height: 1100 }, timezoneId: 'America/Los_Angeles' })
    const errors = []
    await context.route('**/*', route => {
        const target = new URL(route.request().url())
        if (target.origin !== endpoint.origin || target.pathname.startsWith('/api/')) return route.abort()
        assert.equal(route.request().method(), 'GET', 'Fixture must not modify data')
        return route.continue()
    })
    const page = await context.newPage()
    page.on('pageerror', error => errors.push(error.message))
    await page.clock.install({ time: new Date('2026-10-26T05:30:00Z') })
    const target = new URL(url)
    if (english) target.searchParams.set('lang', 'en')
    if (light) target.searchParams.set('theme', 'light')
    await page.goto(target.href)
    return { context, page, errors }
}

async function main() {
    const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] })
    try {
        for (const width of [1280, 768, 390, 320]) {
            const { context, page, errors } = await setup(browser, width)
            const under = page.getByTestId('under')
            await under.getByText('均分应已用 419.35 GiB', { exact: true }).waitFor()
            await under.getByText('节余 153.65 GiB', { exact: true }).waitFor()
            await page.getByTestId('over').getByText('超出均分 60.65 GiB', { exact: true }).waitFor()
            const exhausted = page.getByTestId('exhausted').getByRole('progressbar')
            assert.equal(await exhausted.getAttribute('aria-valuenow'), '100', 'Clamp an exhausted quota')
            assert(Math.abs(Number(await under.getByRole('progressbar').getAttribute('aria-valuenow')) - 53.14) < 0.01, 'Do not replace actual usage with the reference')
            for (const id of ['unlimited', 'disabled']) {
                assert.equal(await page.getByTestId(id).getByTestId('node-traffic-budget-marker').count(), 0)
                assert.equal(await page.getByTestId(id).getByText(/均分应已用/).count(), 0)
            }
            const marker = await under.getByTestId('node-traffic-budget-marker').boundingBox()
            const track = await under.locator('[tabindex="0"]').boundingBox()
            assert(Math.abs((marker.x + marker.width / 2 - track.x) / track.width - 26 / 31) < 0.01, 'Marker follows reset-cycle days, not used bytes')
            const viewport = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }))
            assert(viewport.scroll <= width + 1, 'No horizontal overflow: ' + JSON.stringify(viewport))
            await under.locator('[tabindex="0"]').focus()
            await page.getByRole('tooltip').getByText('周期第 26 / 31 天', { exact: false }).waitFor()
            await page.getByRole('tooltip').getByText('周期（UTC）：2026-10-01 — 2026-10-31', { exact: true }).waitFor()
            await page.getByRole('tooltip').getByText(/每日 16.13 GiB/).waitFor()
            const tooltip = await page.getByRole('tooltip').boundingBox()
            assert(tooltip.x >= -1 && tooltip.x + tooltip.width <= width + 1, 'Tooltip fits narrow screens')
            await under.locator('[tabindex="0"]').evaluate(el => el.blur())
            await page.screenshot({ path: `${process.env.NODE_BUDGET_SCREENSHOT_DIR || '/tmp'}/node-traffic-budget-${width}.png`, fullPage: true, animations: 'disabled' })
            await page.clock.setSystemTime(new Date('2026-10-27T00:00:00Z'))
            await page.clock.runFor(60_000)
            await under.getByText('均分应已用 435.48 GiB', { exact: true }).waitFor()
            await page.clock.setSystemTime(new Date('2026-11-01T00:00:00Z'))
            await page.clock.runFor(60_000)
            await under.getByText('均分应已用 16.67 GiB', { exact: true }).waitFor()
            assert.deepEqual(errors, [])
            await context.close()
        }
        const { context, page, errors } = await setup(browser, 390, true, true)
        await page.getByTestId('under').getByText('Expected: 419.35 GiB', { exact: true }).waitFor()
        await page.getByTestId('under').getByText('Under budget by 153.65 GiB', { exact: true }).waitFor()
        assert.deepEqual(errors, [])
        await context.close()
        console.log('PASS browser node traffic budget: four widths, mobile tooltip/focus, dark/light, zh/en, accurate marker/actual bar, deviation, unlimited/disabled, UTC midnight and reset rollover, no API writes')
    } finally {
        await browser.close()
    }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
