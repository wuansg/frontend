const DAY_MS = 24 * 60 * 60 * 1000

export interface NodeTrafficBudgetInput {
    isTrafficTrackingActive: boolean
    trafficLimitBytes?: number | null
    trafficResetDay?: number | null
    trafficUsedBytes?: number | null
}

export function getNodeTrafficBudget(node: NodeTrafficBudgetInput, now = new Date()) {
    const limit = node.trafficLimitBytes
    const resetDay = node.trafficResetDay ?? 1

    if (
        !node.isTrafficTrackingActive ||
        typeof limit !== 'number' ||
        !Number.isFinite(limit) ||
        limit <= 0 ||
        !Number.isInteger(resetDay) ||
        resetDay < 1 ||
        resetDay > 31 ||
        !Number.isFinite(now.getTime())
    ) {
        return null
    }

    // Match the monthly reset schedule, including reset days absent in short months.
    // UTC calendar days avoid browser timezone and daylight-saving differences.
    const year = now.getUTCFullYear()
    const month = now.getUTCMonth()
    const today = Date.UTC(year, month, now.getUTCDate())
    const resetAt = (offset: number) => {
        const lastDay = new Date(Date.UTC(year, month + offset + 1, 0)).getUTCDate()
        return Date.UTC(year, month + offset, Math.min(resetDay, lastDay))
    }

    const currentReset = resetAt(0)
    const start = today >= currentReset ? currentReset : resetAt(-1)
    const end = today >= currentReset ? resetAt(1) : currentReset
    const cycleDays = Math.round((end - start) / DAY_MS)
    const elapsedDays = Math.round((today - start) / DAY_MS) + 1
    // The reference includes today's full daily allowance, not a partial-hour forecast.
    const expectedPercentage = (elapsedDays / cycleDays) * 100
    const expectedBytes = limit * (elapsedDays / cycleDays)
    const used = node.trafficUsedBytes
    const actualBytes = typeof used === 'number' && Number.isFinite(used) ? Math.max(0, used) : 0
    const differenceBytes = actualBytes - expectedBytes
    const tolerance = Math.max(1, expectedBytes * Number.EPSILON * 8)
    const status: 'ahead' | 'behind' | 'on-track' =
        differenceBytes > tolerance ? 'ahead' : differenceBytes < -tolerance ? 'behind' : 'on-track'

    return {
        cycleStart: new Date(start),
        cycleEnd: new Date(end),
        cycleDays,
        elapsedDays,
        dailyBytes: limit / cycleDays,
        expectedBytes,
        expectedPercentage,
        differenceBytes,
        status
    }
}
