import '@mantine/core/styles.css'
import '@mantine/dates/styles.css'
import 'dayjs/locale/zh'
import { MantineProvider, Stack, Text } from '@mantine/core'
import { type DatesRangeValue } from '@mantine/dates'
import dayjs from 'dayjs'
import i18n from 'i18next'
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { initReactI18next, I18nextProvider } from 'react-i18next'

import labels from '../../public/locales/zh/remnawave.json'
import { theme } from '../../src/shared/constants/theme/theme'
import { DatePicker, DatePickerInput, DateTimePicker } from '../../src/shared/ui/date-time-picker'

await i18n.use(initReactI18next).init({
    lng: 'zh',
    defaultNS: 'remnawave',
    resources: { zh: { remnawave: labels } },
    interpolation: { escapeValue: false }
})

function Fixture() {
    const [range, setRange] = useState<DatesRangeValue<string>>([null, null])
    const [date, setDate] = useState<string | null>(null)
    const [expiry, setExpiry] = useState<string | null>('2026-11-30 12:15:30')
    const [bill, setBill] = useState<Date | null>(null)
    return (
        <MantineProvider theme={theme} forceColorScheme="dark">
            <I18nextProvider i18n={i18n}>
                <Stack p="sm" style={{ maxWidth: '100%' }}>
                    <DatePickerInput
                        label="Range fixture"
                        size="md"
                        type="range"
                        allowSingleDateInRange
                        dropdownType="modal"
                        value={range}
                        onChange={setRange}
                    />
                    <Text data-testid="range-value">{JSON.stringify(range)}</Text>
                    <DatePickerInput
                        label="Paid fixture"
                        presetDirection="past"
                        maxDate="2026-10-09"
                        value={date}
                        onChange={setDate}
                    />
                    <Text data-testid="date-value">{date}</Text>
                    <DateTimePicker
                        label="Expiry fixture"
                        dropdownType="modal"
                        minDate="2026-10-08"
                        presetBaseDate={expiry}
                        value={expiry}
                        onChange={setExpiry}
                    />
                    <Text data-testid="expiry-value">{expiry}</Text>
                    <DatePicker
                        value={bill}
                        onChange={(value) => setBill(value ? dayjs(value).toDate() : null)}
                        maxDate="2028-10-08"
                    />
                    <Text data-testid="bill-value">
                        {bill ? dayjs(bill).format('YYYY-MM-DD') : ''}
                    </Text>
                </Stack>
            </I18nextProvider>
        </MantineProvider>
    )
}
createRoot(document.getElementById('root')!).render(<Fixture />)
