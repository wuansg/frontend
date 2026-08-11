import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

interface DefaultDateRange {
    end: string
    start: string
}

/**
 * Builds the default date range (last `days` UTC days, ending today) as
 * `YYYY-MM-DD` strings. The default is the current UTC day only.
 *
 * Must be called at component mount (e.g. from a lazy `useState` initializer),
 * NOT stored in a module-level `const`. A top-level const evaluates `dayjs()`
 * once when the bundle is first parsed, so a long-lived tab/PWA freezes "today"
 * at the day it was opened — making the range silently drift further into the
 * past the longer the page stays open.
 */
export const getDefaultDateRange = (days = 1): DefaultDateRange => ({
    start: dayjs
        .utc()
        .subtract(days - 1, 'day')
        .format('YYYY-MM-DD'),
    end: dayjs.utc().format('YYYY-MM-DD')
})
