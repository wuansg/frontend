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

## Production rollout — 2026-10-08

- Frontend 3.16.1 runtime source: `9d82d0692d4b06a287f8b6e6576f62ffb6716253`.
  CI-only follow-up `73046f3688fb43e54a197e48cb199f4ea162662d` pins the fixture
  server port; it does not change the runtime assets embedded in the image.
- Panel image 3.17.6-anytls, backend release source:
  `9cd3eb6c07bf0bd52720d8a96fb69aff5fb1b390`. Backend business logic is unchanged.
  The production Compose entry is pinned to
  `ghcr.io/wuansg/backend:3.17.6-anytls@sha256:7fa6e871f819fa5e62f422d7e206483a432b05e85f6d83e02bb8c0be70e8ce22`.
- GitHub image build [37727473213](https://github.com/wuansg/backend/actions/runs/37727473213)
  and date-picker regression [37727768921](https://github.com/wuansg/frontend/actions/runs/37727768921)
  passed before deployment. Regression includes unit/traffic tests, typecheck,
  production build and actual browser interactions at 1280px, 390px and 320px.
- Deployed on HostDZire SG at 04:36 UTC. Full API readiness, public HTTP 200,
  image/source metadata, served quick-picker bundle/CSS and Chinese locale
  checks passed; the panel container had zero restarts.
- All 13 agents remain on 3.15.0 / sing-box 1.14.0, with unchanged profiles,
  core/inbound/plugin/forwarding configuration hashes and healthy snapshots.
  No agents were recreated and no hardware/network tests were triggered.
- All 13 node quota deltas exactly match the new core plus forwarding usage
  since the pre-upgrade snapshot. Reset boundaries are unchanged, confirming
  no repeated forwarding-history backfill. API counters match the database;
  existing Telegram daily report records are unchanged.
- Compose, environment and database backups are retained under
  `/opt/remnawave/backups/release-3.17.6-20261008/`; the previous 3.17.5 image
  remains available. The environment and application secret were not changed.
