import { GetNodesCommand } from '@remnawave/backend-contract'

import { WithNodeRuntimeStatus } from '@shared/utils/node-runtime-status'

type Node = WithNodeRuntimeStatus<GetNodesCommand.Response['response'][number]>

export interface IProps {
    fetchedNode?: Node | undefined
    node: Node
    style?: React.CSSProperties
    withText?: boolean
}
