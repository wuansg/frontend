import { ThemeIcon } from '@mantine/core'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import {
    PiCloudArrowUpDuotone,
    PiProhibitDuotone,
    PiPulseDuotone,
    PiWarningCircle
} from 'react-icons/pi'

import { IProps } from './interface'

export const NodeStatusSimplfiedBadgeWidget = memo(
    ({ isConnected, isConnecting, isDisabled, nodeUuid, runtimeMode, ...rest }: IProps) => {
        const { t } = useTranslation()

        let icon: React.ReactNode
        let color = 'red'
        let label = t('node-status-badge.widget.disconnected')

        if (isDisabled) {
            icon = <PiProhibitDuotone size={17} style={{ color: 'var(--mantine-color-gray-6)' }} />
            color = 'gray'
            label = t('node-status-badge.widget.disabled')
        } else if (isConnected && runtimeMode === 'DEGRADED') {
            icon = <PiWarningCircle size={17} style={{ color: 'var(--mantine-color-orange-5)' }} />
            color = 'orange'
            label = t('node-status-badge.widget.degraded')
        } else if (isConnected && runtimeMode === 'FORWARDING_ONLY') {
            icon = (
                <PiCloudArrowUpDuotone size={17} style={{ color: 'var(--mantine-color-blue-5)' }} />
            )
            color = 'blue'
            label = t('node-status-badge.widget.forwarding-only')
        } else if (isConnected && runtimeMode === 'IDLE') {
            icon = <PiPulseDuotone size={17} style={{ color: 'var(--mantine-color-gray-5)' }} />
            color = 'gray'
            label = t('node-status-badge.widget.idle')
        } else if (isConnected) {
            icon = <PiPulseDuotone size={17} style={{ color: 'var(--mantine-color-teal-5)' }} />
            color = 'teal'
            label = t('node-status-badge.widget.core-active')
        } else if (isConnecting) {
            icon = (
                <PiCloudArrowUpDuotone
                    size={17}
                    style={{ color: 'var(--mantine-color-yellow-5)' }}
                />
            )
            color = 'yellow'
            label = t('node-status-badge.widget.connecting')
        } else {
            icon = <PiWarningCircle size={17} style={{ color: 'var(--mantine-color-red-5)' }} />
            color = 'red'
        }

        return (
            <ThemeIcon
                aria-label={label}
                color={color}
                radius="md"
                size="md"
                title={label}
                variant="light"
                {...rest}
            >
                {icon}
            </ThemeIcon>
        )
    }
)
