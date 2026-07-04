import { ActionIcon, Tooltip } from '@mantine/core'
import { PiChartBarDuotone } from 'react-icons/pi'
import { useTranslation } from 'react-i18next'
import { memo } from 'react'

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
        <Tooltip label={t('get-user-usage.feature.show-usage')}>
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
