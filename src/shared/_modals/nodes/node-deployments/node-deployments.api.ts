import { z } from 'zod'

import { instance } from '@shared/api/axios'
const revision = z.object({
    uuid: z.string(),
    profileUuid: z.string(),
    templateHash: z.string(),
    inboundTags: z.array(z.string()),
    changedSections: z.array(z.string()),
    createdAt: z.string()
})
const deployment = z.object({
    uuid: z.string(),
    revisionUuid: z.string().nullable(),
    batchUuid: z.string().nullable(),
    actorUuid: z.string().nullable(),
    reason: z.string(),
    state: z.string(),
    requestedHash: z.string().nullable(),
    activeHash: z.string().nullable(),
    errorCode: z.string().nullable(),
    rollback: z.string().nullable(),
    startedAt: z.string(),
    finishedAt: z.string().nullable(),
    durationMs: z.number().nullable()
})
const history = z.object({
    nodeUuid: z.string(),
    state: z
        .object({
            requestedSeq: z.string(),
            processedSeq: z.string(),
            pinnedRevisionUuid: z.string().nullable(),
            appliedRevisionUuid: z.string().nullable(),
            blocked: z.boolean(),
            reason: z.string(),
            attempts: z.number(),
            lastError: z.string().nullable(),
            applying: z.boolean()
        })
        .nullable(),
    revisions: z.array(revision),
    deployments: z.array(deployment),
    batches: z.array(
        z.object({
            uuid: z.string(),
            state: z.string(),
            nodeUuids: z.array(z.string()),
            nextIndex: z.number(),
            activeNodeUuid: z.string().nullable(),
            errorCode: z.string().nullable(),
            createdAt: z.string(),
            finishedAt: z.string().nullable()
        })
    ),
    eligibleNodes: z.array(
        z.object({ uuid: z.string(), name: z.string(), isConnected: z.boolean() })
    )
})
export const nodeDeploymentsAPI = {
    history: async (uuid: string) =>
        history.parse((await instance.get(`/api/node-deployments/nodes/${uuid}`)).data.response),
    rollback: async (uuid: string, revisionUuid: string) =>
        instance.post(`/api/node-deployments/nodes/${uuid}/rollback`, { revisionUuid }),
    resume: async (uuid: string) => instance.post(`/api/node-deployments/nodes/${uuid}/resume`),
    batch: async (nodeUuids: string[], canaryUuid: string) =>
        instance.post('/api/node-deployments/batches', { nodeUuids, canaryUuid }),
    cancel: async (uuid: string) => instance.post(`/api/node-deployments/batches/${uuid}/cancel`)
}
