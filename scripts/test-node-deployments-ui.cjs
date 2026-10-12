const assert = require('node:assert/strict')
const { chromium } = require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core')
const url = process.env.NODE_DEPLOYMENTS_TEST_URL || 'http://127.0.0.1:5179/scripts/fixtures/node-deployments.html'
const origin = new URL(url).origin
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(url).hostname))
const n = '10000000-0000-4000-8000-000000000001', second = '10000000-0000-4000-8000-000000000002', r = '20000000-0000-4000-8000-000000000001', current = '20000000-0000-4000-8000-000000000002', batch = '30000000-0000-4000-8000-000000000001'
async function main() {
    const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] })
    try {
        for (const width of [1280, 768, 390, 320]) {
            const context = await browser.newContext({ viewport: { width, height: 950 } })
            const posts = [], errors = []
            let pinned = current, batches = []
            await context.route('**/*', async route => {
                const request = route.request(), target = new URL(request.url())
                if (target.origin !== origin) return route.abort()
                if (!target.pathname.startsWith('/api/')) return route.continue()
                assert.equal(request.headers().authorization, 'Bearer deployment-fixture-only')
                let response
                if (request.method() === 'GET' && target.pathname === `/api/node-deployments/nodes/${n}`) {
                    response = { nodeUuid: n, state: { requestedSeq: '2', processedSeq: '2', pinnedRevisionUuid: pinned, appliedRevisionUuid: current, blocked: false, reason: 'PROFILE_APPLY', attempts: 0, lastError: null, applying: false }, revisions: [r, current].map(uuid => ({ uuid, profileUuid: batch, templateHash: 'a'.repeat(64), inboundTags: ['trojan'], changedSections: ['dns'], createdAt: '2026-10-12T00:00:00Z' })), deployments: [r, current].map((revisionUuid, i) => ({ uuid: revisionUuid, revisionUuid, batchUuid: null, actorUuid: null, reason: 'PROFILE_APPLY', state: 'APPLIED', requestedHash: 'a'.repeat(64), activeHash: 'a'.repeat(64), errorCode: null, rollback: 'NOT_REQUIRED', startedAt: '2026-10-12T00:00:00Z', finishedAt: '2026-10-12T00:00:01Z', durationMs: 1000 })), batches, eligibleNodes: [{ uuid: n, name: 'Fixture first', isConnected: true }, { uuid: second, name: 'Fixture second', isConnected: true }] }
                } else if (request.method() === 'POST') {
                    posts.push({ path: target.pathname, body: request.postData() ? request.postDataJSON() : null })
                    if (target.pathname.endsWith('/rollback')) { assert.equal(posts.at(-1).body.revisionUuid, r); pinned = r }
                    else if (target.pathname.endsWith('/resume')) pinned = null
                    else if (target.pathname === '/api/node-deployments/batches') {
                        assert.deepEqual(posts.at(-1).body, { nodeUuids: [n, second], canaryUuid: n })
                        batches = [{ uuid: batch, state: 'RUNNING', nodeUuids: [n, second], nextIndex: 1, activeNodeUuid: n, errorCode: null, createdAt: '2026-10-12T00:00:00Z', finishedAt: null }]
                    } else if (target.pathname.endsWith('/cancel')) batches[0].state = 'CANCELLED'
                    else throw Error('Unexpected mutation: ' + target.pathname)
                    response = { nodeUuid: n, requestSeq: '3', uuid: batch, state: 'RUNNING', canaryUuid: n, nodes: 2 }
                } else throw Error('Unexpected API request: ' + target.pathname)
                return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ response }) })
            })
            const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message))
            await page.goto(url); await page.getByRole('button', { name: 'Open fixture', exact: true }).click()
            await page.getByRole('tab', { name: '配置版本', exact: true }).click()
            await page.getByRole('button', { name: '回滚', exact: true }).first().click()
            assert.equal(posts.length, 0, 'Rollback requires confirmation')
            await page.getByRole('dialog', { name: '回滚配置', exact: true }).getByRole('button', { name: '取消', exact: true }).click(); assert.equal(posts.length, 0)
            await page.getByRole('button', { name: '回滚', exact: true }).first().click()
            await Promise.all([page.waitForResponse(res => res.url().endsWith('/rollback')), page.getByRole('dialog', { name: '回滚配置', exact: true }).getByRole('button', { name: '确认', exact: true }).click()]); assert.equal(posts.length, 1)
            await page.getByRole('button', { name: '解除固定版本', exact: true }).click()
            await Promise.all([page.waitForResponse(res => res.url().endsWith('/resume')), page.getByRole('dialog', { name: '恢复当前 Profile', exact: true }).getByRole('button', { name: '确认', exact: true }).click()])
            await page.getByRole('tab', { name: '灰度批次', exact: true }).click()
            await page.getByRole('combobox', { name: '同 Profile 节点', exact: true }).click(); await page.getByRole('option', { name: 'Fixture second', exact: true }).click(); await page.getByRole('tab', { name: '灰度批次', exact: true }).click()
            await page.getByRole('button', { name: '开始灰度发布', exact: true }).click()
            await page.getByRole('dialog', { name: '开始灰度发布', exact: true }).getByRole('button', { name: '确认', exact: true }).click()
            await page.getByRole('button', { name: '停止批次', exact: true }).waitFor()
            await page.getByRole('button', { name: '停止批次', exact: true }).click()
            await page.getByText('当前已在应用的节点会完成；尚未开始的节点不再下发。', { exact: true }).waitFor()
            await page.getByRole('dialog', { name: '停止后续发布', exact: true }).getByRole('button', { name: '确认', exact: true }).click()
            await page.getByText('CANCELLED', { exact: true }).waitFor()
            assert.equal(posts.length, 4); assert.deepEqual(errors, [])
            const body = await page.locator('.mantine-Modal-body').first().evaluate(el => ({ client: el.clientWidth, scroll: el.scrollWidth }))
            assert.ok(body.scroll <= body.client + 1, 'Release UI must fit viewport')
            await context.close(); console.log(`PASS release UI confirmation, rollback/unpin, canary/cancel and responsive layout (${width}px)`)
        }
    } finally { await browser.close() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
