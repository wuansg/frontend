import { z } from 'zod'

import { instance } from '@shared/api/axios'

// Standalone Frontend wire adapter; sensitive records never enter user/usage caches.
const bytes = z.string().regex(/^(0|[1-9][0-9]*)$/)
export const auditRecord = z.object({
    id: z.string(),
    userId: z.number(),
    username: z.string(),
    nodeUuid: z.string(),
    nodeName: z.string(),
    domain: z.string(),
    destinationIp: z.string(),
    destinationPort: z.number(),
    inbound: z.string(),
    network: z.string(),
    protocol: z.string(),
    startedAt: z.string(),
    observedAt: z.string(),
    closedAt: z.string().nullable(),
    upload: bytes,
    download: bytes,
    partial: z.boolean()
})
export const auditPolicy = z.object({
    enabled: z.boolean(),
    retentionDays: z.number(),
    enabledAt: z.string().nullable(),
    nodes: z.array(
        z.object({
            uuid: z.string(),
            name: z.string(),
            connected: z.boolean(),
            mode: z.string(),
            supported: z.boolean(),
            syncedAt: z.string().nullable(),
            lastError: z.string().nullable(),
            status: z.object({
                capturing: z.boolean().optional(),
                dropped: z.number().optional(),
                expiresAt: z.string().optional(),
                lastError: z.string().optional()
            })
        })
    )
})
export const auditDomains = z.array(
    z.object({
        domain: z.string(),
        destinationIp: z.string(),
        connections: z.number(),
        upload: bytes,
        download: bytes
    })
)
export const auditRecords = z.object({
    records: z.array(auditRecord),
    nextCursor: z.string().nullable()
})
export type AuditFilter = {
    userId?: number
    start: string
    end: string
    nodeUuid?: string
    domain?: string
    cursor?: string
}
export const auditAPI = {
    policy: async (userId: number) =>
        auditPolicy.parse(
            (await instance.get(`/api/access-audit/users/${userId}/policy`)).data.response
        ),
    set: async (userId: number, enabled: boolean, retentionDays: number) =>
        auditPolicy.parse(
            (
                await instance.put(`/api/access-audit/users/${userId}/policy`, {
                    enabled,
                    retentionDays
                })
            ).data.response
        ),
    records: async (params: AuditFilter) =>
        auditRecords.parse(
            (await instance.get('/api/access-audit/records', { params })).data.response
        ),
    domains: async (params: AuditFilter) =>
        auditDomains.parse(
            (await instance.get('/api/access-audit/domains', { params })).data.response
        )
}
export function formatAuditBytes(value: string): string {
    const n = BigInt(value)
    let scale = 1n
    let unit = 0
    const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB']
    while (unit < units.length - 1 && n >= scale * 1024n) {
        scale *= 1024n
        unit++
    }
    return unit === 0 ? `${n} B` : `${Number((n * 100n) / scale) / 100} ${units[unit]}`
}
