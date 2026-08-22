import type { languages } from 'monaco-editor'

import * as monaco from 'monaco-editor'

type JsonSchema = NonNullable<languages.json.DiagnosticsOptions['schemas']>[number]

const schemas = new Map<string, JsonSchema>()

const DEFAULT_DIAGNOSTICS: languages.json.DiagnosticsOptions = {
    allowComments: false,
    comments: 'error',
    enableSchemaRequest: true,
    schemaRequest: 'warning',
    schemaValidation: 'error',
    trailingCommas: 'error',
    validate: true
}

export const registerJsonSchema = (
    schema: JsonSchema,
    diagnostics: Partial<languages.json.DiagnosticsOptions> = {}
) => {
    schemas.set(schema.uri, schema)

    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
        ...DEFAULT_DIAGNOSTICS,
        ...diagnostics,
        schemas: [...schemas.values()]
    })
}
