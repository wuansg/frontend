const assert = require('node:assert/strict')
const { chromium } = require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core')
const url = process.env.ACCESS_AUDIT_TEST_URL || 'http://127.0.0.1:5173/scripts/fixtures/access-audit.html'
const endpoint = new URL(url)
assert.ok(['127.0.0.1', 'localhost'].includes(endpoint.hostname), 'Audit UI fixture must stay on loopback')

async function main() {
    const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] })
    try {
        for (const width of [1280, 390, 320]) {
            const context = await browser.newContext({ viewport: { width, height: 850 }, timezoneId: 'America/Los_Angeles' })
            const writes = [], queries = [], errors = []
            let enabled = false
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
                        writes.push(body); enabled = body.enabled
                    }
                    response = { enabled, retentionDays: 7, enabledAt: enabled ? '2026-10-08T00:30:00Z' : null, nodes: [] }
                } else if (target.pathname === '/api/access-audit/records') {
                    queries.push(Object.fromEntries(target.searchParams))
                    response = { nextCursor: null, records: [{ id: '1', userId: 18, username: 'fixture-user', nodeUuid: '10000000-0000-4000-8000-000000000001', nodeName: 'fixture-node', domain: 'example.com', destinationIp: '203.0.113.9', destinationPort: 443, inbound: '<script>fixture</script>', network: 'tcp', protocol: 'tls', startedAt: '2026-10-08T00:30:00Z', observedAt: '2026-10-08T00:30:01Z', closedAt: null, upload: '9007199254740993', download: '1024', partial: false }] }
                } else if (target.pathname === '/api/access-audit/domains') {
                    response = [{ domain: 'example.com', destinationIp: '', connections: 1, upload: '9007199254740993', download: '1024' }]
                } else throw Error('Unexpected API request: ' + target.pathname)
                return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ response }) })
            })
            const page = await context.newPage()
            page.on('pageerror', error => errors.push(error.message))
            await page.clock.install({ time: new Date('2026-10-08T00:30:00Z') })
            await page.goto(url)
            await page.getByRole('button', { name: 'Open selected user', exact: true }).click()
            await page.getByText('默认关闭', { exact: true }).waitFor()
            await page.getByRole('cell', { name: '1 KiB', exact: true }).waitFor()
            assert.equal(await page.getByRole('cell', { name: '8 PiB', exact: true }).count(), 1)
            assert.equal(writes.length, 0, 'Opening a user must never auto-enable audit')
            assert.equal(queries[0].userId, '18')
            assert.equal(queries[0].start, '2026-10-08'); assert.equal(queries[0].end, '2026-10-08')
            assert.equal(await page.locator('script').filter({ hasText: /^fixture$/ }).count(), 0, 'Inbound must be rendered as text')
            await page.getByRole('button', { name: '开启此用户', exact: true }).click()
            assert.equal(writes.length, 0, 'Enabling requires explicit confirmation')
            await page.getByRole('button', { name: '仅开启此用户', exact: true }).click()
            await page.getByText('已开启', { exact: true }).waitFor()
            assert.deepEqual(writes, [{ enabled: true, retentionDays: 7 }])
            await page.getByRole('button', { name: '停止审计', exact: true }).click()
            await page.getByText('默认关闭', { exact: true }).waitFor()
            assert.deepEqual(writes[1], { enabled: false, retentionDays: 7 })
            await Promise.all([
                page.waitForResponse(r => r.url().includes('/api/access-audit/records?') && r.url().includes('domain=example.com')),
                page.getByLabel('域名包含', { exact: true }).fill('example.com')
            ])
            await page.getByRole('tab', { name: '目标用量排行', exact: true }).click()
            await page.getByRole('cell', { name: '1. example.com', exact: true }).waitFor()
            await page.getByLabel('观察日期（UTC）', { exact: true }).click()
            const list = page.locator('.mantine-DatePickerInput-presetsList:visible')
            await list.waitFor()
            const listBox = await list.boundingBox(), calendarBox = await page.locator('.mantine-DatePickerInput-datePickerRoot:visible table').first().boundingBox()
            assert.ok(listBox.x + listBox.width <= calendarBox.x + 2, 'Quick presets must be left of the calendar')
            await Promise.all([
                page.waitForResponse(r => r.url().includes('/api/access-audit/records?') && r.url().includes('start=2026-10-02')),
                list.getByRole('button', { name: '7 天', exact: true }).click()
            ])
            const content = await page.locator('.mantine-Modal-content').first().boundingBox()
            assert.ok(content.x >= -1 && content.x + content.width <= width + 1, 'Audit modal must fit the viewport')
            await page.screenshot({ path: `/tmp/access-audit-${width}.png` })
            await page.goto(url)
            await page.getByRole('button', { name: 'Open global audit', exact: true }).click()
            await page.getByLabel('用户 ID（留空查询全部已采集记录）', { exact: true }).waitFor()
            assert.equal(await page.getByRole('button', { name: '开启此用户', exact: true }).count(), 0, 'Global view must not offer enable-all')
            assert.deepEqual(errors, [], 'Audit UI must not raise browser errors')
            await context.close()
            console.log(`PASS access audit opt-in/confirmation/disable, independent global view, safe rendering, filters, bytes and mobile layout (${width}px)`)
        }
    } finally { await browser.close() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
