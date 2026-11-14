import { ActionIcon, Button, Group, SegmentedControl, Tooltip } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { TbLayoutGrid, TbLayoutList, TbPlus, TbRefresh } from 'react-icons/tb'

import { showModal } from '@shared/_modals/show-modal'
import { HelpActionIconShared } from '@shared/_modals/universal'
import { queryClient } from '@shared/api'
import { QueryKeys, useGetHosts } from '@shared/api/hooks'
import { UniversalSpotlightActionIconShared } from '@shared/ui/universal-spotlight'

import { HOSTS_VIEW_MODE } from '@entities/dashboard/view-preferences-store'

import { IProps } from './interfaces'

export const HeaderActionButtonsFeature = (props: IProps) => {
    const { setViewMode, viewMode } = props

    const { t } = useTranslation()

    const { isFetching } = useGetHosts()

    const handleCreate = () => {
        showModal('hosts_createHostDrawer')
    }

    const handleUpdate = async () => {
        await queryClient.refetchQueries({
            queryKey: QueryKeys.hosts._def
        })
    }

    return (
        <Group align="center" gap="xs" wrap="wrap">
            <SegmentedControl
                aria-label={t('nodes-header-action-buttons.feature.toggle-view-mode')}
                data={[
                    {
                        value: HOSTS_VIEW_MODE.CARDS,
                        label: (
                            <Group gap={6} justify="center" wrap="nowrap">
                                <TbLayoutList size={16} />
                                <span>{t('nodes-header-action-buttons.feature.view-list')}</span>
                            </Group>
                        )
                    },
                    {
                        value: HOSTS_VIEW_MODE.MATRIX,
                        label: (
                            <Group gap={6} justify="center" wrap="nowrap">
                                <TbLayoutGrid size={16} />
                                <span>{t('nodes-header-action-buttons.feature.view-matrix')}</span>
                            </Group>
                        )
                    }
                ]}
                onChange={(value) => setViewMode(value as HOSTS_VIEW_MODE)}
                size="sm"
                value={viewMode}
            />

            <Group gap={4} wrap="nowrap">
                <HelpActionIconShared hidden={false} screen="PAGE_HOSTS" />
                <UniversalSpotlightActionIconShared />
                <Tooltip label={t('common.update')} withArrow>
                    <ActionIcon
                        aria-label={t('common.update')}
                        color="gray"
                        loading={isFetching}
                        onClick={handleUpdate}
                        size="input-sm"
                        variant="default"
                    >
                        <TbRefresh size={18} />
                    </ActionIcon>
                </Tooltip>
            </Group>

            <Button
                color="teal"
                leftSection={<TbPlus size={16} />}
                onClick={handleCreate}
                size="sm"
                variant="light"
            >
                {t('header-action-buttons.feature.create-new-host')}
            </Button>
        </Group>
    )
}
