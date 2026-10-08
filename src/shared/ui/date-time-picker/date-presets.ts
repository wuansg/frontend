import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'

dayjs.extend(utc)

export type PresetDate = Date | string | null | undefined
export type PresetDirection = 'past' | 'future'
export interface QuickDatePreset<Value = string> {
    key:
        | 'today'
        | 'yesterday'
        | 'tomorrow'
        | 'current-month'
        | 'days'
        | 'days-before'
        | 'days-after'
        | 'one-month'
        | 'three-months'
        | 'one-year'
        | 'end-of-today'
        | 'year-2099'
    count?: number
    value: Value
}

const RANGE_DAYS = [3, 7, 14, 30, 60, 90, 180] as const
const FORWARD_DAYS = [7, 14, 30, 90, 180] as const

/** Statistics and the default range use UTC calendar days, including today. */
export function getRangePresets(now = new Date()): QuickDatePreset<[string, string]>[] {
    const today = dayjs.utc(now)
    const end = today.format('YYYY-MM-DD')
    const yesterday = today.subtract(1, 'day').format('YYYY-MM-DD')
    return [
        { key: 'today', value: [end, end] },
        { key: 'yesterday', value: [yesterday, yesterday] },
        { key: 'current-month', value: [today.startOf('month').format('YYYY-MM-DD'), end] },
        ...RANGE_DAYS.map((count) => ({
            key: 'days' as const,
            count,
            value: [today.subtract(count - 1, 'day').format('YYYY-MM-DD'), end] as [string, string]
        }))
    ]
}

/** Single billing dates have date-only semantics in the browser calendar. */
export function getDatePresets(
    direction: PresetDirection = 'future',
    baseDate?: PresetDate,
    now = new Date()
): QuickDatePreset[] {
    const today = dayjs(now)
    const base = baseDate && dayjs(baseDate).isValid() ? dayjs(baseDate) : today
    const format = (date: dayjs.Dayjs) => date.format('YYYY-MM-DD')
    return [
        { key: 'today', value: format(today) },
        { key: 'yesterday', value: format(today.subtract(1, 'day')) },
        { key: 'tomorrow', value: format(today.add(1, 'day')) },
        ...FORWARD_DAYS.map((count) => ({
            key: direction === 'past' ? ('days-before' as const) : ('days-after' as const),
            count,
            value: format(
                direction === 'past' ? today.subtract(count, 'day') : base.add(count, 'day')
            )
        })),
        ...(direction === 'future'
            ? [
                  { key: 'one-month' as const, value: format(base.add(1, 'month')) },
                  { key: 'three-months' as const, value: format(base.add(3, 'months')) },
                  { key: 'one-year' as const, value: format(base.add(1, 'year')) }
              ]
            : [])
    ]
}

/** Preserve the existing expiry-extension base and its selected time. */
export function getDateTimePresets(baseDate?: PresetDate, now = new Date()): QuickDatePreset[] {
    const today = dayjs(now)
    const base = baseDate && dayjs(baseDate).isValid() ? dayjs(baseDate) : today
    const format = (date: dayjs.Dayjs) => date.format('YYYY-MM-DD HH:mm:ss')
    return [
        { key: 'end-of-today', value: format(today.endOf('day')) },
        ...FORWARD_DAYS.map((count) => ({
            key: 'days-after' as const,
            count,
            value: format(base.add(count, 'day'))
        })),
        { key: 'one-month', value: format(base.add(1, 'month')) },
        { key: 'three-months', value: format(base.add(3, 'months')) },
        { key: 'one-year', value: format(base.add(1, 'year')) },
        { key: 'year-2099', value: format(today.year(2099)) }
    ]
}

export function toUtcCalendarBound(value: PresetDate): string | undefined {
    return value && dayjs.utc(value).isValid() ? dayjs.utc(value).format('YYYY-MM-DD') : undefined
}

/** Mantine preset buttons bypass calendar bounds; never offer invalid values. */
export function filterDatePresets<Preset extends { value: unknown }>(
    presets: readonly Preset[],
    minDate?: PresetDate,
    maxDate?: PresetDate,
    excludeDate?: (date: string) => boolean
): Preset[] {
    const min = minDate ? dayjs(minDate).format('YYYY-MM-DD') : undefined
    const max = maxDate ? dayjs(maxDate).format('YYYY-MM-DD') : undefined
    const valid = (date: unknown) => {
        if (typeof date !== 'string' || !dayjs(date).isValid()) return false
        const day = date.slice(0, 10)
        return (!min || day >= min) && (!max || day <= max) && !excludeDate?.(day)
    }
    return presets.filter(({ value }) => (Array.isArray(value) ? value.every(valid) : valid(value)))
}
