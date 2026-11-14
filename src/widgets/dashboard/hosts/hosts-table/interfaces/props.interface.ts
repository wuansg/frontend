import { UseListStateHandlers } from '@mantine/hooks'
import { GetConfigProfilesCommand, GetHostsCommand } from '@remnawave/backend-contract'
import { RefObject } from 'react'

export interface IProps {
    configProfiles: GetConfigProfilesCommand.Response['response']['configProfiles'] | undefined
    disableReordering?: boolean
    handlers: UseListStateHandlers<GetHostsCommand.Response['response'][number]>
    hosts: GetHostsCommand.Response['response'] | undefined
    isDraggingRef: RefObject<boolean>
    selectedHosts: string[]
    setSelectedHosts: React.Dispatch<React.SetStateAction<string[]>>
    state: GetHostsCommand.Response['response']
}
