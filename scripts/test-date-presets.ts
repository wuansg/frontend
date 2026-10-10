import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import {
    filterDatePresets,
    getDatePresets,
    getDateTimePresets,
    getRangePresets,
    toUtcCalendarBound
} from '../src/shared/ui/date-time-picker/date-presets.ts'

const originalTimezone = process.env.TZ
try {
    for (const timezone of ['UTC', 'Asia/Shanghai', 'America/Los_Angeles']) {
        process.env.TZ = timezone
        const now = new Date('2026-10-08T00:30:00Z')
        const range = getRangePresets(now)
        assert.equal(range.length, 10)
        assert.deepEqual(range[0].value, ['2026-10-08', '2026-10-08'])
        assert.deepEqual(range[1].value, ['2026-10-07', '2026-10-07'])
        assert.deepEqual(range[2].value, ['2026-10-01', '2026-10-08'])
        for (const preset of range.slice(3)) {
            const [start, end] = preset.value
            assert.equal((+new Date(end) - +new Date(start)) / 86400_000 + 1, preset.count)
            assert.equal(end, '2026-10-08')
        }
        assert.equal(toUtcCalendarBound(now), '2026-10-08')
        assert.equal(filterDatePresets(range, undefined, toUtcCalendarBound(now)).length, 10)
        assert.equal(filterDatePresets(range, '2026-10-07', '2026-10-08').length, 2)
        assert.deepEqual(
            getRangePresets(new Date('2026-11-01T00:00:00Z'))[0].value,
            ['2026-11-01', '2026-11-01'],
            'No frozen module-level today'
        )

        const localNow = new Date(2026, 9, 8, 10, 15, 30)
        const paid = getDatePresets('past', undefined, localNow)
        assert.equal(
            paid.find((p) => p.key === 'days-before' && p.count === 7)?.value,
            '2026-10-01'
        )
        assert.equal(
            filterDatePresets(paid, undefined, '2026-10-08').some((p) => p.key === 'tomorrow'),
            false
        )
        const bill = getDatePresets('future', undefined, localNow)
        assert.equal(bill.find((p) => p.key === 'days-after' && p.count === 7)?.value, '2026-10-15')
        assert.equal(
            filterDatePresets(bill, '2026-10-08').some((p) => p.key === 'yesterday'),
            false
        )
        assert.equal(
            filterDatePresets(bill, undefined, '2026-10-09').some((p) => p.key === 'days-after'),
            false
        )
        const base = '2026-01-31 12:15:30'
        const expiry = getDateTimePresets(base, localNow)
        assert.equal(expiry.find((p) => p.key === 'one-month')?.value, '2026-02-28 12:15:30')
        assert.equal(expiry.find((p) => p.key === 'three-months')?.value, '2026-04-30 12:15:30')
        assert.equal(expiry.find((p) => p.key === 'one-year')?.value, '2027-01-31 12:15:30')
        assert.equal(expiry[0].value, '2026-10-08 23:59:59')
        assert.equal(expiry.find((p) => p.key === 'year-2099')?.value, '2099-10-08 10:15:30')
        assert.equal(
            getDateTimePresets('2024-01-31 05:06:07', localNow).find((p) => p.key === 'one-month')
                ?.value,
            '2024-02-29 05:06:07'
        )
        assert.equal(
            getDateTimePresets('2026-03-07 12:15:30', localNow).find(
                (p) => p.key === 'days-after' && p.count === 7
            )?.value,
            '2026-03-14 12:15:30',
            'DST must not shift the chosen clock time'
        )
    }
} finally {
    if (originalTimezone === undefined) delete process.env.TZ
    else process.env.TZ = originalTimezone
}
const custom = [
    { value: 'invalid' },
    { value: null },
    { value: ['2026-10-08', null] },
    { value: '2026-10-08' }
]
const unchanged = structuredClone(custom)
assert.deepEqual(filterDatePresets(custom), [{ value: '2026-10-08' }])
assert.deepEqual(custom, unchanged)
assert.deepEqual(
    filterDatePresets([{ value: '2026-10-08' }], undefined, undefined, () => true),
    []
)
assert.equal(toUtcCalendarBound('invalid'), undefined)
assert.equal(toUtcCalendarBound(null), undefined)

const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]
    )
const callers: string[] = []
for (const file of walk('src').filter((file) => /\.tsx?$/.test(file))) {
    const source = readFileSync(file, 'utf8')
    if (
        /src\/shared\/ui\/date-time-picker\//.test(file) ||
        file.endsWith('theme/overrides/inputs.ts')
    )
        continue
    for (const match of source.matchAll(/import\s+\{([^}]+)\}\s+from\s+['"]@mantine\/dates['"]/g)) {
        assert.ok(
            !/\b(DatePicker|DatePickerInput|DateTimePicker)\b/.test(match[1]),
            `Picker bypasses the common quick sidebar: ${file}`
        )
    }
    if (/<(DatePicker|DatePickerInput|DateTimePicker)\b/.test(source)) {
        assert.ok(source.includes("from '@shared/ui/date-time-picker'"), file)
        callers.push(file)
    }
}
assert.equal(callers.length, 16, 'Every current picker entry must use the shared component')
for (const language of ['en', 'zh', 'ru', 'fa']) {
    const labels = JSON.parse(readFileSync(`public/locales/${language}/remnawave.json`, 'utf8'))[
        'date-picker-presets'
    ]
    assert.equal(Object.keys(labels).length, 12)
    for (const key of getRangePresets()
        .concat(getDatePresets() as any, getDateTimePresets() as any)
        .map((p) => p.key))
        assert.ok(labels[key], `${language}: ${key}`)
}
console.log(
    'PASS date quick presets: all 16 entries, 4 locales, UTC inclusive ranges, bounds, expiry base/time, leap years, DST, fresh today and immutable custom presets'
)
