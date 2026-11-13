import { GetNodesCommand } from '@remnawave/backend-contract'

export interface IProps {
    disableReordering?: boolean
    nodes: GetNodesCommand.Response['response'] | undefined
}
