# Shared date quick-selection sidebar (Frontend 3.16.1)

All 15 existing date/calendar inputs use the shared `DatePickerInput`,
`DatePicker` or `DateTimePicker` from `@shared/ui/date-time-picker`.
The native Mantine calendar remains responsible for manual selection,
keyboard interaction, clearing, modal/popover behavior, time entry and submit.
The shared theme makes the quick choices a scrollable **left** sidebar,
including narrow 320px screens. Do not import raw picker components in new
features; a regression test checks every current caller.

- Statistics/ranges: today, yesterday, current month, 3/7/14/30/60/90/180 days.
  Ranges include today and use the same UTC calendar days as existing API
  filters/defaults. The default max date is regenerated when opened, rather
  than freezing in the parent component. Existing default values stay today.
- Single billing dates: today/yesterday/tomorrow and relevant day/month/year
  offsets; paid-date inputs offer past-day offsets. Existing date bounds remain
  enforced. Date-only values do not introduce a timezone shift in billing APIs.
- Expiry: end of today, +7/14/30/90/180 days, +1/+3 months, +1 year, 2099.
  Extensions preserve the existing selected expiry base and its clock time.
  Month/year arithmetic continues to clamp month ends via Day.js.
- Invalid/out-of-bounds custom quick choices are filtered; ordinary calendar
  constraints, labels, formats, refs, handlers, form keys and values are kept.
- Labels are translated in English, Chinese, Russian and Persian, with normal
  English fallback for other languages. The sidebar uses logical CSS spacing.
- Opening, focusing or entering a calendar refreshes time-dependent choices.
  UTC/local midnight timers also refresh already-open/inline calendars. They
  are cleaned up on unmount.

`npm run test:date-presets` verifies all callers, locales, inclusive UTC ranges,
constraints, month ends/leap years, DST, expiry base/time and immutable custom
presets. `scripts/test-date-picker-ui.cjs` exercises actual components using a
loopback-only fixture and Playwright Core at desktop/390px/320px widths. It
checks sidebar position, overflow, range/date/datetime choices, preserving
expiry time and reopening long-lived tabs after a day changes. The fixture is
not part of the production build. CI is Linux x64 only.
