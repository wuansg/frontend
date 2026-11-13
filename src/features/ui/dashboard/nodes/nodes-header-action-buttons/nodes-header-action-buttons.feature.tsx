import { ActionIcon, Button, Group, SegmentedControl, Stack, Tooltip } from '@mantine/core'
import { modals } from '@mantine/modals'
import { spotlight } from '@mantine/spotlight'
import { useTranslation } from 'react-i18next'
import { PiSpiral } from 'react-icons/pi'
import {
    TbAlertCircle,
    TbLayoutGrid,
    TbLayoutList,
    TbPlus,
    TbRefresh,
    TbRocket,
    TbSearch
} from 'react-icons/tb'

import { showModal } from '@shared/_modals/show-modal'
import { useGetNodes, useRestartAllNodes } from '@shared/api/hooks'
import { ActionCardShared } from '@shared/ui'
import { BaseOverlayHeader } from '@shared/ui/overlays/base-overlay-header'

import { NODES_VIEW_MODE } from '@entities/dashboard/view-preferences-store'

interface IProps {
    setViewMode: (viewMode: NODES_VIEW_MODE) => void
    viewMode: NODES_VIEW_MODE
}

export const NodesHeaderActionButtonsFeature = (props: IProps) => {
    const { setViewMode, viewMode } = props

    const { t } = useTranslation()

    const {
        isLoading: isGetNodesPending,
        refetch: refetchNodes,
        isPending,
        isRefetching
    } = useGetNodes()
    const { mutate: restartAllNodes, isPending: isRestartAllNodesPending } = useRestartAllNodes()

    const openRestartAllNodesModal = () => {
        modals.open({
            title: (
                <BaseOverlayHeader
                    iconColor="teal"
                    IconComponent={TbRocket}
                    iconVariant="soft"
                    title={t('nodes-header-action-buttons.feature.restart-all-nodes')}
                />
            ),
            centered: true,
            size: 'md',
            children: (
                <Stack gap="sm">
                    <ActionCardShared
                        description={t(
                            'nodes-header-action-buttons.feature.force-restart-description'
                        )}
                        icon={<TbAlertCircle size={22} />}
                        iconColor="red"
                        isLoading={isPending}
                        onClick={() => {
                            restartAllNodes({
                                variables: {
                                    forceRestart: true
                                }
                            })
                            modals.closeAll()
                        }}
                        title={t('nodes-header-action-buttons.feature.force')}
                        variant="soft"
                    />

                    <ActionCardShared
                        description={t(
                            'nodes-header-action-buttons.feature.graceful-restart-description-1'
                        )}
                        icon={<TbRocket size={22} />}
                        iconColor="teal"
                        isLoading={isPending}
                        onClick={() => {
                            restartAllNodes({
                                variables: {
                                    forceRestart: false
                                }
                            })
                            modals.closeAll()
                        }}
                        title={t('nodes-header-action-buttons.feature.graceful')}
                        variant="soft"
                    />
                </Stack>
            )
        })
    }

    return (
        <Group align="center" gap="xs" wrap="wrap">
            <SegmentedControl
                aria-label={t('nodes-header-action-buttons.feature.toggle-view-mode')}
                data={[
                    {
                        value: NODES_VIEW_MODE.CARDS,
                        label: (
                            <Group gap={6} justify="center" wrap="nowrap">
                                <TbLayoutList size={16} />
                                <span>{t('nodes-header-action-buttons.feature.view-list')}</span>
                            </Group>
                        )
                    },
                    {
                        value: NODES_VIEW_MODE.MATRIX,
                        label: (
                            <Group gap={6} justify="center" wrap="nowrap">
                                <TbLayoutGrid size={16} />
                                <span>{t('nodes-header-action-buttons.feature.view-matrix')}</span>
                            </Group>
                        )
                    }
                ]}
                onChange={(value) => setViewMode(value as NODES_VIEW_MODE)}
                size="sm"
                value={viewMode}
            />

            <ActionIcon.Group>
                <Tooltip label={t('nodes-header-action-buttons.feature.search-nodes')} withArrow>
                    <ActionIcon
                        aria-label={t('nodes-header-action-buttons.feature.search-nodes')}
                        color="gray"
                        onClick={spotlight.open}
                        size="input-sm"
                        variant="default"
                    >
                        <TbSearch size={18} />
                    </ActionIcon>
                </Tooltip>

                <Tooltip
                    label={t('nodes-header-action-buttons.feature.restart-all-nodes')}
                    withArrow
                >
                    <ActionIcon
                        aria-label={t('nodes-header-action-buttons.feature.restart-all-nodes')}
                        color="grape"
                        loading={isRestartAllNodesPending}
                        onClick={openRestartAllNodesModal}
                        size="input-sm"
                        variant="default"
                    >
                        <PiSpiral size={18} />
                    </ActionIcon>
                </Tooltip>

                <Tooltip label={t('common.update')} withArrow>
                    <ActionIcon
                        aria-label={t('common.update')}
                        color="gray"
                        loading={isGetNodesPending || isPending || isRefetching}
                        onClick={() => refetchNodes()}
                        size="input-sm"
                        variant="default"
                    >
                        <TbRefresh size={18} />
                    </ActionIcon>
                </Tooltip>
            </ActionIcon.Group>

            <Button
                color="teal"
                leftSection={<TbPlus size={16} />}
                onClick={() => showModal('nodes_createNodeModal')}
                size="sm"
                variant="light"
            >
                {t('nodes-header-action-buttons.feature.create-new-node')}
            </Button>
        </Group>
    )
}
