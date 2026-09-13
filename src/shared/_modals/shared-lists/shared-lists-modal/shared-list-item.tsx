import { ActionIcon, Badge, Box, Code, Group, Stack, Text, Tooltip } from '@mantine/core'
import { modals } from '@mantine/modals'
import { GetSharedListsCommand } from '@remnawave/backend-contract'
import { useTranslation } from 'react-i18next'
import { TbListNumbers, TbSitemap, TbTrash } from 'react-icons/tb'

import { showModal } from '@shared/_modals/show-modal'
import { instance, queryClient } from '@shared/api'
import { QueryKeys, useDeleteSharedList } from '@shared/api/hooks'

import classes from './shared-lists.module.css'

const TYPE_COLORS: Record<string, string> = {
    ipList: 'cyan',
    asList: 'orange',
    domainList: 'violet',
    portList: 'teal'
}

interface IProps {
    sharedList: GetSharedListsCommand.Response['response']['sharedLists'][number]
}

export const SharedListItem = (props: IProps) => {
    const { sharedList } = props
    const { t } = useTranslation()

    const { type, itemsCount } = sharedList

    const { mutate: deleteSharedList, isPending: isDeleting } = useDeleteSharedList({
        mutationFns: {
            onSuccess: async () => {
                await queryClient.refetchQueries({
                    queryKey: QueryKeys.nodePlugins.getSharedLists.queryKey
                })
            }
        }
    })

    const handleDelete = () => {
        modals.openConfirmModal({
            title: t('common.confirm-action'),
            children: t('shared-lists.modal.delete-description'),
            labels: {
                confirm: t('common.delete'),
                cancel: t('common.cancel')
            },
            cancelProps: { variant: 'subtle' },
            confirmProps: { color: 'red', variant: 'soft' },
            centered: true,
            onConfirm: () => deleteSharedList({ route: { name: sharedList.name } })
        })
    }

    const openEditor = () =>
        showModal('sharedLists_sharedListEditorModal', { name: sharedList.name })

    const openReferences = async () => {
        const response = await instance.get<{ response: SharedListReferences }>(
            `/api/node-plugins/shared-lists/${encodeURIComponent(sharedList.name)}/references`
        )
        const graph = response.data.response
        modals.open({
            title: `References — ext:${sharedList.name}`,
            children: (
                <Stack gap="sm">
                    <Group gap="xs">
                        <Badge variant="light">{graph.list.type}</Badge>
                        <Badge color="teal" variant="light">
                            {graph.affectedNodeCount} affected nodes
                        </Badge>
                    </Group>
                    {graph.plugins.length === 0 && (
                        <Text c="dimmed" size="sm">
                            This Shared List is not referenced by a Node Plugin.
                        </Text>
                    )}
                    {graph.plugins.map((plugin) => (
                        <Box
                            key={plugin.uuid}
                            p="sm"
                            style={{
                                border: '1px solid var(--mantine-color-dark-4)',
                                borderRadius: 8
                            }}
                        >
                            <Text fw={600} size="sm">
                                {plugin.name}
                            </Text>
                            <Code>
                                {plugin.nodes.length ? plugin.nodes.join(', ') : 'No nodes'}
                            </Code>
                        </Box>
                    ))}
                </Stack>
            )
        })
    }

    return (
        <Box
            className={classes.sharedListRow}
            onClick={openEditor}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    openEditor()
                }
            }}
            role="button"
            tabIndex={0}
        >
            <Group gap="sm" style={{ minWidth: 0 }} wrap="nowrap">
                <Box
                    style={{
                        background: 'var(--mantine-color-indigo-5)',
                        borderRadius: '50%',
                        flexShrink: 0,
                        height: 8,
                        width: 8
                    }}
                />
                <Text ff="monospace" fw={500} size="sm" truncate="end">
                    {`ext:${sharedList.name}`}
                </Text>
            </Group>

            <Group gap="xs" wrap="nowrap">
                <Badge color={TYPE_COLORS[type] ?? 'gray'} size="sm" variant="soft">
                    {type}
                </Badge>
                <Badge
                    color="indigo"
                    leftSection={<TbListNumbers size={12} />}
                    size="sm"
                    variant="soft"
                >
                    {itemsCount}
                </Badge>
            </Group>

            <Tooltip label="Show references">
                <ActionIcon
                    color="indigo"
                    onClick={(event) => {
                        event.stopPropagation()
                        void openReferences()
                    }}
                    size="md"
                    variant="subtle"
                >
                    <TbSitemap size={18} />
                </ActionIcon>
            </Tooltip>

            <Tooltip label={t('common.delete')}>
                <ActionIcon
                    color="red"
                    loading={isDeleting}
                    onClick={(event) => {
                        event.stopPropagation()
                        handleDelete()
                    }}
                    size="md"
                    variant="subtle"
                >
                    <TbTrash size={18} />
                </ActionIcon>
            </Tooltip>
        </Box>
    )
}

interface SharedListReferences {
    list: { name: string; type: string }
    plugins: Array<{ uuid: string; name: string; nodes: string[] }>
    affectedNodeCount: number
}
