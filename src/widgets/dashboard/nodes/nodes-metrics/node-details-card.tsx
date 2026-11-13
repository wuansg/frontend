import {
    ActionIcon,
    Badge,
    Box,
    Card,
    Center,
    Group,
    px,
    SimpleGrid,
    Stack,
    Text,
    ThemeIcon,
    Tooltip
} from '@mantine/core'
import { GetNodesMetricsCommand } from '@remnawave/backend-contract'
import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
    PiArrowDownDuotone,
    PiArrowUpDuotone,
    PiEyeDuotone,
    PiEyeSlashDuotone,
    PiProhibitDuotone,
    PiTag,
    PiUsersDuotone
} from 'react-icons/pi'
import { TbChartArcs, TbServer2 } from 'react-icons/tb'

import { SectionCard } from '@shared/ui/section-card'
import { formatInt } from '@shared/utils/misc'

import styles from './NodeDetails.module.css'

export const NodeDetailsCard = memo(
    ({
        node,
        handleNodeClick,
        handleNodeUsageClick
    }: {
        handleNodeClick: (nodeUuid: string) => void
        handleNodeUsageClick?: (nodeUuid: string) => void
        node: GetNodesMetricsCommand.Response['response']['nodes'][number]
    }) => {
        const [hideZeroValues, setHideZeroValues] = useState(true)
        const { t } = useTranslation()

        const filterNonZeroStats = (stats: typeof node.inboundsStats) => {
            if (!hideZeroValues) return stats
            return stats.filter((stat) => stat.upload !== '0' || stat.download !== '0')
        }

        const filteredInboundStats = filterNonZeroStats(node.inboundsStats)
        const filteredOutboundStats = filterNonZeroStats(node.outboundsStats)

        return (
            <SectionCard.Root>
                <SectionCard.Section>
                    <Group align="center" justify="space-between" style={{ minWidth: 0 }}>
                        <Group
                            gap="sm"
                            grow={false}
                            onClick={() => handleNodeClick(node.nodeUuid)}
                            preventGrowOverflow={true}
                            style={{ minWidth: 0, flex: 1, cursor: 'pointer' }}
                            wrap="nowrap"
                        >
                            <ThemeIcon color="indigo" radius="md" size="xl" variant="soft">
                                <TbServer2 size="22px" />
                            </ThemeIcon>
                            <Box style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                                <Group
                                    align="center"
                                    gap="xs"
                                    style={{ minWidth: 0 }}
                                    wrap="nowrap"
                                >
                                    <Text size="lg" style={{ flexShrink: 0 }}>
                                        {node.countryEmoji}
                                    </Text>

                                    <Text fw={650} size="md" style={{ minWidth: 0 }} truncate="end">
                                        {node.nodeName}
                                    </Text>
                                </Group>
                                {node.providerName !== 'unknown' && (
                                    <Text c="dimmed" size="xs" truncate="end">
                                        {node.providerName}
                                    </Text>
                                )}
                            </Box>
                        </Group>

                        <Group gap={6} style={{ flexShrink: 0, minWidth: 'fit-content' }}>
                            {handleNodeUsageClick && (
                                <Tooltip label={t('common.usage-stats')}>
                                    <ActionIcon
                                        color="cyan"
                                        onClick={() => handleNodeUsageClick(node.nodeUuid)}
                                        radius="md"
                                        size="md"
                                        variant="light"
                                    >
                                        <TbChartArcs size="1rem" />
                                    </ActionIcon>
                                </Tooltip>
                            )}

                            <Tooltip
                                label={
                                    hideZeroValues
                                        ? t('node-details-card.show-zero-values')
                                        : t('node-details-card.hide-zero-values')
                                }
                            >
                                <ActionIcon
                                    color="indigo"
                                    onClick={() => setHideZeroValues(!hideZeroValues)}
                                    radius="md"
                                    size="md"
                                    variant="light"
                                >
                                    {hideZeroValues ? (
                                        <PiEyeSlashDuotone size="1rem" />
                                    ) : (
                                        <PiEyeDuotone size="1rem" />
                                    )}
                                </ActionIcon>
                            </Tooltip>

                            <Badge
                                className={styles.tabular}
                                color="teal"
                                leftSection={<PiUsersDuotone size={px('0.9rem')} />}
                                radius="md"
                                size="lg"
                                style={{ flexShrink: 0 }}
                                variant="light"
                            >
                                {formatInt(node.usersOnline)}
                            </Badge>
                        </Group>
                    </Group>
                </SectionCard.Section>
                <SectionCard.Section>
                    <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="sm">
                        <Card className={styles.inboundCard} p="sm" radius="md">
                            <Group
                                align="center"
                                gap="xs"
                                justify="space-between"
                                mb="xs"
                                wrap="nowrap"
                            >
                                <Group align="center" gap={6} style={{ minWidth: 0 }} wrap="nowrap">
                                    <PiArrowDownDuotone
                                        color="var(--mantine-color-teal-4)"
                                        size="16px"
                                        style={{ flexShrink: 0 }}
                                    />
                                    <Text c="teal.4" fw={650} size="xs" truncate="end">
                                        {t('nodes-metrics-page.inbound-traffic')}
                                    </Text>
                                </Group>
                                <Badge
                                    className={styles.tabular}
                                    color="teal"
                                    radius="sm"
                                    size="xs"
                                    variant="light"
                                >
                                    {filteredInboundStats.length}
                                </Badge>
                            </Group>

                            {filteredInboundStats.length > 0 ? (
                                <Stack gap={6}>
                                    {filteredInboundStats.map((stat) => (
                                        <Box className={styles.tagRow} key={stat.tag}>
                                            <Badge
                                                color="teal"
                                                leftSection={<PiTag size={px('0.75rem')} />}
                                                mb={6}
                                                radius="sm"
                                                size="xs"
                                                variant="light"
                                            >
                                                {stat.tag}
                                            </Badge>
                                            <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="xs">
                                                <Group align="center" gap={6} wrap="nowrap">
                                                    <PiArrowUpDuotone
                                                        color="var(--mantine-color-blue-4)"
                                                        size="0.8rem"
                                                        style={{ flexShrink: 0 }}
                                                    />
                                                    <Box style={{ minWidth: 0 }}>
                                                        <Text c="dimmed" lh={1.1} size="10px">
                                                            {t('traffic-usage.upload')}
                                                        </Text>
                                                        <Text
                                                            className={styles.tabular}
                                                            fw={650}
                                                            size="xs"
                                                            truncate="end"
                                                        >
                                                            {stat.upload === '0'
                                                                ? '0 B'
                                                                : stat.upload}
                                                        </Text>
                                                    </Box>
                                                </Group>
                                                <Group align="center" gap={6} wrap="nowrap">
                                                    <PiArrowDownDuotone
                                                        color="var(--mantine-color-teal-4)"
                                                        size="0.8rem"
                                                        style={{ flexShrink: 0 }}
                                                    />
                                                    <Box style={{ minWidth: 0 }}>
                                                        <Text c="dimmed" lh={1.1} size="10px">
                                                            {t('traffic-usage.download')}
                                                        </Text>
                                                        <Text
                                                            className={styles.tabular}
                                                            fw={650}
                                                            size="xs"
                                                            truncate="end"
                                                        >
                                                            {stat.download === '0'
                                                                ? '0 B'
                                                                : stat.download}
                                                        </Text>
                                                    </Box>
                                                </Group>
                                            </SimpleGrid>
                                        </Box>
                                    ))}
                                </Stack>
                            ) : (
                                <Center py="md">
                                    <Stack align="center" gap={6}>
                                        <ThemeIcon
                                            color="gray"
                                            radius="xl"
                                            size="sm"
                                            variant="light"
                                        >
                                            <PiProhibitDuotone size="0.95rem" />
                                        </ThemeIcon>
                                        <Text c="dimmed" size="xs" ta="center">
                                            {t('node-details-card.no-inbound-traffic-data')}
                                        </Text>
                                    </Stack>
                                </Center>
                            )}
                        </Card>
                        <Card className={styles.outboundCard} p="sm" radius="md">
                            <Group
                                align="center"
                                gap="xs"
                                justify="space-between"
                                mb="xs"
                                wrap="nowrap"
                            >
                                <Group align="center" gap={6} style={{ minWidth: 0 }} wrap="nowrap">
                                    <PiArrowUpDuotone
                                        color="var(--mantine-color-blue-4)"
                                        size="16px"
                                        style={{ flexShrink: 0 }}
                                    />
                                    <Text c="blue.4" fw={650} size="xs" truncate="end">
                                        {t('nodes-metrics-page.outbound-traffic')}
                                    </Text>
                                </Group>
                                <Badge
                                    className={styles.tabular}
                                    color="blue"
                                    radius="sm"
                                    size="xs"
                                    variant="light"
                                >
                                    {filteredOutboundStats.length}
                                </Badge>
                            </Group>
                            {filteredOutboundStats.length > 0 ? (
                                <Stack gap={6}>
                                    {filteredOutboundStats.map((stat) => (
                                        <Box className={styles.tagRow} key={stat.tag}>
                                            <Badge
                                                color="blue"
                                                leftSection={<PiTag size={px('0.75rem')} />}
                                                mb={6}
                                                radius="sm"
                                                size="xs"
                                                variant="light"
                                            >
                                                {stat.tag}
                                            </Badge>
                                            <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="xs">
                                                <Group align="center" gap={6} wrap="nowrap">
                                                    <PiArrowUpDuotone
                                                        color="var(--mantine-color-blue-4)"
                                                        size="0.8rem"
                                                        style={{ flexShrink: 0 }}
                                                    />
                                                    <Box style={{ minWidth: 0 }}>
                                                        <Text c="dimmed" lh={1.1} size="10px">
                                                            {t('traffic-usage.upload')}
                                                        </Text>
                                                        <Text
                                                            className={styles.tabular}
                                                            fw={650}
                                                            size="xs"
                                                            truncate="end"
                                                        >
                                                            {stat.upload === '0'
                                                                ? '0 B'
                                                                : stat.upload}
                                                        </Text>
                                                    </Box>
                                                </Group>
                                                <Group align="center" gap={6} wrap="nowrap">
                                                    <PiArrowDownDuotone
                                                        color="var(--mantine-color-teal-4)"
                                                        size="0.8rem"
                                                        style={{ flexShrink: 0 }}
                                                    />
                                                    <Box style={{ minWidth: 0 }}>
                                                        <Text c="dimmed" lh={1.1} size="10px">
                                                            {t('traffic-usage.download')}
                                                        </Text>
                                                        <Text
                                                            className={styles.tabular}
                                                            fw={650}
                                                            size="xs"
                                                            truncate="end"
                                                        >
                                                            {stat.download === '0'
                                                                ? '0 B'
                                                                : stat.download}
                                                        </Text>
                                                    </Box>
                                                </Group>
                                            </SimpleGrid>
                                        </Box>
                                    ))}
                                </Stack>
                            ) : (
                                <Center py="md">
                                    <Stack align="center" gap={6}>
                                        <ThemeIcon
                                            color="gray"
                                            radius="xl"
                                            size="sm"
                                            variant="light"
                                        >
                                            <PiProhibitDuotone size="0.95rem" />
                                        </ThemeIcon>
                                        <Text c="dimmed" size="xs" ta="center">
                                            {t('node-details-card.no-outbound-traffic-data')}
                                        </Text>
                                    </Stack>
                                </Center>
                            )}
                        </Card>
                    </SimpleGrid>
                </SectionCard.Section>
            </SectionCard.Root>
        )
    }
)
