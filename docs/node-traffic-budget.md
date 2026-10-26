# Node traffic budget reference

Node details and desktop/mobile node cards retain the actual usage bar and add a blue reference marker for cumulative daily allowance through today. Details also show how far actual usage is over or under that reference. Hovering, focusing or touching the bar shows the cycle, day count and daily allowance.

The calculation uses UTC calendar days, the configured monthly reset day (default 1), and the actual length of that cycle. A reset day absent from a month is clamped to its last day, matching the backend's monthly reset rule. Today's full allowance is included:

`expected bytes = quota × (days since cycle start + 1) / cycle days`

For example, on October 26 with a reset day of 1 and a 500 GiB quota, the reference is `500 × 26 / 31 = 419.35 GiB`. At 265.70 GiB used, the display shows 153.65 GiB under budget.

This is a scheduled-cycle budgeting reference, not a traffic counter or a rate limit. Manual counter resets do not change the scheduled cycle. Unlimited quotas, disabled traffic tracking and invalid quotas have no reference marker. The marker refreshes every minute and when a background tab becomes visible again.

## Verification

- `npm run test:node-traffic-budget` covers reset days 1–31 across 2024–2026, leap/short months, UTC and DST boundaries, deviations, invalid/unlimited inputs and all three card placements.
- `npm run typecheck` checks integration with the existing node contracts.
- With Vite serving on loopback, run `node scripts/test-node-traffic-budget-ui.cjs`. Set `NODE_BUDGET_TEST_URL`, `PLAYWRIGHT_CORE_PATH`, `CHROMIUM_PATH` and `NODE_BUDGET_SCREENSHOT_DIR` as needed. The isolated fixture has no production API access. Browser checks cover four widths, Chinese/English, dark/light, keyboard tooltips, actual-bar preservation and midnight/reset rollover.
- Run `node scripts/test-nodes-table-ui.cjs` against the real virtualized node list fixture. Set `NODES_TABLE_TEST_URL` and optionally `NODES_TABLE_SCREENSHOT_DIR`. It checks row spacing at seven viewport widths, mixed-height cards, changing budget captions, tag filters, scrolling to the last node, live desktop/mobile resizing, larger text and canceled/completed drag reordering. All API calls are intercepted; no production data is used or modified. Rows are measured with their bottom margins, so reference captions cannot overlap the next card.
