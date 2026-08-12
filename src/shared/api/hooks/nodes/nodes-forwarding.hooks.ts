import { notifications } from '@mantine/notifications'
import {
    GetNodeForwardingCommand,
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

export const useGetNodeForwarding = createGetQueryHook({
    endpoint: GetNodeForwardingCommand.TSQ_url,
    responseSchema: GetNodeForwardingCommand.ResponseSchema,
    routeParamsSchema: GetNodeForwardingCommand.RequestParamSchema,
    getQueryKey: ({ route }) => nodesQueryKeys.getNodeForwarding(route!).queryKey,
    rQueryParams: { staleTime: 0, refetchInterval: 5000 },
    errorHandler: (error) => errorHandler(error, 'Get node forwarding')
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
