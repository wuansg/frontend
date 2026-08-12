import { notifications } from '@mantine/notifications'
import { z } from 'zod'

import { createGetQueryHook, createMutationHook, errorHandler } from '../../tsq-helpers'
import { nodesQueryKeys } from './nodes.query.hooks'

export const NodeForwardingProtocolSchema = z.enum(['TCP', 'UDP', 'TCP_UDP'])
export const NodeForwardingRuleSchema = z.object({
    id: z.uuid(),
    name: z.string().trim().min(1).max(64),
    enabled: z.boolean(),
    protocol: NodeForwardingProtocolSchema,
    listenPort: z.number().int().min(1).max(65_535),
    targetAddress: z.ipv4(),
    targetPort: z.number().int().min(1).max(65_535)
})
export const NodeForwardingConfigSchema = z.object({
    enabled: z.boolean(),
    listenInterface: z
        .string()
        .trim()
        .min(1)
        .max(15)
        .regex(/^(auto|[a-zA-Z0-9_.-]+)$/),
    rules: z.array(NodeForwardingRuleSchema).max(64)
})
const CounterSchema = z.object({ packets: z.number(), bytes: z.number() })
const DirectionSchema = z.object({ upload: CounterSchema, download: CounterSchema })
export const NodeForwardingStatusSchema = z.object({
    state: z.enum([
        'disabled',
        'pending',
        'applied',
        'degraded',
        'error',
        'unsupported',
        'unreachable'
    ]),
    desiredHash: z.string().optional(),
    appliedHash: z.string().optional(),
    appliedAt: z.string().nullable().optional(),
    resolvedListenInterface: z.string().optional(),
    lastError: z.string().optional(),
    forwardingEnabled: z.boolean().optional(),
    firewallForwardPolicy: z.enum(['accept', 'drop', 'unknown']).optional(),
    rules: z
        .array(
            z.object({
                id: z.uuid(),
                tcp: DirectionSchema.optional(),
                udp: DirectionSchema.optional()
            })
        )
        .default([])
})

const RouteSchema = z.object({ uuid: z.uuid() })
const ResponseSchema = z.object({
    response: z.object({ config: NodeForwardingConfigSchema, status: NodeForwardingStatusSchema })
})

export type NodeForwardingConfig = z.infer<typeof NodeForwardingConfigSchema>
export type NodeForwardingStatus = z.infer<typeof NodeForwardingStatusSchema>

export const useGetNodeForwarding = createGetQueryHook({
    endpoint: '/api/nodes/:uuid/forwarding',
    responseSchema: ResponseSchema,
    routeParamsSchema: RouteSchema,
    getQueryKey: ({ route }) => nodesQueryKeys.getNodeForwarding(route!).queryKey,
    rQueryParams: { staleTime: 0, refetchInterval: 5000 },
    errorHandler: (error) => errorHandler(error, 'Get node forwarding')
})

export const useUpdateNodeForwarding = createMutationHook({
    endpoint: '/api/nodes/:uuid/forwarding',
    routeParamsSchema: RouteSchema,
    bodySchema: NodeForwardingConfigSchema,
    responseSchema: ResponseSchema,
    requestMethod: 'put',
    rMutationParams: {
        onSuccess: () =>
            notifications.show({
                color: 'teal',
                title: 'Forwarding',
                message: 'Forwarding configuration applied'
            }),
        onError: (error) =>
            notifications.show({
                color: 'red',
                title: 'Forwarding',
                message: error.message
            })
    }
})

export const useSyncNodeForwarding = createMutationHook({
    endpoint: '/api/nodes/:uuid/forwarding/actions/sync',
    routeParamsSchema: RouteSchema,
    responseSchema: ResponseSchema,
    requestMethod: 'post',
    rMutationParams: {
        onSuccess: () =>
            notifications.show({
                color: 'teal',
                title: 'Forwarding',
                message: 'Rules synchronized'
            }),
        onError: (error) =>
            notifications.show({ color: 'red', title: 'Forwarding', message: error.message })
    }
})
