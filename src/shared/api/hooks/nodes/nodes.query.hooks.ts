import { createQueryKeys } from '@lukemorales/query-key-factory'
import {
    GetNodeMetadataCommand,
    GetNodeCommand,
    GetNodeSecretKeyCommand,
    GetNodesTagsCommand,
    GetNodesCommand
} from '@remnawave/backend-contract'
import { keepPreviousData } from '@tanstack/react-query'
import { z } from 'zod'

import { sToMs } from '@shared/utils/time-utils'

import { createGetQueryHook, errorHandler } from '../../tsq-helpers'

const GetNodeResponseSchema = GetNodeCommand.ResponseSchema.extend({
    response: GetNodeCommand.ResponseSchema.shape.response.extend({
        usageSnapshot: z
            .object({
                receivedThrough: z.number().int().nonnegative(),
                appliedThrough: z.number().int().nonnegative(),
                pending: z.number().int().nonnegative(),
                queueBytes: z.number().int().nonnegative(),
                capturing: z.boolean().default(true),
                ingestSuccesses: z.number().int().nonnegative().default(0),
                ingestFailures: z.number().int().nonnegative().default(0),
                databaseRetries: z.number().int().nonnegative().default(0),
                lastCapturedAt: z
                    .string()
                    .datetime()
                    .transform((value) => new Date(value))
                    .nullable(),
                lastSuccessAt: z
                    .string()
                    .datetime()
                    .transform((value) => new Date(value))
                    .nullable()
                    .default(null),
                lastDurationMs: z.number().int().nonnegative().nullable().default(null),
                lastError: z.string().nullable()
            })
            .nullable()
            .optional()
    })
})

export const nodesQueryKeys = createQueryKeys('nodes', {
    getAllNodes: {
        queryKey: null
    },
    getNode: (route: GetNodeCommand.RequestParam) => ({
        queryKey: [route]
    }),
    getNodeForwarding: (route: { uuid: string }) => ({
        queryKey: ['forwarding', route]
    }),
    getNodeSecretKey: {
        queryKey: null
    },
    getAllTags: {
        queryKey: null
    },
    getNodeMetadata: (route: GetNodeMetadataCommand.RequestParams) => ({
        queryKey: [route]
    })
})

export const useGetNodes = createGetQueryHook({
    endpoint: GetNodesCommand.TSQ_url,
    responseSchema: GetNodesCommand.ResponseSchema,
    getQueryKey: () => nodesQueryKeys.getAllNodes.queryKey,
    rQueryParams: {
        refetchOnMount: true,
        staleTime: sToMs(5)
    },
    errorHandler: (error) => errorHandler(error, 'Get All Nodes')
})

export const useGetNode = createGetQueryHook({
    endpoint: GetNodeCommand.TSQ_url,
    responseSchema: GetNodeResponseSchema,
    routeParamsSchema: GetNodeCommand.RequestParamSchema,
    getQueryKey: ({ route }) => nodesQueryKeys.getNode(route!).queryKey,
    rQueryParams: {
        refetchOnMount: true,
        staleTime: sToMs(5),
        refetchInterval: sToMs(5)
    },
    errorHandler: (error) => errorHandler(error, 'Get Node')
})
export const useGetNodeSecretKey = createGetQueryHook({
    endpoint: GetNodeSecretKeyCommand.TSQ_url,
    responseSchema: GetNodeSecretKeyCommand.ResponseSchema,
    getQueryKey: () => nodesQueryKeys.getNodeSecretKey.queryKey,
    rQueryParams: {
        placeholderData: keepPreviousData,
        refetchOnMount: true,
        staleTime: sToMs(5),
        refetchInterval: sToMs(5)
    },

    errorHandler: (error) => errorHandler(error, 'Get PubKey')
})

export const useGetNodesTags = createGetQueryHook({
    endpoint: GetNodesTagsCommand.TSQ_url,
    responseSchema: GetNodesTagsCommand.ResponseSchema,
    getQueryKey: () => nodesQueryKeys.getAllTags.queryKey,
    rQueryParams: {
        staleTime: 0
    },
    errorHandler: (error) => errorHandler(error, 'Get All Nodes Tags')
})

export const useGetNodeMetadata = createGetQueryHook({
    endpoint: GetNodeMetadataCommand.TSQ_url,
    responseSchema: GetNodeMetadataCommand.ResponseSchema,
    routeParamsSchema: GetNodeMetadataCommand.RequestParamsSchema,
    getQueryKey: ({ route }) => nodesQueryKeys.getNodeMetadata(route!).queryKey,
    rQueryParams: {
        staleTime: sToMs(60)
    }
})
