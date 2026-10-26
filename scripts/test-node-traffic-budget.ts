import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
    getNodeTrafficBudget,
    type NodeTrafficBudgetInput
} from '../src/shared/utils/node-traffic-budget.ts'

const GiB = 1024 ** 3
const base: NodeTrafficBudgetInput = {
    isTrafficTrackingActive: true,
    trafficLimitBytes: 310 * GiB,
    trafficUsedBytes: 200 * GiB,
    trafficResetDay: 1
}
const at = (date: string, changes: Partial<NodeTrafficBudgetInput> = {}) => {
    const result = getNodeTrafficBudget({ ...base, ...changes }, new Date(date))
    assert.ok(result)
    return result
}
const closeTo = (actual: number, expected: number) =>
    assert.ok(Math.abs(actual - expected) <= Math.max(1e-9, Math.abs(expected) * 1e-12))

const screenshot = at('2026-10-26T05:30:00Z', {
    trafficLimitBytes: 500 * GiB,
    trafficUsedBytes: 265.7 * GiB
})
assert.equal(screenshot.elapsedDays, 26)
assert.equal(screenshot.cycleDays, 31)
closeTo(screenshot.expectedBytes / GiB, (500 * 26) / 31)
closeTo(screenshot.expectedPercentage, (26 * 100) / 31)
closeTo(screenshot.differenceBytes / GiB, 265.7 - (500 * 26) / 31)
assert.equal(screenshot.status, 'behind')
assert.equal(screenshot.cycleStart.toISOString(), '2026-10-01T00:00:00.000Z')
assert.equal(screenshot.cycleEnd.toISOString(), '2026-11-01T00:00:00.000Z')
assert.equal(at('2026-10-26T00:00:00Z').expectedBytes, at('2026-10-26T23:59:59Z').expectedBytes)
assert.equal(
    at('2026-10-25T17:00:00-07:00').expectedBytes,
    at('2026-10-26T08:00:00+08:00').expectedBytes
)

const reset = at('2026-10-06T00:00:00Z', { trafficResetDay: 6 })
assert.equal(reset.elapsedDays, 1)
assert.equal(reset.cycleDays, 31)
assert.equal(reset.cycleStart.toISOString(), '2026-10-06T00:00:00.000Z')
assert.equal(reset.cycleEnd.toISOString(), '2026-11-06T00:00:00.000Z')
assert.equal(at('2026-10-05T23:59:59Z', { trafficResetDay: 6 }).expectedPercentage, 100)
assert.equal(
    at('2027-01-01T00:00:00Z', { trafficResetDay: 15 }).cycleStart.toISOString(),
    '2026-12-15T00:00:00.000Z'
)
assert.equal(at('2026-12-31T23:59:59Z').expectedPercentage, 100)

const shortMonth = at('2025-02-27T12:00:00Z', { trafficResetDay: 31 })
assert.equal(shortMonth.cycleDays, 28)
assert.equal(shortMonth.expectedPercentage, 100)
assert.equal(shortMonth.cycleStart.toISOString(), '2025-01-31T00:00:00.000Z')
assert.equal(shortMonth.cycleEnd.toISOString(), '2025-02-28T00:00:00.000Z')
assert.equal(at('2025-02-28T00:00:00Z', { trafficResetDay: 31 }).elapsedDays, 1)
assert.equal(at('2024-02-28T12:00:00Z', { trafficResetDay: 31 }).cycleDays, 29)
assert.equal(
    at('2024-02-29T00:00:00Z', { trafficResetDay: 31 }).cycleStart.toISOString(),
    '2024-02-29T00:00:00.000Z'
)
assert.equal(
    at('2026-04-30T00:00:00Z', { trafficResetDay: 31 }).cycleEnd.toISOString(),
    '2026-05-31T00:00:00.000Z'
)
assert.equal(at('2026-03-08T12:00:00Z').cycleDays, 31, 'DST does not shorten UTC calendar days')
assert.equal(at('2026-11-01T12:00:00Z').cycleDays, 30, 'DST does not lengthen UTC calendar days')
assert.equal(at('2026-10-26T00:00:00Z', { trafficResetDay: null }).elapsedDays, 26)
assert.equal(at('2026-10-26T00:00:00Z', { trafficUsedBytes: 300 * GiB }).status, 'ahead')
assert.equal(at('2026-10-26T00:00:00Z', { trafficUsedBytes: 260 * GiB }).status, 'on-track')
assert.equal(at('2026-10-26T00:00:00Z', { trafficUsedBytes: 1000 * GiB }).status, 'ahead')
assert.equal(at('2026-10-26T00:00:00Z', { trafficUsedBytes: Number.NaN }).status, 'behind')
assert.equal(at('2026-10-26T00:00:00Z', { trafficUsedBytes: -1 }).status, 'behind')
for (const trafficLimitBytes of [null, undefined, 0, -1, Number.NaN, Infinity]) {
    assert.equal(getNodeTrafficBudget({ ...base, trafficLimitBytes }), null)
}
assert.equal(getNodeTrafficBudget({ ...base, isTrafficTrackingActive: false }), null)
assert.equal(getNodeTrafficBudget(base, new Date('invalid')), null)
for (const trafficResetDay of [0, -1, 32, 1.5, Number.NaN, Infinity]) {
    assert.equal(getNodeTrafficBudget({ ...base, trafficResetDay }), null)
}

for (const year of [2024, 2025, 2026]) {
    for (let month = 0; month < 12; month++) {
        const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
        for (let day = 1; day <= days; day++) {
            for (let trafficResetDay = 1; trafficResetDay <= 31; trafficResetDay++) {
                const now = new Date(Date.UTC(year, month, day, 12))
                const result = getNodeTrafficBudget({ ...base, trafficResetDay }, now)!
                assert.ok(result.cycleStart <= now && now < result.cycleEnd)
                assert.ok(result.cycleDays >= 28 && result.cycleDays <= 31)
                assert.ok(result.elapsedDays >= 1 && result.elapsedDays <= result.cycleDays)
                assert.ok(result.expectedPercentage > 0 && result.expectedPercentage <= 100)
            }
        }
    }
}

const detail = readFileSync(
    'src/widgets/dashboard/nodes/node-details-card/node-details-card.widget.tsx',
    'utf8'
)
const cards = readFileSync('src/widgets/dashboard/nodes/node-card/node-card.widget.tsx', 'utf8')
assert.equal((detail.match(/<NodeTrafficProgress\b/g) ?? []).length, 1)
assert.equal(
    (cards.match(/<NodeTrafficProgress\b/g) ?? []).length,
    2,
    'Desktop and mobile use the same budget progress'
)
const english = JSON.parse(readFileSync('public/locales/en/remnawave.json', 'utf8'))
const chinese = JSON.parse(readFileSync('public/locales/zh/remnawave.json', 'utf8'))
assert.deepEqual(
    Object.keys(english['node-traffic-progress']).sort(),
    Object.keys(chinese['node-traffic-progress']).sort()
)
const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'))
assert.equal(pkg.version, lock.version)
assert.equal(pkg.version, lock.packages[''].version)
console.log(
    'PASS node budget: UTC, inclusive days, resets 1–31, leap/short months, year/DST boundaries, invalid/unlimited inputs, deviation, all card layouts and locales'
)
