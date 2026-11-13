import { Badge, Center, Group, Stack, Text } from '@mantine/core'
import { Spotlight } from '@mantine/spotlight'
import { GetNodesCommand } from '@remnawave/backend-contract'
import ReactCountryFlag from 'react-country-flag'
import { useTranslation } from 'react-i18next'
import { PiEmptyDuotone, PiUsersDuotone } from 'react-icons/pi'
import { TbServer, TbServer2 } from 'react-icons/tb'

import { showModal } from '@shared/_modals/show-modal'

import { NodeStatusBadgeWidget } from '../node-status-badge'

interface IProps {
    nodes: GetNodesCommand.Response['response']
}

export const NodesSpotlightSearchWidget = ({ nodes }: IProps) => {
    const { t } = useTranslation()

    const handleViewNode = (value: null | string) => {
        if (!value) {
            return
        }

        const node = nodes.find((item) => item.uuid === value)
        if (node) {
            showModal('nodes_editNodeModal', { nodeUuid: node.uuid })
        }
    }

    return (
        <Spotlight
            actions={nodes.map((node) => ({
                label: node.name,
                description: `${node.address}${node.port ? `:${node.port}` : ''} ${
                    node.provider?.name ? `· ${node.provider.name}` : ''
                }`,
                id: node.uuid,
                leftSection:
                    node.countryCode && node.countryCode !== 'XX' ? (
                        <ReactCountryFlag
                            countryCode={node.countryCode}
                            style={{
                                width: '1.3em',
                                height: '1em',
                                borderRadius: '2px'
                            }}
                            svg
                        />
                    ) : (
                        <TbServer color="var(--mantine-color-gray-5)" size={16} />
                    ),
                rightSection: (
                    <Group gap={6} wrap="nowrap">
                        <NodeStatusBadgeWidget node={node} withText={false} />
                        <Badge
                            color={(node.usersOnline ?? 0) > 0 ? 'teal' : 'gray'}
                            leftSection={<PiUsersDuotone size={13} />}
                            miw="6ch"
                            size="md"
                            style={{ fontVariantNumeric: 'tabular-nums' }}
                            variant="light"
                        >
                            {node.usersOnline ?? 0}
                        </Badge>
                    </Group>
                ),
                onClick: () => handleViewNode(node.uuid)
            }))}
            centered
            highlightQuery
            maxHeight={380}
            nothingFound={
                <Center h="220">
                    <Stack align="center" gap="xs">
                        <PiEmptyDuotone color="var(--mantine-color-gray-5)" size="3rem" />
                        <Text c="dimmed" size="sm">
                            {t('nodes-spotlight-search.widget.no-nodes-found')}
                        </Text>
                    </Stack>
                </Center>
            }
            overlayProps={{ backgroundOpacity: 0.6, blur: 2 }}
            scrollable
            searchProps={{
                leftSection: <TbServer2 size={20} />,
                placeholder: t('nodes-spotlight-search.widget.search-by-name-or-address')
            }}
            shortcut={['mod + F']}
        />
    )
}
