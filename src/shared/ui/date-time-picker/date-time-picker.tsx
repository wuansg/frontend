import {
    DatePicker as MantineDatePicker,
    DatePickerInput as MantineDatePickerInput,
    DateTimePicker as MantineDateTimePicker,
    type DatePickerInputProps,
    type DatePickerPreset,
    type DatePickerProps,
    type DatePickerType,
    type DateTimePickerProps
} from '@mantine/dates'
import { useEffect, useState, type Ref } from 'react'
import { useTranslation } from 'react-i18next'

import {
    filterDatePresets,
    getDatePresets,
    getDateTimePresets,
    getRangePresets,
    toUtcCalendarBound,
    type PresetDate,
    type PresetDirection,
    type QuickDatePreset
} from './date-presets'

interface QuickPickerOptions {
    presetBaseDate?: PresetDate
    presetDirection?: PresetDirection
}

function useQuickPresets() {
    const { t, i18n } = useTranslation()
    const [, refreshClock] = useState(0)
    const now = new Date()
    const refresh = () => refreshClock((value) => value + 1)
    const localDay = now.toDateString()
    const utcDay = now.toISOString().slice(0, 10)
    useEffect(() => {
        // Also refresh an already-open/inline calendar at either day boundary.
        const current = new Date()
        const nextLocal = new Date(current)
        nextLocal.setHours(24, 0, 0, 0)
        const nextUtc = new Date(current)
        nextUtc.setUTCHours(24, 0, 0, 0)
        const timer = setTimeout(
            () => refreshClock((value) => value + 1),
            Math.min(+nextLocal, +nextUtc) - +current + 50
        )
        return () => clearTimeout(timer)
    }, [localDay, utcDay])
    const label = <Value,>(presets: QuickDatePreset<Value>[]) =>
        presets.map((preset) => ({
            value: preset.value,
            label: t(`date-picker-presets.${preset.key}`, { count: preset.count })
        }))
    return { now, refresh, label, locale: i18n.language }
}

/** Common date input: all current/future callers receive the same left sidebar. */
export function DatePickerInput<Type extends DatePickerType = 'default'>(
    props: DatePickerInputProps<Type> & QuickPickerOptions & { ref?: Ref<HTMLButtonElement> }
) {
    const { presetBaseDate, presetDirection, presets, onClickCapture, onFocusCapture, ...native } =
        props
    const quick = useQuickPresets()
    const range = props.type === 'range'
    const minDate = range ? toUtcCalendarBound(props.minDate) : props.minDate
    const maxDate = range ? toUtcCalendarBound(props.maxDate ?? quick.now) : props.maxDate
    const generated = range
        ? quick.label(getRangePresets(quick.now))
        : quick.label(getDatePresets(presetDirection, presetBaseDate, quick.now))
    return (
        <MantineDatePickerInput<Type>
            {...native}
            locale={props.locale ?? quick.locale}
            minDate={minDate}
            maxDate={maxDate}
            presets={filterDatePresets(
                presets ?? (generated as DatePickerPreset<Type>[]),
                minDate,
                maxDate,
                props.excludeDate
            )}
            onClickCapture={(event) => {
                quick.refresh()
                onClickCapture?.(event)
            }}
            onFocusCapture={(event) => {
                quick.refresh()
                onFocusCapture?.(event)
            }}
        />
    )
}

export function DateTimePicker<Type extends DatePickerType = 'default'>(
    props: DateTimePickerProps<Type> & QuickPickerOptions & { ref?: Ref<HTMLButtonElement> }
) {
    const {
        presetBaseDate,
        presetDirection: _direction,
        presets,
        onClickCapture,
        onFocusCapture,
        ...native
    } = props
    const quick = useQuickPresets()
    const generated =
        props.type === 'range'
            ? quick.label(getRangePresets(quick.now))
            : quick.label(getDateTimePresets(presetBaseDate, quick.now))
    return (
        <MantineDateTimePicker<Type>
            {...native}
            locale={props.locale ?? quick.locale}
            presets={filterDatePresets(
                presets ?? (generated as DatePickerPreset<Type>[]),
                props.minDate,
                props.maxDate,
                props.excludeDate
            )}
            onClickCapture={(event) => {
                quick.refresh()
                onClickCapture?.(event)
            }}
            onFocusCapture={(event) => {
                quick.refresh()
                onFocusCapture?.(event)
            }}
        />
    )
}

export function DatePicker<Type extends DatePickerType = 'default'>(
    props: DatePickerProps<Type> & QuickPickerOptions & { ref?: Ref<HTMLDivElement> }
) {
    const { presetBaseDate, presetDirection, presets, onMouseEnter, onFocusCapture, ...native } =
        props
    const quick = useQuickPresets()
    const generated =
        props.type === 'range'
            ? quick.label(getRangePresets(quick.now))
            : quick.label(getDatePresets(presetDirection, presetBaseDate, quick.now))
    return (
        <MantineDatePicker<Type>
            {...native}
            locale={props.locale ?? quick.locale}
            presets={filterDatePresets(
                presets ?? (generated as DatePickerPreset<Type>[]),
                props.minDate,
                props.maxDate,
                props.excludeDate
            )}
            onMouseEnter={(event) => {
                quick.refresh()
                onMouseEnter?.(event)
            }}
            onFocusCapture={(event) => {
                quick.refresh()
                onFocusCapture?.(event)
            }}
        />
    )
}
