import { notifications } from '@mantine/notifications'
import {
    GetNodeForwardingCommand,
    GetNodeForwardingUsageCommand,
    NodeForwardingConfigSchema,
    SyncNodeForwardingCommand,
    UpdateNodeForwardingCommand
} from '@remnawave/backend-contract'

import { createGetQueryHook, createMutationHook, errorHandler } from '../../tsq-helpers'
import { nodesQueryKeys } from './nodes.query.hooks'

export { NodeForwardingConfigSchema }
export type {
    NodeForwardingConfig,
    NodeForwardingRuntimeStatus as NodeForwardingStatus
} from '@remnawave/backend-contract'

export type NodeForwardingUsage = GetNodeForwardingUsageCommand.Response['response']

export const useGetNodeForwarding = createGetQueryHook({
    endpoint: GetNodeForwardingCommand.TSQ_url,
    responseSchema: GetNodeForwardingCommand.ResponseSchema,
    routeParamsSchema: GetNodeForwardingCommand.RequestParamSchema,
    getQueryKey: ({ route }) => nodesQueryKeys.getNodeForwarding(route!).queryKey,
    rQueryParams: { staleTime: 0, refetchInterval: 5000 },
    errorHandler: (error) => errorHandler(error, 'Get node forwarding')
})

export const useGetNodeForwardingUsage = createGetQueryHook({
    endpoint: GetNodeForwardingUsageCommand.TSQ_url,
    responseSchema: GetNodeForwardingUsageCommand.ResponseSchema,
    requestQuerySchema: GetNodeForwardingUsageCommand.RequestQuerySchema,
    routeParamsSchema: GetNodeForwardingUsageCommand.RequestParamSchema,
    getQueryKey: ({ route, query }) =>
        nodesQueryKeys.getNodeForwardingUsage({ ...route!, ...query! } as {
            uuid: string
            start: string
            end: string
        }).queryKey,
    rQueryParams: { staleTime: 15_000, refetchInterval: 30_000 },
    errorHandler: (error) => errorHandler(error, 'Get node forwarding usage')
})

export const useUpdateNodeForwarding = createMutationHook({
    endpoint: UpdateNodeForwardingCommand.TSQ_url,
    routeParamsSchema: UpdateNodeForwardingCommand.RequestParamSchema,
    bodySchema: UpdateNodeForwardingCommand.RequestBodySchema,
    responseSchema: UpdateNodeForwardingCommand.ResponseSchema,
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
    endpoint: SyncNodeForwardingCommand.TSQ_url,
    routeParamsSchema: SyncNodeForwardingCommand.RequestParamSchema,
    responseSchema: SyncNodeForwardingCommand.ResponseSchema,
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
