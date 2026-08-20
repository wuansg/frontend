import { TNodeRuntimeStatus } from '@remnawave/backend-contract'

export type NodeRuntimeStatus = TNodeRuntimeStatus
export type NodeRuntimeMode = TNodeRuntimeStatus['mode']

export type WithNodeRuntimeStatus<T> = T & {
    runtimeStatus?: NodeRuntimeStatus | null
}

export function getNodeRuntimeMode<T>(node: WithNodeRuntimeStatus<T>): NodeRuntimeMode | null {
    return node.runtimeStatus?.mode ?? null
}
