import { ActionIcon, Tooltip } from '@mantine/core'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { PiChartBarDuotone } from 'react-icons/pi'

import { MODALS, useModalsStoreOpenWithData } from '@entities/dashboard/modal-store'

interface IProps {
    hostRemark: string
    hostUuid: string
}

const GetHostUsersUsageFeatureComponent = (props: IProps) => {
    const { hostRemark, hostUuid } = props
    const { t } = useTranslation()

    const openModalWithData = useModalsStoreOpenWithData()

    return (
        <Tooltip label={t('common.usage-stats')}>
            <ActionIcon
                color="indigo"
                onClick={(event) => {
                    event.stopPropagation()
                    openModalWithData(MODALS.SHOW_HOST_USERS_USAGE_DRAWER, {
                        hostRemark,
                        hostUuid
                    })
                }}
                size="lg"
                variant="soft"
            >
                <PiChartBarDuotone size="22px" />
            </ActionIcon>
        </Tooltip>
    )
}

export const GetHostUsersUsageFeature = memo(GetHostUsersUsageFeatureComponent)
