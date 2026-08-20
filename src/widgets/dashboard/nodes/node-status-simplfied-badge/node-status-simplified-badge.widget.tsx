import { ThemeIcon } from '@mantine/core'
import { memo } from 'react'
import {
    PiCloudArrowUpDuotone,
    PiProhibitDuotone,
    PiPulseDuotone,
    PiWarningCircle
} from 'react-icons/pi'

import { IProps } from './interface'

export const NodeStatusSimplfiedBadgeWidget = memo(
    ({ isConnected, isConnecting, isDisabled, nodeUuid, runtimeMode, ...rest }: IProps) => {
        let icon: React.ReactNode
        let color = 'red'

        if (isConnected && runtimeMode === 'DEGRADED') {
            icon = <PiWarningCircle size={18} style={{ color: 'var(--mantine-color-orange-5)' }} />
            color = 'orange'
        } else if (isConnected && runtimeMode === 'FORWARDING_ONLY') {
            icon = (
                <PiCloudArrowUpDuotone size={18} style={{ color: 'var(--mantine-color-blue-5)' }} />
            )
            color = 'blue'
        } else if (isConnected && runtimeMode === 'IDLE') {
            icon = <PiPulseDuotone size={18} style={{ color: 'var(--mantine-color-gray-5)' }} />
            color = 'gray'
        } else if (isConnected) {
            icon = <PiPulseDuotone size={18} style={{ color: 'var(--mantine-color-teal-6)' }} />
            color = 'teal'
        } else if (isConnecting) {
            icon = (
                <PiCloudArrowUpDuotone
                    size={18}
                    style={{ color: 'var(--mantine-color-yellow-3)' }}
                />
            )
            color = 'var(--mantine-color-yellow-3)'
        } else if (isDisabled) {
            icon = <PiProhibitDuotone size={18} style={{ color: 'var(--mantine-color-gray-6)' }} />
            color = 'gray'
        } else {
            icon = <PiWarningCircle size={18} style={{ color: 'var(--mantine-color-red-3)' }} />
            color = 'red'
        }

        return (
            <ThemeIcon color={color} size="md" variant="outline" {...rest}>
                {icon}
            </ThemeIcon>
        )
    }
)
