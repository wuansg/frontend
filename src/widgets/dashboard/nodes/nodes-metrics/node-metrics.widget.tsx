import {
    ActionIcon,
    Box,
    Card,
    Center,
    Group,
    HoverCard,
    Indicator,
    Loader,
    Paper,
    px,
    SimpleGrid,
    Stack,
    Text,
    TextInput,
    ThemeIcon
} from '@mantine/core'
import { GetNodesMetricsCommand } from '@remnawave/backend-contract'
import { VirtuosoMasonry } from '@virtuoso.dev/masonry'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
    PiGlobeSimple,
    PiInfo,
    PiProhibitDuotone,
    PiPulseDuotone,
    PiUsersDuotone
} from 'react-icons/pi'
import { TbRefresh, TbSearch, TbServer, TbX } from 'react-icons/tb'

import { showModal } from '@shared/_modals/show-modal'
import { useGetNodesMetrics } from '@shared/api/hooks'
import { useIsMobile } from '@shared/hooks'
import { MetricCardShared } from '@shared/ui/metrics/metric-card'

import { NodeDetailsCard } from './node-details-card'
import styles from './NodeDetails.module.css'

interface IMasonryContext {
    handleNodeClick: (nodeUuid: string) => void
    handleNodeUsageClick: (nodeUuid: string) => void
}

const MasonryNodeItem: React.FC<{
    context: IMasonryContext
    data: GetNodesMetricsCommand.Response['response']['nodes'][number]
    index: number
}> = ({ data, context }) => (
    <div
        className={styles.itemFadeIn}
        style={{
            padding: 5,
            margin: 0
        }}
    >
        <NodeDetailsCard
            handleNodeClick={context.handleNodeClick}
            handleNodeUsageClick={context.handleNodeUsageClick}
            node={data}
        />
    </div>
)

