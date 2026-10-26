const assert = require('node:assert/strict')
const { chromium } = require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core')
const url = process.env.NODES_TABLE_TEST_URL || 'http://127.0.0.1:5173/scripts/fixtures/nodes-table.html'
const endpoint = new URL(url)
assert(['127.0.0.1', 'localhost'].includes(endpoint.hostname), 'Fixture must stay on loopback')

async function setup(browser, width, english = false, light = false) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } })
    const errors = [], writes = []
    await context.route('**/*', route => {
        const request = route.request(), target = new URL(request.url())
        if (target.origin !== endpoint.origin) return route.abort()
        if (!target.pathname.startsWith('/api/')) {
            assert.equal(request.method(), 'GET')
            return route.continue()
        }
        assert.equal(request.headers().authorization, 'Bearer node-list-fixture-only')
        if (request.method() !== 'GET') {
            assert.equal(target.pathname, '/api/nodes/actions/reorder', 'Only mock reorder writes are allowed')
            writes.push(request.postDataJSON())
        } else assert.equal(target.pathname.replace(/\/$/, ''), '/api/nodes')
        return route.fulfill({ json: { response: [] } })
    })
    const page = await context.newPage()
    page.on('pageerror', error => errors.push(error.message))
    const target = new URL(url)
    if (english) target.searchParams.set('lang', 'en')
    if (light) target.searchParams.set('theme', 'light')
    await page.goto(target.href)
    await page.getByText('Fixture node 01', { exact: true }).waitFor()
    return { context, page, errors, writes }
}

async function layout(page, label) {
    // Wait for entrance animation and ResizeObserver measurements, not just React's initial render.
    await page.waitForTimeout(350)
    const state = await page.locator('[data-index]').evaluateAll(elements => ({
        rows: elements.map(element => {
            const card = element.querySelector('[data-drag-overlay="false"]')
            const box = card.getBoundingClientRect()
            const row = element.getBoundingClientRect()
            return {
                index: Number(element.dataset.index), top: box.top, bottom: box.bottom,
                height: box.height, rowHeight: row.height,
                gap: parseFloat(getComputedStyle(card).marginBottom),
                name: card.textContent
            }
        }).sort((a, b) => a.index - b.index),
        width: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        scrollTop: window.scrollY
    }))
    assert(state.rows.length >= 2, label + ': multiple rendered rows')
    assert(state.rows.length < 60, label + ': large lists remain virtualized')
    for (let index = 0; index < state.rows.length; index++) {
        const current = state.rows[index], next = state.rows[index + 1]
        assert(current.height > 40, label + ': card must be visible')
        if (next) assert(next.top - current.bottom >= current.gap - 1,
            `${label}: cards ${current.index}/${next.index} overlap or lose spacing: ${JSON.stringify([current, next])}`)
    }
    assert(state.scrollWidth <= state.width + 1, label + ': no horizontal overflow')
    return state
}

async function dragFirstRow(page, cancel = false) {
    const first = page.locator('[data-index="0"]')
    const handle = await first.locator('[class*="dragHandle"]').boundingBox()
    const second = await page.locator('[data-index="1"]').boundingBox()
    await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2)
    await page.mouse.down()
    await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2 + 12, { steps: 5 })
    await page.waitForTimeout(200)
    await page.mouse.move(handle.x + handle.width / 2, second.y + second.height / 2, { steps: 10 })
    await page.waitForTimeout(300)
    assert.equal(await page.locator('[data-drag-overlay="true"]').count(), 1, 'Dragging still shows an overlay')
    if (cancel) await page.keyboard.press('Escape')
    await page.mouse.up()
    await page.waitForTimeout(350)
}

async function main() {
    const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] })
    try {
        for (const width of [1920, 1280, 1025, 1024, 768, 390, 320]) {
            const fixture = await setup(browser, width)
            const { page } = fixture
            const initial = await layout(page, `${width}: initial`)
            assert(initial.rows.some(row => row.name.includes('均分应已用')), 'Real node cards include the new budget caption')
            if (process.env.NODES_TABLE_SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.NODES_TABLE_SCREENSHOT_DIR}/nodes-table-${width}.png` })
            await page.getByRole('button', { name: 'Toggle traffic budget', exact: true }).click()
            const withoutBudget = await layout(page, `${width}: budget disabled`)
            assert(!withoutBudget.rows.some(row => row.name.includes('均分应已用')))
            assert(withoutBudget.rows[0].height < initial.rows[0].height, 'Measure changing content instead of fixing an oversized row height')
            await page.getByRole('button', { name: 'Toggle traffic budget', exact: true }).click()
            await layout(page, `${width}: budget re-enabled`)
            await page.getByRole('button', { name: /^CORE\b/ }).click()
            const filtered = await layout(page, `${width}: tag filter`)
            assert(filtered.rows[0].name.includes('Fixture node 02'), 'Changing tag filters replaces the measured rows')
            await page.getByRole('button', { name: /^全部/ }).click()
            await layout(page, `${width}: reset filter`)
            for (const fraction of [0.35, 0.7, 1]) {
                await page.evaluate(fraction => window.scrollTo(0, fraction * document.documentElement.scrollHeight), fraction)
                await layout(page, `${width}: scroll ${fraction}`)
            }
            // Estimated offscreen heights settle as the last rows enter the viewport.
            for (let attempt = 0; attempt < 3; attempt++) {
                await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
                await page.waitForTimeout(150)
            }
            const last = await layout(page, `${width}: end of list`)
            assert.equal(last.rows.at(-1).index, 59, 'Last node remains reachable')
            assert(last.rows.at(-1).bottom <= 1001, 'Last card is not clipped by an undersized virtual container')
            assert.deepEqual(fixture.errors, [])
            assert.equal(fixture.writes.length, 0, 'Read-only list actions must not reorder nodes')
            await fixture.context.close()
            console.log(`PASS node list layout at ${width}px`)
        }
        const fixture = await setup(browser, 1280, true, true)
        await layout(fixture.page, 'English/light')
        for (const width of [390, 1024, 1280, 320, 1920]) {
            await fixture.page.setViewportSize({ width, height: 1000 })
            await layout(fixture.page, `Live resize ${width}`)
        }
        await fixture.page.evaluate(() => { document.documentElement.style.fontSize = '20px' })
        await layout(fixture.page, 'Enlarged text')
        await fixture.page.evaluate(() => { document.documentElement.style.fontSize = '' })
        await layout(fixture.page, 'Normal text')
        assert.deepEqual(fixture.errors, [])
        assert.equal(fixture.writes.length, 0)
        await dragFirstRow(fixture.page, true)
        const canceled = await layout(fixture.page, 'Canceled drag')
        assert(canceled.rows[0].name.includes('Fixture node 01'), 'Canceled drag restores the original order')
        assert.equal(fixture.writes.length, 0, 'Canceled drags must not save a new order')
        await dragFirstRow(fixture.page)
        const reordered = await layout(fixture.page, 'Reordered list')
        assert(reordered.rows[0].name.includes('Fixture node 02'), 'Measured rows still support reordering')
        assert.equal(fixture.writes.length, 1, 'Save one mock reorder after a completed drag')
        assert.equal(fixture.writes[0].nodes[0].uuid, '00000000-0000-4000-8000-000000000002')
        assert.deepEqual(fixture.errors, [])
        await fixture.context.close()
        console.log('PASS real virtual node list: seven widths, desktop/mobile breakpoint, mixed-height cards, dynamic captions, filters, scroll/end, live resize/text scaling, zh/en, dark/light, canceled/completed drag, no overlap, fully mocked API')
    } finally {
        await browser.close()
    }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
