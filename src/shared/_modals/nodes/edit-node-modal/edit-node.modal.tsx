import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { Modal } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { TbCpu } from 'react-icons/tb'

import { useNiceMantineModal } from '@shared/_modals/use-nice-modal'
import { queryClient } from '@shared/api'
import { QueryKeys, useGetNode, useGetNodes } from '@shared/api/hooks'
import { BaseOverlayHeader } from '@shared/ui/overlays/base-overlay-header'

import { EditNodeByUuidModalContent } from './edit-node.modal.content'

interface IProps {
    nodeUuid: string
}

export const EditNodeModal = NiceModal.create((props: IProps) => {
    const { nodeUuid } = props

    const modal = useModal()
    const { modalProps, hide } = useNiceMantineModal({
        modal,
        onClose() {
            queryClient.refetchQueries({
                queryKey: QueryKeys.nodes.getAllNodes.queryKey
            })
        }
    })

    const { t } = useTranslation()
    const { data: detailNode } = useGetNode({
        route: { uuid: nodeUuid },
        rQueryParams: { enabled: false }
    })
    const { data: allNodes } = useGetNodes()
    const cachedNode = detailNode ?? allNodes?.find((item) => item.uuid === nodeUuid)

    const title = cachedNode?.name
        ? t('edit-node-modal.widget.title-with-name', { name: cachedNode.name })
        : t('edit-node-modal.widget.edit-node')
    const subtitle = cachedNode
        ? `${cachedNode.address}${cachedNode.port ? `:${cachedNode.port}` : ''}`
        : undefined

    return (
        <Modal
            {...modalProps}
            size="1080px"
            title={
                <BaseOverlayHeader
                    countryCode={cachedNode?.countryCode}
                    iconColor="teal"
                    IconComponent={TbCpu}
                    iconVariant="soft"
                    subtitle={subtitle}
                    title={title}
                    truncateTitle
                />
            }
        >
            <EditNodeByUuidModalContent nodeUuid={nodeUuid} onClose={hide} />
        </Modal>
    )
})
