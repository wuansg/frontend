import { createQueryKeys } from '@lukemorales/query-key-factory'
import {
    GetStatsNodesUsageCommand,
    GetStatsNodesUsersUsageCommand,
    GetStatsNodeUsersUsageCommand,
    GetStatsUserHostsUsageCommand,
    GetStatsUsersUsageCommand,
    GetStatsUserUsageCommand,
    GetInternalSquadUsageCommand
} from '@remnawave/backend-contract'
import { z } from 'zod'

import { sToMs } from '@shared/utils/time-utils'

import {
    createBodyQueryHook,
    createGetInfiniteQueryHook,
    createGetQueryHook,
    errorHandler
} from '../../tsq-helpers'

const GetStatsHostUsersUsageRequestSchema = z.object({
    uuid: z.string().uuid()
})

const GetStatsHostUsersUsageRequestQuerySchema = z.object({
    start: z.string().date(),
    end: z.string().date(),
    topUsersLimit: z.coerce.number().min(1).default(100)
})

type GetStatsHostUsersUsageRequest = z.infer<typeof GetStatsHostUsersUsageRequestSchema>
type GetStatsHostUsersUsageRequestQuery = z.infer<typeof GetStatsHostUsersUsageRequestQuerySchema>
type GetStatsHostsUsageRequestQuery = GetStatsUserHostsUsageCommand.RequestQuery

const HostUsageMemberSchema = z.object({
    uuid: z.string().uuid(),
    remark: z.string(),
    address: z.string(),
    port: z.number()
})

const HostUsageItemSchema = z.object({
    uuid: z.string().uuid(),
    groupKey: z.string(),
    nodeUuid: z.string().uuid(),
    inboundTag: z.string(),
    color: z.string(),
    remark: z.string(),
    address: z.string(),
    port: z.number(),
    tag: z.string().nullable(),
    isShared: z.boolean(),
    hosts: z.array(HostUsageMemberSchema),
    total: z.number()
})

export const GetStatsHostsUsageResponseSchema = z.object({
    response: z.object({
        categories: z.array(z.string()),
        sparklineData: z.array(z.number()),
        topHosts: z.array(HostUsageItemSchema),
        series: z.array(
            HostUsageItemSchema.extend({
                data: z.array(z.number())
            })
        )
    })
})

export type GetStatsHostsUsageResponse = z.infer<typeof GetStatsHostsUsageResponseSchema>

export const bandwidthStatsQueryKeys = createQueryKeys('bandwidthStats', {
    getStatsNodesUsageCommand: (filters: GetStatsNodesUsageCommand.RequestQuery) => ({
        queryKey: [filters]
    }),
    getStatsUsersUsageCommand: (filters: GetStatsUsersUsageCommand.RequestQuery) => ({
        queryKey: [filters]
    }),
    getStatsHostsUsageCommand: (filters: GetStatsHostsUsageRequestQuery) => ({
        queryKey: [filters]
    }),
    getStatsUserUsageCommand: (
        query: GetStatsUserUsageCommand.RequestParam & GetStatsUserUsageCommand.RequestQuery
    ) => ({
        queryKey: [query]
    }),
    getStatsUserHostsUsageCommand: (
        query: GetStatsUserHostsUsageCommand.Request & GetStatsUserHostsUsageCommand.RequestQuery
    ) => ({
        queryKey: [query]
    }),
    getStatsHostUsersUsageCommand: (
        query: GetStatsHostUsersUsageRequest & GetStatsHostUsersUsageRequestQuery
    ) => ({
        queryKey: [query]
    }),
    getStatsNodeUsersUsageCommand: (
        query: GetStatsNodeUsersUsageCommand.RequestParam &
            GetStatsNodeUsersUsageCommand.RequestQuery
    ) => ({
        queryKey: [query]
    }),
    getStatsNodesUsersUsageCommand: (
        params: GetStatsNodesUsersUsageCommand.RequestBody &
            GetStatsNodesUsersUsageCommand.RequestQuery
    ) => ({
        queryKey: [params]
    }),
    getInternalSquadUsageCommand: (
        params: GetInternalSquadUsageCommand.RequestParam &
            GetInternalSquadUsageCommand.RequestQuery
    ) => ({
        queryKey: [params]
    })
})

export const useGetStatsNodesUsage = createGetQueryHook({
    endpoint: GetStatsNodesUsageCommand.TSQ_url,
    responseSchema: GetStatsNodesUsageCommand.ResponseSchema,
    requestQuerySchema: GetStatsNodesUsageCommand.RequestQuerySchema,
    getQueryKey: ({ query }) => bandwidthStatsQueryKeys.getStatsNodesUsageCommand(query!).queryKey,
    rQueryParams: {
        staleTime: sToMs(60)
    },
    errorHandler: (error) => errorHandler(error, 'Get Nodes Usage By Range')
})

export const useGetStatsUsersUsage = createGetQueryHook({
    endpoint: GetStatsUsersUsageCommand.TSQ_url,
    responseSchema: GetStatsUsersUsageCommand.ResponseSchema,
    requestQuerySchema: GetStatsUsersUsageCommand.RequestQuerySchema,
    getQueryKey: ({ query }) => bandwidthStatsQueryKeys.getStatsUsersUsageCommand(query!).queryKey,
    rQueryParams: {
        staleTime: sToMs(60)
    },
    errorHandler: (error) => errorHandler(error, 'Get Users Usage By Range')
})

export const useGetStatsHostsUsage = createGetQueryHook({
    endpoint: '/api/bandwidth-stats/hosts',
    responseSchema: GetStatsHostsUsageResponseSchema,
    requestQuerySchema: GetStatsUserHostsUsageCommand.RequestQuerySchema,
    getQueryKey: ({ query }) => bandwidthStatsQueryKeys.getStatsHostsUsageCommand(query!).queryKey,
    rQueryParams: {
        staleTime: sToMs(60)
    },
    errorHandler: (error) => errorHandler(error, 'Get Hosts Usage By Range')
})

