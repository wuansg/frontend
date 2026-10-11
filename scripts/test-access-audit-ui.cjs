const assert = require('node:assert/strict')
const { chromium } = require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core')
const url = process.env.ACCESS_AUDIT_TEST_URL || 'http://127.0.0.1:5173/scripts/fixtures/access-audit.html'
const endpoint = new URL(url)
const screenshots = process.env.ACCESS_AUDIT_SCREENSHOT_DIR || '/tmp'
assert.ok(['127.0.0.1', 'localhost'].includes(endpoint.hostname), 'Audit UI fixture must stay on loopback')
const longDomain = `${'very-long-'.repeat(15)}example.com`
const first = { id: '1', userId: 18, username: 'fixture-user', nodeUuid: '10000000-0000-4000-8000-000000000001', nodeName: 'fixture-node', domain: 'example.com', destinationIp: '203.0.113.9', destinationPort: 443, inbound: '<script>fixture</script>', network: 'tcp', protocol: 'tls', startedAt: '2026-10-08T00:30:00Z', observedAt: '2026-10-08T00:30:01Z', closedAt: null, upload: '9007199254740993', download: '1024', partial: false }
const rows = [first, { ...first, id: '2', username: 'long-fixture-用户名'.repeat(4), domain: longDomain, destinationIp: '2001:db8::9', inbound: 'trojan-ws', upload: '2097152', download: '16777216', closedAt: first.observedAt, partial: true }, { ...first, id: '3', domain: '', destinationIp: '198.51.100.9', destinationPort: 8443, inbound: 'snell-v6', upload: '256', download: '512', closedAt: first.observedAt }]

async function fixture(browser, width, options = {}) {
    const context = await browser.newContext({ viewport: { width, height: options.preview ? 1100 : 950 }, timezoneId: 'America/Los_Angeles' })
    const writes = [], queries = [], errors = []
    let enabled = Boolean(options.preview), retentionDays = 7
    const data = options.preview ? rows.map((r, i) => ({ ...r, username: 'demo-user', nodeName: 'Singapore', inbound: 'trojan-ws', domain: ['www.cloudflare.com', 'docs.github.com', 'example.com'][i], destinationIp: '203.0.113.9', upload: ['1048576', '2097152', '524288'][i], download: ['8388608', '16777216', '3145728'][i], partial: i === 2 })) : rows
    let releaseRecords
    const gate = options.loading ? new Promise(resolve => { releaseRecords = resolve }) : undefined
    await context.route('**/*', async route => {
        const request = route.request(), target = new URL(request.url())
        if (target.origin !== endpoint.origin) return route.abort()
        if (!target.pathname.startsWith('/api/')) return route.continue()
        assert.equal(request.headers().authorization, 'Bearer audit-fixture-only')
        let response
        if (target.pathname === '/api/nodes' || target.pathname === '/api/nodes/') response = []
        else if (target.pathname === '/api/access-audit/users/18/policy') {
            if (request.method() === 'PUT') {
                const body = request.postDataJSON()
                assert.deepEqual(Object.keys(body).sort(), ['enabled', 'retentionDays'])
                writes.push(body); enabled = body.enabled; retentionDays = body.retentionDays
            }
            response = { enabled, retentionDays, enabledAt: enabled ? first.startedAt : null, nodes: [1, 2].map((i) => ({ uuid: `10000000-0000-4000-8000-00000000000${i}`, name: `fixture-node-${i}`, connected: true, mode: 'CORE_ACTIVE', supported: true, syncedAt: first.observedAt, lastError: null, status: { capturing: enabled && i === 1, dropped: i === 2 ? 3 : 0, expiresAt: '2026-10-08T00:35:00Z', lastError: '' } })) }
        } else if (target.pathname === '/api/access-audit/records') {
            queries.push(Object.fromEntries(target.searchParams))
            if (gate) await gate
            if (options.error) return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'fixture-only failure' }) })
            response = options.empty ? { nextCursor: null, records: [] } : target.searchParams.has('cursor') ? { nextCursor: null, records: [{ ...data[0], id: '4', domain: 'page-two.example' }] } : { nextCursor: 'fixture-next', records: data }
        } else if (target.pathname === '/api/access-audit/domains') {
            response = options.empty ? [] : data.map(r => ({ domain: r.domain, destinationIp: r.domain ? '' : r.destinationIp, connections: 1, upload: r.upload, download: r.download }))
        } else throw Error('Unexpected API request: ' + target.pathname)
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ response }) })
    })
    const page = await context.newPage()
    page.on('pageerror', error => errors.push(error.message))
    await page.clock.install({ time: new Date('2026-10-08T00:30:00Z') })
    const pageUrl = new URL(url)
    if (options.light) pageUrl.searchParams.set('theme', 'light')
    if (options.en) pageUrl.searchParams.set('lang', 'en')
    await page.goto(pageUrl.href)
    return { context, page, writes, queries, errors, releaseRecords }
}

