import { GetNodesCommand } from '@remnawave/backend-contract'

import { WithNodeRuntimeStatus } from '@shared/utils/node-runtime-status'

export interface IProps {
    disableReordering?: boolean
    handleViewNode: (nodeUuid: string) => void
    index: number
    isDragOverlay?: boolean
    isMobile: boolean
    node: WithNodeRuntimeStatus<GetNodesCommand.Response['response'][number]>
}