export const NodeMetricsWidget = () => {
    const { t } = useTranslation()
    const { data: nodeMetrics, isLoading, refetch, isRefetching } = useGetNodesMetrics()
    const isMobile = useIsMobile()
    const [searchQuery, setSearchQuery] = useState('')

    const handleNodeClick = useCallback((nodeUuid: string) => {
        showModal('nodes_editNodeModal', { nodeUuid })
    }, [])

    const handleNodeUsageClick = useCallback((nodeUuid: string) => {
        showModal('nodes_nodeUsageStatsDrawer', { nodeUuid })
    }, [])

    const overallStats = useMemo(() => {
        if (!nodeMetrics?.nodes) return null

        const totalNodes = nodeMetrics.nodes.length
        const totalUsersOnline = nodeMetrics.nodes.reduce((acc, node) => acc + node.usersOnline, 0)
        const activeNodes = nodeMetrics.nodes.filter((node) => node.usersOnline > 0).length
        const totalInbounds = nodeMetrics.nodes.reduce(
            (acc, node) => acc + node.inboundsStats.length,
            0
        )

        return {
            totalNodes,
            totalUsersOnline,
            activeNodes,
            totalInbounds
        }
    }, [nodeMetrics])

    const filteredNodes = useMemo(() => {
        const list = nodeMetrics?.nodes ?? []
        const q = searchQuery.trim().toLowerCase()
        if (!q) return list
        return list.filter(
            (node) =>
                node.nodeName.toLowerCase().includes(q) ||
                node.providerName.toLowerCase().includes(q)
        )
    }, [nodeMetrics?.nodes, searchQuery])

    const masonryContext = useMemo<IMasonryContext>(
        () => ({ handleNodeClick, handleNodeUsageClick }),
        [handleNodeClick, handleNodeUsageClick]
    )

    if (isLoading) {
        return (
            <Center h={200}>
                <Loader size="lg" />
            </Center>
        )
    }

    if (!nodeMetrics?.nodes?.length) {
        return (
            <Card p="xl" radius="md" withBorder>
                <Center>
                    <Stack align="center" gap="md">
                        <ThemeIcon color="gray" radius="xl" size="xl" variant="light">
                            <PiProhibitDuotone size="28px" />
                        </ThemeIcon>
                        <Text c="dimmed" size="md">
                            {t('nodes-metrics-page.empty')}
                        </Text>
                    </Stack>
                </Center>
            </Card>
        )
    }

    return (
        <Stack gap="md">
            <SimpleGrid cols={{ base: 2, lg: 4 }} spacing="xs">
                <MetricCardShared
                    iconColor="indigo"
                    IconComponent={TbServer}
                    iconVariant="soft"
                    isLoading={isLoading}
                    title={t('nodes-metrics-page.total-nodes')}
                    value={overallStats?.totalNodes || 0}
                />
                <MetricCardShared
                    iconColor="teal"
                    IconComponent={PiPulseDuotone}
                    iconVariant="soft"
                    isLoading={isLoading}
                    title={t('nodes-metrics-page.active-nodes')}
                    value={overallStats?.activeNodes || 0}
                />
                <MetricCardShared
                    iconColor="blue"
                    IconComponent={PiUsersDuotone}
                    iconVariant="soft"
                    isLoading={isLoading}
                    title={t('nodes-metrics-page.users-online')}
                    value={overallStats?.totalUsersOnline || 0}
                />
                <MetricCardShared
                    iconColor="violet"
                    IconComponent={PiGlobeSimple}
                    iconVariant="soft"
                    isLoading={isLoading}
                    title={t('nodes-metrics-page.total-inbounds')}
                    value={overallStats?.totalInbounds || 0}
                />
            </SimpleGrid>

            <Paper className={styles.bannerCard} p="sm" radius="md">
                <Group align="center" gap="sm" justify="space-between" wrap="wrap">
                    <Group align="center" gap="sm" wrap="wrap">
                        <Group align="center" gap="xs" wrap="nowrap">
                            <HoverCard position="bottom-start" shadow="lg" width={340} withArrow>
                                <HoverCard.Target>
                                    <ThemeIcon
                                        color="teal"
                                        radius="md"
                                        size="md"
                                        style={{ cursor: 'help' }}
                                        variant="light"
                                    >
                                        <PiInfo size={px('1.15rem')} />
                                    </ThemeIcon>
                                </HoverCard.Target>
                                <HoverCard.Dropdown>
                                    <Stack gap="xs">
                                        <Group gap="xs">
                                            <ThemeIcon color="cyan" size="xs" variant="light">
                                                <PiInfo size="0.7rem" />
                                            </ThemeIcon>
                                            <Text fw={650} size="sm">
                                                {t('nodes-metrics-page.info-title')}
                                            </Text>
                                        </Group>
                                        <Stack gap={4}>
                                            <Text c="dimmed" size="xs">
                                                • {t('nodes-metrics-page.info-1')}
                                            </Text>
                                            <Text c="dimmed" size="xs">
                                                • {t('nodes-metrics-page.info-2')}
                                            </Text>
                                            <Text c="dimmed" size="xs">
                                                • {t('nodes-metrics-page.info-3')}
                                            </Text>
                                        </Stack>
                                    </Stack>
                                </HoverCard.Dropdown>
                            </HoverCard>

                            <Text c="cyan.4" fw={600} size="sm">
                                {t('nodes-metrics-page.prometheus-source')}
                            </Text>
                        </Group>
                        <Group align="center" gap="xs" wrap="nowrap">
                            <Indicator
                                color="teal.5"
                                processing
                                size={8}
                                style={{ zIndex: 5 }}
                                visibleFrom="xs"
                            />
                            <Text c="dimmed" size="xs">
                                {t('nodes-metrics-page.live-updates')}
                            </Text>
                        </Group>
                    </Group>

                    <Group align="center" gap="xs" style={{ flex: '0 1 280px' }} wrap="nowrap">
                        <TextInput
                            leftSection={<TbSearch size={15} />}
                            onChange={(event) => setSearchQuery(event.currentTarget.value)}
                            placeholder={t('nodes-metrics-page.search-nodes')}
                            radius="md"
                            rightSection={
                                searchQuery ? (
                                    <ActionIcon
                                        color="gray"
                                        onClick={() => setSearchQuery('')}
                                        size="xs"
                                        variant="subtle"
                                    >
                                        <TbX size={12} />
                                    </ActionIcon>
                                ) : undefined
                            }
                            size="xs"
                            style={{ flex: 1, minWidth: 150 }}
                            value={searchQuery}
                        />
                        <ActionIcon
                            color="cyan"
                            loading={isRefetching}
                            onClick={() => refetch()}
                            radius="md"
                            size="md"
                            variant="light"
                        >
                            <TbRefresh size={16} />
                        </ActionIcon>
                    </Group>
                </Group>
            </Paper>

            {filteredNodes.length > 0 ? (
                <Box>
                    <VirtuosoMasonry
                        columnCount={isMobile ? 1 : 2}
                        context={masonryContext}
                        data={filteredNodes}
                        ItemContent={MasonryNodeItem}
                        style={{
                            height: '100%'
                        }}
                        useWindowScroll={true}
                    />
                </Box>
            ) : (
                <Card p="xl" radius="md" withBorder>
                    <Center>
                        <Text c="dimmed" size="sm">
                            {t('nodes-metrics-page.empty')}
                        </Text>
                    </Center>
                </Card>
            )}
        </Stack>
    )
}
