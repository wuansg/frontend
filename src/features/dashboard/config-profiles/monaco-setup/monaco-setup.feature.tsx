import { Monaco } from '@monaco-editor/react'
import {
    GetSnippetsCommand,
    HostMapperSchema,
    ResponseRulesConfigSchema,
    TSubscriptionTemplateType
} from '@remnawave/backend-contract'
import { NodePluginSchema } from '@remnawave/node-plugins'
import axios from 'axios'
import consola from 'consola'
import { app } from 'src/config'

import { monacoTheme } from '@shared/constants/monaco-theme'
import { registerJsonSchema } from '@shared/utils/monaco/json-schema-registry'

interface ISchemaNode {
    oneOf?: ISchemaNode[]
    properties?: Record<string, unknown>
}

const MAX_INBOUND_PATHS = 400
const MAX_INBOUND_DEPTH = 10
const MAX_INBOUND_VALUE_PREVIEW = 400

const collectInboundPaths = (
    value: unknown,
    prefix: string,
    depth: number,
    collected: Map<string, unknown>
) => {
    if (collected.size >= MAX_INBOUND_PATHS || depth > MAX_INBOUND_DEPTH) return
    if (value === null || typeof value !== 'object') return

    const entries = Array.isArray(value)
        ? value.map((item, index) => [String(index), item] as const)
        : Object.entries(value as Record<string, unknown>)

    for (const [key, child] of entries) {
        if (collected.size >= MAX_INBOUND_PATHS) return

        const path = prefix ? `${prefix}.${key}` : key
        collected.set(path, child)
        collectInboundPaths(child, path, depth + 1, collected)
    }
}

const injectInboundPaths = (schema: unknown, rawInbound: unknown) => {
    const collected = new Map<string, unknown>()
    collectInboundPaths(rawInbound, '', 0, collected)

    if (collected.size === 0) return

    const snippets = [...collected.entries()].map(([path, value]) => {
        const json = JSON.stringify(value, null, 2) ?? 'undefined'
        const preview =
            json.length > MAX_INBOUND_VALUE_PREVIEW
                ? `${json.slice(0, MAX_INBOUND_VALUE_PREVIEW)}\n…`
                : json

        return {
            label: path,
            body: path,
            markdownDescription: [
                'Current value in the inbound:',
                '',
                '```json',
                preview,
                '```'
            ].join('\n')
        }
    })

    const properties = (schema as { properties?: Record<string, { items?: ISchemaNode }> })
        .properties

    for (const client of ['singbox', 'mihomo', 'base64', 'xrayJson']) {
        for (const branch of properties?.[client]?.items?.oneOf ?? []) {
            const from = branch.properties?.from as Record<string, unknown> | undefined
            if (from) from.defaultSnippets = snippets
        }
    }
}

export const MonacoSetupFeature = {
    setup: async (
        monaco: Monaco,
        currentLanguage: string,
        snippets: GetSnippetsCommand.Response['response']['snippets']
    ) => {
        try {
            const snippetNames = snippets.map((s) => s.name)

            let { jsonSchemaUrl } = app.configEditor
            switch (currentLanguage) {
                case 'zh':
                    jsonSchemaUrl = app.configEditor.jsonSchemaCnUrl
                    break
                default:
                    jsonSchemaUrl = app.configEditor.jsonSchemaUrl
            }

            const response = await axios.get(jsonSchemaUrl)
            const schema = await response.data

            const snippetDescriptions = snippets.map((snippet) => {
                const snippetJson = JSON.stringify(snippet.snippet, null, 1)

                return ['', '```json', snippetJson.slice(2, -2), '```', '', '---', ''].join('\n')
            })

            const snippetSchema = {
                name: 'snippet',
                title: 'Remnawave Snippets',
                markdownDescription:
                    'Create your own snippets to quickly configure your **Outbounds** or **Rules**. \n\n\nReference them here, Remnawave will handle the rest.',
                type: 'string',
                enum: snippetNames,
                markdownEnumDescriptions: snippetDescriptions,
                minLength: 2,
                maxLength: 255,
                pattern: '^[A-Za-z0-9_\\s-]+$',
                patternErrorMessage:
                    'Snippet name can only contain: letters, numbers, spaces, _ and -'
            }

            if (schema.definitions?.OutboundObject?.properties) {
                schema.definitions.OutboundObject.properties.snippet = snippetSchema
            }

            if (schema.definitions?.RuleObject?.properties) {
                schema.definitions.RuleObject.properties.snippet = snippetSchema
            }

            if (schema.definitions?.BalancerObject?.properties) {
                schema.definitions.BalancerObject.properties.snippet = snippetSchema
            }

            registerJsonSchema({
                fileMatch: ['xray-config://*'],
                schema,
                uri: 'https://xray-config-schema.json'
            })
        } catch (error) {
            consola.error('Failed to load JSON schema:', error)
        }
    }
}
export const MonacoSetupSnippetsFeature = {
    setup: async (monaco: Monaco, currentLanguage: string) => {
        try {
            let { jsonSchemaUrl } = app.configEditor
            switch (currentLanguage) {
                case 'zh':
                    jsonSchemaUrl = app.configEditor.jsonSchemaCnUrl
                    break
                default:
                    jsonSchemaUrl = app.configEditor.jsonSchemaUrl
            }

            const response = await axios.get(jsonSchemaUrl)
            const schema = await response.data

            const snippetArraySchema = {
                $schema: 'http://json-schema.org/draft-07/schema#',
                title: 'Snippet Array',
                description: 'Array of Outbound, Rule or Balancer objects for snippets',
                type: 'array',
                items: {
                    oneOf: [
                        {
                            ...schema.definitions?.OutboundObject,
                            title: 'Outbound Object',
                            description: 'Outbound configuration (for outbounds[])'
                        },
                        {
                            ...schema.definitions?.RuleObject,
                            title: 'Rule Object',
                            description: 'Routing rule (for routing.rules[])'
                        },
                        {
                            ...schema.definitions?.BalancerObject,
                            title: 'Balancer Object',
                            description: 'Balancer configuration (for routing.balancers[])'
                        }
                    ]
                },
                minItems: 1,
                definitions: schema.definitions || {}
            }

            registerJsonSchema({
                fileMatch: ['snippet://*'],
                schema: snippetArraySchema,
                uri: 'https://snippet-schema.json'
            })

            return snippetArraySchema
        } catch (error) {
            consola.error('Failed to load snippet JSON schema:', error)
            return null
        }
    }
}

