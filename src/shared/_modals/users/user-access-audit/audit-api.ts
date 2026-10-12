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
    enabledUntil: z.string().nullable().optional(),
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
export const auditSummary = z.object({
    connections: bytes,
    targets: bytes,
    users: bytes,
    nodes: bytes,
    partial: bytes,
    upload: bytes,
    download: bytes
})
export type AuditRecord = z.infer<typeof auditRecord>
export type AuditDomain = z.infer<typeof auditDomains>[number]
export type AuditFilter = {
    userId?: number
    start: string
    end: string
    nodeUuid?: string
    domain?: string
    cursor?: string
    direction?: 'total' | 'upload' | 'download'
}
export const auditAPI = {
    policy: async (userId: number) =>
        auditPolicy.parse(
            (await instance.get(`/api/access-audit/users/${userId}/policy`)).data.response
        ),
    set: async (
        userId: number,
        enabled: boolean,
        retentionDays: number,
        enabledUntil?: string | null
    ) =>
        auditPolicy.parse(
            (
                await instance.put(`/api/access-audit/users/${userId}/policy`, {
                    enabled,
                    retentionDays,
                    ...(enabledUntil !== undefined ? { enabledUntil } : {})
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
        ),
    summary: async (params: AuditFilter) =>
        auditSummary.parse(
            (await instance.get('/api/access-audit/summary', { params })).data.response
        ),
    export: async (params: AuditFilter): Promise<Blob> => {
        try {
            return (
                await instance.get('/api/access-audit/export', { params, responseType: 'blob' })
            ).data as Blob
        } catch (error) {
            const data = (error as { response?: { data?: unknown } }).response?.data
            if (data instanceof Blob) {
                try {
                    const body = JSON.parse(await data.text()) as { message?: unknown }
                    if (typeof body.message === 'string') throw new Error(body.message)
                } catch (parsed) {
                    if (parsed instanceof Error && !(parsed instanceof SyntaxError)) throw parsed
                }
            }
            throw error
        }
    }
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
