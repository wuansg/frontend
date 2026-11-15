import { ActionIcon, Menu, Tooltip } from '@mantine/core'
import { modals } from '@mantine/modals'
import { useTranslation } from 'react-i18next'
import { TbTrash } from 'react-icons/tb'

import { hideModal } from '@shared/_modals/show-modal'
import { useDeleteHost } from '@shared/api/hooks'

interface IProps {
    asMenuItem?: boolean
    hostUuid: string
}

export function DeleteHostFeature(props: IProps) {
    const { asMenuItem, hostUuid } = props

    const { t } = useTranslation()

    const { mutate: deleteHost, isPending: isDeleteHostPending } = useDeleteHost({
        mutationFns: {
            onSuccess: () => {
                hideModal('hosts_editHostDrawer')
            }
        }
    })

    const handleDeleteHost = async () => {
        deleteHost({ route: { uuid: hostUuid } })
    }

    const openModal = () =>
        modals.openConfirmModal({
            title: t('common.confirm-action'),
            children: t('common.confirm-action-description'),
            labels: {
                confirm: t('common.delete'),
                cancel: t('common.cancel')
            },
            centered: true,
            cancelProps: {
                variant: 'subtle'
            },
            confirmProps: { color: 'red', variant: 'soft' },
            onConfirm: () => handleDeleteHost()
        })

    if (asMenuItem) {
        return (
            <Menu.Item color="red" leftSection={<TbTrash size={16} />} onClick={openModal}>
                {t('common.delete')}
            </Menu.Item>
        )
    }

    return (
        <Tooltip label={t('common.delete')}>
            <ActionIcon
                color="red"
                loading={isDeleteHostPending}
                onClick={openModal}
                size="xl"
                variant="soft"
            >
                <TbTrash size="24px" />
            </ActionIcon>
        </Tooltip>
    )
}
