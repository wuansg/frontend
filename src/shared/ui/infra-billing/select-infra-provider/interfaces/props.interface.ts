import type { MantineSize } from '@mantine/core'

export interface IProps {
    selectedInfraProviderUuid?: null | string
    setSelectedInfraProviderUuid: (infraProviderUuid: null | string) => void
    size?: MantineSize
}
