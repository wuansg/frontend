import { createQueryKeys } from '@lukemorales/query-key-factory'
import {
    GetLegacyStatsNodeUserUsageCommand,
    GetLegacyStatsUserUsageCommand,
    GetStatsNodesUsageCommand,
    GetStatsNodesUsersUsageCommand,
    GetStatsNodeUsersUsageCommand,
    GetStatsUserUsageCommand
} from '@remnawave/backend-contract'
import { z } from 'zod'

import { sToMs } from '@shared/utils/time-utils'

import { createBodyQueryHook, createGetQueryHook, errorHandler } from '../../tsq-helpers'

const GetStatsUserHostsUsageRequestSchema = z.object({
    uuid: z.string().uuid()
})

const GetStatsHostUsersUsageRequestSchema = z.object({
    uuid: z.string().uuid()
})

const GetStatsUserHostsUsageRequestQuerySchema = z.object({
    start: z.string().date(),
    end: z.string().date(),
    topHostsLimit: z.coerce.number().min(1).default(20)
})

const GetStatsHostUsersUsageRequestQuerySchema = z.object({
    start: z.string().date(),
    end: z.string().date(),
    topUsersLimit: z.coerce.number().min(1).default(100)
})

type GetStatsUserHostsUsageRequest = z.infer<typeof GetStatsUserHostsUsageRequestSchema>
type GetStatsUserHostsUsageRequestQuery = z.infer<typeof GetStatsUserHostsUsageRequestQuerySchema>
type GetStatsHostUsersUsageRequest = z.infer<typeof GetStatsHostUsersUsageRequestSchema>
type GetStatsHostUsersUsageRequestQuery = z.infer<typeof GetStatsHostUsersUsageRequestQuerySchema>
type GetStatsHostsUsageRequestQuery = z.infer<typeof GetStatsUserHostsUsageRequestQuerySchema>

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
    getStatsHostsUsageCommand: (filters: GetStatsHostsUsageRequestQuery) => ({
        queryKey: [filters]
    }),
    getStatsUserUsageCommand: (
        query: GetStatsUserUsageCommand.Request & GetStatsUserUsageCommand.RequestQuery
    ) => ({
        queryKey: [query]
    }),
    getStatsUserHostsUsageCommand: (
        query: GetStatsUserHostsUsageRequest & GetStatsUserHostsUsageRequestQuery
    ) => ({
        queryKey: [query]
    }),
    getStatsHostUsersUsageCommand: (
        query: GetStatsHostUsersUsageRequest & GetStatsHostUsersUsageRequestQuery
    ) => ({
        queryKey: [query]
    }),
    getStatsNodeUsersUsageCommand: (
        query: GetStatsNodeUsersUsageCommand.Request & GetStatsNodeUsersUsageCommand.RequestQuery
    ) => ({
        queryKey: [query]
    }),
    getStatsNodesUsersUsageCommand: (
        params: GetStatsNodesUsersUsageCommand.Request & GetStatsNodesUsersUsageCommand.RequestQuery
    ) => ({
        queryKey: [params]
    }),
    getLegacyStatsUserUsageCommand: (
        query: GetLegacyStatsUserUsageCommand.Request & GetLegacyStatsUserUsageCommand.RequestQuery
    ) => ({
        queryKey: [query]
    }),
    getLegacyStatsNodeUserUsageCommand: (
        query: GetLegacyStatsNodeUserUsageCommand.Request &
            GetLegacyStatsNodeUserUsageCommand.RequestQuery
    ) => ({
        queryKey: [query]
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

export const useGetStatsHostsUsage = createGetQueryHook({
    endpoint: '/api/bandwidth-stats/hosts',
    responseSchema: GetStatsHostsUsageResponseSchema,
    requestQuerySchema: GetStatsUserHostsUsageRequestQuerySchema,
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
    getQueryKey: ({ route, query }) =>
        bandwidthStatsQueryKeys.getStatsUserUsageCommand({ ...route!, ...query! }).queryKey,
    rQueryParams: {
        staleTime: sToMs(30)
    },
    errorHandler: (error) => errorHandler(error, 'Get User Usage By Range')
})

export const useGetStatsUserHostsUsage = createGetQueryHook({
    endpoint: '/api/bandwidth-stats/users/:uuid/hosts',
    responseSchema: GetStatsHostsUsageResponseSchema,
    requestQuerySchema: GetStatsUserHostsUsageRequestQuerySchema,
    routeParamsSchema: GetStatsUserHostsUsageRequestSchema,
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
    bodySchema: GetStatsNodesUsersUsageCommand.RequestSchema,
    getQueryKey: ({ query, body }) =>
        bandwidthStatsQueryKeys.getStatsNodesUsersUsageCommand({ ...query!, ...body! }).queryKey,
    rQueryParams: {
        staleTime: sToMs(60)
    },
    errorHandler: (error) => errorHandler(error, 'Get Nodes Users Usage By Range')
})

export const useGetLegacyStatsNodeUserUsage = createGetQueryHook({
    endpoint: GetLegacyStatsNodeUserUsageCommand.TSQ_url,
    responseSchema: GetLegacyStatsNodeUserUsageCommand.ResponseSchema,
    requestQuerySchema: GetLegacyStatsNodeUserUsageCommand.RequestQuerySchema,
    routeParamsSchema: GetLegacyStatsNodeUserUsageCommand.RequestSchema,
    getQueryKey: ({ route, query }) =>
        bandwidthStatsQueryKeys.getLegacyStatsNodeUserUsageCommand({ ...route!, ...query! })
            .queryKey,
    rQueryParams: {
        staleTime: sToMs(60)
    },
    errorHandler: (error) => errorHandler(error, 'Get Node Users Usage By Range')
})

export const useGetLegacyStatsUserUsage = createGetQueryHook({
    endpoint: GetLegacyStatsUserUsageCommand.TSQ_url,
    responseSchema: GetLegacyStatsUserUsageCommand.ResponseSchema,
    requestQuerySchema: GetLegacyStatsUserUsageCommand.RequestQuerySchema,
    routeParamsSchema: GetLegacyStatsUserUsageCommand.RequestSchema,
    getQueryKey: ({ route, query }) =>
        bandwidthStatsQueryKeys.getLegacyStatsUserUsageCommand({ ...route!, ...query! }).queryKey,
    rQueryParams: {
        staleTime: sToMs(15)
    },
    errorHandler: (error) => errorHandler(error, 'Get User Usage By Range')
})
