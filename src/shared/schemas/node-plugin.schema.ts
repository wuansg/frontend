import { NodePluginEditorSchema as BaseNodePluginEditorSchema } from '@remnawave/node-plugins'
import { z } from 'zod'

const domainSchema = z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(253)
    .regex(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/)

const extSchema = z.string().startsWith('ext:')

export const SharedListConfigSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('ipList'),
        items: z.array(z.union([z.ipv4(), z.ipv6(), z.cidrv4(), z.cidrv6()])).max(4096)
    }),
    z.object({
        type: z.literal('asList'),
        items: z.array(z.number().int().min(1).max(4_294_967_295)).max(4096)
    }),
    z.object({
        type: z.literal('domainList'),
        items: z.array(domainSchema).max(4096)
    }),
    z.object({
        type: z.literal('portList'),
        items: z.array(z.number().int().min(1).max(65_535)).max(4096)
    })
])

const baseEgress = BaseNodePluginEditorSchema.shape.egressFilter.unwrap()

export const NodePluginEditorSchema = BaseNodePluginEditorSchema.extend({
    egressFilter: baseEgress
        .extend({
            blockedDomains: z.array(z.union([domainSchema, extSchema])).optional(),
            blockedPorts: z
                .array(z.union([z.number().int().min(1).max(65_535), extSchema]))
                .optional()
        })
        .optional()
})