export const MonacoSetupResponseRulesFeature = {
    setup: async (
        monaco: Monaco,
        groupedTemplates: Record<TSubscriptionTemplateType, string[]>
    ) => {
        try {
            const schema = ResponseRulesConfigSchema.toJSONSchema({
                target: 'draft-07'
            })

            const templateOptions = {
                BROWSER: [],
                BLOCK: [],
                STATUS_CODE_404: [],
                STATUS_CODE_451: [],
                SOCKET_DROP: [],
                ...groupedTemplates
            }

            const rules = schema.properties?.rules
            const rulesItems =
                typeof rules === 'object' &&
                typeof rules.items === 'object' &&
                !Array.isArray(rules.items)
                    ? rules.items
                    : undefined

            if (rulesItems) {
                const rulesAllOf = (rulesItems.allOf ??= [])

                Object.entries(templateOptions).forEach(([responseType, templates]) => {
                    if (templates.length > 0) {
                        rulesAllOf.push({
                            if: {
                                properties: {
                                    responseType: { const: responseType }
                                },
                                required: ['responseType']
                            },
                            // oxlint-disable-next-line
                            then: {
                                properties: {
                                    responseModifications: {
                                        properties: {
                                            subscriptionTemplate: {
                                                enum: templates,
                                                markdownDescription: `Available templates for **${responseType}** response type.`,
                                                markdownEnumDescriptions: templates.map(
                                                    (t) => `Use ${t} template`
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        })
                    } else {
                        rulesAllOf.push({
                            if: {
                                properties: {
                                    responseType: { const: responseType }
                                },
                                required: ['responseType']
                            },
                            // oxlint-disable-next-line
                            then: {
                                properties: {
                                    responseModifications: {
                                        properties: {
                                            subscriptionTemplate: {
                                                type: 'null',
                                                not: { type: 'string' },
                                                markdownDescription: `⚠️ No templates available for **${responseType}** response type. This field should not be used.`
                                            }
                                        }
                                    }
                                }
                            }
                        })
                    }
                })
            }

            registerJsonSchema({
                fileMatch: ['response-rules://*'],
                schema,
                uri: 'https://response-rules-schema.json'
            })

            monaco.languages.json.jsonDefaults.setModeConfiguration({
                documentFormattingEdits: true,
                documentRangeFormattingEdits: true,
                completionItems: true,
                hovers: true,
                documentSymbols: true,
                tokens: true,
                colors: true,
                foldingRanges: true,
                diagnostics: true,
                selectionRanges: true
            })

            monaco.editor.defineTheme('GithubDark', {
                ...monacoTheme,
                base: 'vs-dark'
            })
        } catch (error) {
            consola.error('Failed to load JSON schema:', error)
        }
    }
}

export const MonacoSetupHostMapperEditorFeature = {
    setup: async (rawInbound?: unknown) => {
        try {
            const schema = HostMapperSchema.toJSONSchema({ target: 'draft-07' })
            injectInboundPaths(schema, rawInbound)

            registerJsonSchema({
                fileMatch: ['host-mapper://*'],
                schema,
                uri: 'https://host-mapper-schema.json'
            })
        } catch (error) {
            consola.error('Failed to configure Host Mapper schema:', error)
        }
    }
}

export const MonacoSetupNodePluginEditorFeature = {
    setup: async (monaco: Monaco) => {
        try {
            const schema = NodePluginSchema.toJSONSchema()

            registerJsonSchema({
                fileMatch: ['node-plugin://*'],
                schema,
                uri: 'https://node-plugin-schema.json'
            })

            monaco.languages.json.jsonDefaults.setModeConfiguration({
                documentFormattingEdits: true,
                documentRangeFormattingEdits: true,
                completionItems: true,
                hovers: true,
                documentSymbols: true,
                tokens: true,
                colors: true,
                foldingRanges: true,
                diagnostics: true,
                selectionRanges: true
            })

            monaco.editor.defineTheme('GithubDark', {
                ...monacoTheme,
                base: 'vs-dark'
            })
        } catch (error) {
            consola.error('Failed to load JSON schema:', error)
        }
    }
}