async function fits(page, width) {
    const content = await page.locator('.mantine-Modal-content').first().boundingBox()
    assert.ok(content.x >= -1 && content.x + content.width <= width + 1, 'Audit modal must fit the viewport')
    const body = await page.locator('.mantine-Modal-body').evaluate(el => ({ client: el.clientWidth, scroll: el.scrollWidth }))
    assert.ok(body.scroll <= body.client + 1, `Audit body must not overflow horizontally (${body.scroll}/${body.client})`)
}

async function main() {
    const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] })
    try {
        for (const width of [1280, 768, 390, 320]) {
            const { context, page, writes, queries, errors } = await fixture(browser, width)
            await page.getByRole('button', { name: 'Open selected user', exact: true }).click()
            await page.getByText('默认关闭', { exact: true }).waitFor()
            const results = width > 960 ? page.getByRole('table') : page.getByTestId('audit-connection-cards')
            await results.getByText('1 KiB', { exact: true }).waitFor()
            assert.equal(await results.getByText('8 PiB', { exact: true }).count(), 1)
            assert.equal(await results.getByText('[2001:db8::9]:443', { exact: true }).count(), 1)
            assert.equal(await results.getByText('<script>fixture</script>', { exact: true }).count(), 1, 'Inbound is escaped text')
            const summary = page.getByTestId('audit-page-summary')
            assert.equal(await summary.getByText('3', { exact: true }).count(), 2, 'Summary is current-page connections and targets')
            assert.equal(await summary.getByText('16 MiB', { exact: true }).count(), 1, 'Page bytes are summed with BigInt')
            assert.equal(await page.locator('script').filter({ hasText: /^fixture$/ }).count(), 0)
            assert.equal(writes.length, 0, 'Opening a user must never auto-enable audit')
            assert.equal(queries[0].userId, '18')
            assert.equal(queries[0].start, '2026-10-08'); assert.equal(queries[0].end, '2026-10-08')
            await fits(page, width)
            if (width < 640) assert.ok((await page.getByRole('button', { name: '开启此用户', exact: true }).boundingBox()).width >= 150, 'Mobile policy action label must not be squeezed')
            await page.screenshot({ path: `${screenshots}/access-audit-${width}.png`, animations: 'disabled' })
            await page.getByRole('button', { name: '下一页', exact: true }).click()
            await page.getByText('page-two.example', { exact: true }).waitFor()
            await page.getByText('第 2 页', { exact: true }).waitFor()
            assert.equal(queries.at(-1).cursor, 'fixture-next')
            await page.getByRole('button', { name: '上一页', exact: true }).click()
            await page.getByText('第 1 页', { exact: true }).waitFor()
            await page.getByRole('button', { name: '开启此用户', exact: true }).click()
            assert.equal(writes.length, 0, 'Enabling requires explicit confirmation')
            await page.getByRole('button', { name: '仅开启此用户', exact: true }).click()
            await page.getByText('已开启', { exact: true }).waitFor()
            assert.deepEqual(writes, [{ enabled: true, retentionDays: 7 }])
            await page.getByRole('button', { name: /节点采集状态/ }).click()
            await page.getByText('fixture-node-1', { exact: true }).waitFor()
            await page.getByText('等待同步 / 有缺口 · 丢弃 3', { exact: true }).waitFor()
            await page.getByRole('button', { name: '停止审计', exact: true }).click()
            await page.getByText('默认关闭', { exact: true }).waitFor()
            assert.deepEqual(writes[1], { enabled: false, retentionDays: 7 })
            await page.getByLabel('保存天数', { exact: true }).fill('14')
            await page.getByRole('button', { name: '保存天数', exact: true }).click()
            assert.deepEqual(writes[2], { enabled: false, retentionDays: 14 }, 'Retention save must not opt in')
            await Promise.all([
                page.waitForResponse(r => r.url().includes('/api/access-audit/records?') && r.url().includes('domain=example.com')),
                page.getByLabel('域名包含', { exact: true }).fill('example.com')
            ])
            await page.getByText('第 1 页', { exact: true }).waitFor()
            await page.getByRole('tab', { name: '目标用量排行', exact: true }).click()
            await page.getByText('example.com', { exact: true }).waitFor()
            await fits(page, width)
            await page.getByLabel('观察日期（UTC）', { exact: true }).click()
            const list = page.locator('.mantine-DatePickerInput-presetsList:visible')
            await list.waitFor()
            const listBox = await list.boundingBox(), calendarBox = await page.locator('.mantine-DatePickerInput-datePickerRoot:visible table').first().boundingBox()
            assert.ok(listBox.x + listBox.width <= calendarBox.x + 2, 'Quick presets must remain left of the calendar')
            await Promise.all([
                page.waitForResponse(r => r.url().includes('/api/access-audit/records?') && r.url().includes('start=2026-10-02')),
                list.getByRole('button', { name: '7 天', exact: true }).click()
            ])
            await page.goto(url)
            await page.getByRole('button', { name: 'Open global audit', exact: true }).click()
            await page.getByLabel('用户 ID', { exact: true }).waitFor()
            assert.equal(await page.getByRole('button', { name: '开启此用户', exact: true }).count(), 0, 'Global view must not offer enable-all')
            await fits(page, width)
            assert.deepEqual(errors, [], 'No browser errors')
            await context.close()
            console.log(`PASS opt-in/retention, pagination, filters, BigInt, long text/IPv6 and responsive audit UI (${width}px)`)
        }
        for (const options of [{ empty: true }, { error: true }, { loading: true }, { en: true, light: true }]) {
            const { context, page, writes, errors, releaseRecords } = await fixture(browser, 390, options)
            await page.getByRole('button', { name: 'Open selected user', exact: true }).click()
            await page.getByText(options.en ? 'Disabled' : '默认关闭', { exact: true }).first().waitFor()
            if (options.loading) {
                await page.getByText('正在加载审计记录…', { exact: true }).waitFor()
                releaseRecords()
                await page.getByTestId('audit-connection-cards').waitFor()
            } else if (options.empty) {
                await page.getByText('暂无匹配的连接记录', { exact: true }).waitFor()
                await page.getByRole('tab', { name: '目标用量排行', exact: true }).click()
                await page.getByText('暂无目标用量', { exact: true }).waitFor()
            } else if (options.error) await page.getByText('暂时无法加载，请重试', { exact: true }).waitFor()
            else {
                await page.getByTestId('audit-connection-cards').waitFor()
                assert.equal(await page.locator('html').getAttribute('data-mantine-color-scheme'), 'light')
                const header = await page.locator('.mantine-Modal-header').evaluate(el => getComputedStyle(el).backgroundColor)
                assert.equal(header, 'rgb(255, 255, 255)', 'Audit header must respect light mode, not inherit a hardcoded dark header')
                await page.screenshot({ path: `${screenshots}/access-audit-390-light-en.png`, animations: 'disabled' })
            }
            await fits(page, 390)
            assert.equal(writes.length, 0); assert.deepEqual(errors, [])
            await context.close()
            console.log('PASS audit loading/empty/error/light-English state: ' + JSON.stringify(options))
        }
        for (const width of [1280, 390]) {
            const { context, page } = await fixture(browser, width, { preview: true })
            await page.getByRole('button', { name: 'Open selected user', exact: true }).click()
            await page.getByText('已开启', { exact: true }).waitFor()
            await page.getByText('www.cloudflare.com', { exact: true }).waitFor()
            await fits(page, width)
            await page.screenshot({ path: `${screenshots}/access-audit-preview-${width}.png`, animations: 'disabled' })
            await context.close()
        }
    } finally { await browser.close() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