export const useGetStatsUserUsage = createGetQueryHook({
    endpoint: GetStatsUserUsageCommand.TSQ_url,
    responseSchema: GetStatsUserUsageCommand.ResponseSchema,
    requestQuerySchema: GetStatsUserUsageCommand.RequestQuerySchema,
    routeParamsSchema: GetStatsUserUsageCommand.RequestParamSchema,
    getQueryKey: ({ route, query }) =>
        bandwidthStatsQueryKeys.getStatsUserUsageCommand({ ...route!, ...query! }).queryKey,
    rQueryParams: {
        staleTime: sToMs(30)
    },
    errorHandler: (error) => errorHandler(error, 'Get User Usage By Range')
})

export const useGetStatsUserHostsUsage = createGetQueryHook({
    endpoint: GetStatsUserHostsUsageCommand.TSQ_url,
    responseSchema: GetStatsUserHostsUsageCommand.ResponseSchema,
    requestQuerySchema: GetStatsUserHostsUsageCommand.RequestQuerySchema,
    routeParamsSchema: GetStatsUserHostsUsageCommand.RequestSchema,
    getQueryKey: ({ route, query }) =>
        bandwidthStatsQueryKeys.getStatsUserHostsUsageCommand({ ...route!, ...query! }).queryKey,
    rQueryParams: {
        staleTime: sToMs(30)
    },
    errorHandler: (error) => errorHandler(error, 'Get User Hosts Usage By Range')
})

export const useGetStatsHostUsersUsage = createGetQueryHook({
    endpoint: '/api/bandwidth-stats/hosts/:uuid/users',
    responseSchema: GetStatsNodeUsersUsageCommand.ResponseSchema,
    requestQuerySchema: GetStatsHostUsersUsageRequestQuerySchema,
    routeParamsSchema: GetStatsHostUsersUsageRequestSchema,
    getQueryKey: ({ route, query }) =>
        bandwidthStatsQueryKeys.getStatsHostUsersUsageCommand({ ...route!, ...query! }).queryKey,
    rQueryParams: {
        staleTime: sToMs(30)
    },
    errorHandler: (error) => errorHandler(error, 'Get Host Users Usage By Range')
})

export const useGetStatsNodeUsersUsage = createGetQueryHook({
    endpoint: GetStatsNodeUsersUsageCommand.TSQ_url,
    responseSchema: GetStatsNodeUsersUsageCommand.ResponseSchema,
    requestQuerySchema: GetStatsNodeUsersUsageCommand.RequestQuerySchema,
    routeParamsSchema: GetStatsNodeUsersUsageCommand.RequestParamSchema,
    getQueryKey: ({ route, query }) =>
        bandwidthStatsQueryKeys.getStatsNodeUsersUsageCommand({ ...route!, ...query! }).queryKey,
    rQueryParams: {
        staleTime: sToMs(60)
    },
    errorHandler: (error) => errorHandler(error, 'Get Node Users Usage By Range')
})

export const useGetStatsNodesUsersUsage = createBodyQueryHook({
    endpoint: GetStatsNodesUsersUsageCommand.TSQ_url,
    requestMethod: GetStatsNodesUsersUsageCommand.endpointDetails.REQUEST_METHOD,
    responseSchema: GetStatsNodesUsersUsageCommand.ResponseSchema,
    requestQuerySchema: GetStatsNodesUsersUsageCommand.RequestQuerySchema,
    bodySchema: GetStatsNodesUsersUsageCommand.RequestBodySchema,
    getQueryKey: ({ query, body }) =>
        bandwidthStatsQueryKeys.getStatsNodesUsersUsageCommand({ ...query!, ...body! }).queryKey,
    rQueryParams: {
        staleTime: sToMs(60)
    },
    errorHandler: (error) => errorHandler(error, 'Get Nodes Users Usage By Range')
})

export const useGetInternalSquadUsage = createGetQueryHook({
    endpoint: GetInternalSquadUsageCommand.TSQ_url,
    responseSchema: GetInternalSquadUsageCommand.ResponseSchema,
    requestQuerySchema: GetInternalSquadUsageCommand.RequestQuerySchema,
    routeParamsSchema: GetInternalSquadUsageCommand.RequestParamSchema,
    getQueryKey: ({ route, query }) =>
        bandwidthStatsQueryKeys.getInternalSquadUsageCommand({ ...route!, ...query! }).queryKey,
    rQueryParams: {
        staleTime: sToMs(60)
    },
    errorHandler: (error) => errorHandler(error, 'Get Internal Squad Users Usage By Range')
})

export const useGetInternalSquadUsageInfinite = createGetInfiniteQueryHook({
    endpoint: GetInternalSquadUsageCommand.TSQ_url,
    responseSchema: GetInternalSquadUsageCommand.ResponseSchema,
    requestQuerySchema: GetInternalSquadUsageCommand.RequestQuerySchema,
    routeParamsSchema: GetInternalSquadUsageCommand.RequestParamSchema,
    getQueryKey: ({ route, query }) => [
        ...bandwidthStatsQueryKeys.getInternalSquadUsageCommand({ ...route!, ...query! }).queryKey,
        'infinite'
    ],
    pageParamKey: 'cursor',
    initialPageParam: null,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : null),
    rQueryParams: {
        staleTime: sToMs(60),
        refetchOnMount: true
    },
    errorHandler: (error) => errorHandler(error, 'Get Internal Squad Usage (infinite)')
})
