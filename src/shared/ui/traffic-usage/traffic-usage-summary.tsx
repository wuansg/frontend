import { Sparkline } from '@mantine/charts'
import {
    Badge,
    Box,
    Card,
    Group,
    SimpleGrid,
    Skeleton,
    Stack,
    Text,
    ThemeIcon
} from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { TbArrowDown, TbArrowsUpDown, TbArrowUp, TbChartAreaLine } from 'react-icons/tb'

import { prettifyBytesUtil } from '@shared/utils/bytes'
import { summarizeTraffic, TrafficDirection } from '@shared/utils/traffic-usage'

import classes from './traffic-usage.module.css'

export interface TrafficUsageSummaryProps {
    isLoading: boolean
    sparklineData: number[] | undefined
    uploadSparklineData?: number[]
    downloadSparklineData?: number[]
    direction?: TrafficDirection
    scope?: 'proxy' | 'node'
}

export function TrafficUsageSummary({
    isLoading,
    sparklineData = [],
    uploadSparklineData,
    downloadSparklineData,
    direction = 'total',
    scope = 'proxy'
}: TrafficUsageSummaryProps) {
    const { t } = useTranslation()
    const summary = summarizeTraffic(sparklineData, uploadSparklineData, downloadSparklineData)
    const selected =
        direction === 'upload'
            ? uploadSparklineData
            : direction === 'download'
              ? downloadSparklineData
              : sparklineData
    const data = selected ?? []
    const selectedAvailable = direction === 'total' || summary.directionalAvailable
    const average = data.length ? summary[direction] / data.length : 0
    const peak = data.reduce((maximum, value) => Math.max(maximum, value), 0)
    const bytes = (value: number) => prettifyBytesUtil(value) || '0 B'

    const accentColor = direction === 'upload' ? 'blue' : direction === 'download' ? 'teal' : 'cyan'
    const DirectionIcon =
        direction === 'upload' ? TbArrowUp : direction === 'download' ? TbArrowDown : TbArrowsUpDown

    const uploadPct =
        summary.directionalAvailable && summary.total > 0
            ? Math.min(100, Math.max(0, (summary.upload / summary.total) * 100))
            : 0
    const downloadPct =
        summary.directionalAvailable && summary.total > 0
            ? Math.min(100 - uploadPct, Math.max(0, (summary.download / summary.total) * 100))
            : 0

    return (
        <Card className={classes.summaryCard} data-direction={direction} p="md" radius="md">
            <Stack gap="sm" style={{ flex: 1 }}>
                <Group align="flex-start" justify="space-between" wrap="nowrap">
                    <Group align="center" gap="xs" style={{ minWidth: 0 }} wrap="nowrap">
                        <ThemeIcon color={accentColor} radius="md" size="lg" variant="light">
                            <DirectionIcon size={18} />
                        </ThemeIcon>
                        <Box style={{ minWidth: 0 }}>
                            <Text c="dimmed" fw={500} size="xs" truncate>
                                {t('traffic-usage.period-label', {
                                    direction: t(`traffic-usage.${direction}`)
                                })}
                            </Text>
                            {isLoading ? (
                                <Skeleton height={30} mt={4} width={150} />
                            ) : (
                                <Text className={classes.heroValue}>
                                    {selectedAvailable
                                        ? bytes(summary[direction])
                                        : t('traffic-usage.unavailable')}
                                </Text>
                            )}
                        </Box>
                    </Group>

                    {!isLoading && data.length > 0 && (
                        <Badge
                            className={classes.tabular}
                            color={accentColor}
                            radius="sm"
                            size="sm"
                            style={{ flexShrink: 0 }}
                            variant="light"
                        >
                            {t('traffic-usage.days-count', { count: data.length })}
                        </Badge>
                    )}
                </Group>

                <SimpleGrid cols={{ base: 3 }} spacing="xs">
                    {(['total', 'upload', 'download'] as const).map((key) => (
                        <Box
                            className={classes.metricTile}
                            data-active={direction === key ? 'true' : undefined}
                            data-direction={key}
                            key={key}
                        >
                            <Text c="dimmed" size="11px" truncate>
                                {key === 'upload'
                                    ? `↑ ${t('traffic-usage.upload')}`
                                    : key === 'download'
                                      ? `↓ ${t('traffic-usage.download')}`
                                      : t('traffic-usage.total')}
                            </Text>
                            {isLoading ? (
                                <Skeleton height={18} mt={4} width={68} />
                            ) : (
                                <Text
                                    className={classes.tabular}
                                    fw={650}
                                    mt={2}
                                    size="sm"
                                    truncate
                                >
                                    {key === 'total' || summary.directionalAvailable
                                        ? bytes(summary[key])
                                        : t('traffic-usage.unavailable')}
                                </Text>
                            )}
                        </Box>
                    ))}
                </SimpleGrid>

                {!isLoading && summary.directionalAvailable && summary.total > 0 && (
                    <Stack gap={5}>
                        <div className={classes.splitTrack}>
                            {uploadPct > 0 && (
                                <div
                                    className={classes.splitSegment}
                                    style={{
                                        width: `${uploadPct}%`,
                                        background: 'var(--mantine-color-blue-5)'
                                    }}
                                />
                            )}
                            {downloadPct > 0 && (
                                <div
                                    className={classes.splitSegment}
                                    style={{
                                        width: `${downloadPct}%`,
                                        background: 'var(--mantine-color-teal-5)'
                                    }}
                                />
                            )}
                        </div>
                        <Group justify="space-between" wrap="wrap">
                            <Text c="blue.4" className={classes.tabular} fw={500} size="xs">
                                ↑{' '}
                                {t('traffic-usage.upload-short', {
                                    percentage: uploadPct.toFixed(1)
                                })}
                            </Text>
                            <Text c="teal.4" className={classes.tabular} fw={500} size="xs">
                                ↓{' '}
                                {t('traffic-usage.download-share', {
                                    percentage: downloadPct.toFixed(1)
                                })}
                            </Text>
                        </Group>
                    </Stack>
                )}

                <SimpleGrid cols={2} spacing="xs">
                    <Box className={classes.metricTile}>
                        <Text c="dimmed" size="11px">
                            {t('traffic-usage.daily-average')}
                        </Text>
                        <Text className={classes.tabular} fw={600} mt={2} size="xs">
                            {isLoading || !selectedAvailable ? '—' : bytes(average)}
                        </Text>
                    </Box>
                    <Box className={classes.metricTile}>
                        <Text c="dimmed" size="11px">
                            {t('statistic-sparkline-card.widget.peak')}
                        </Text>
                        <Text className={classes.tabular} fw={600} mt={2} size="xs">
                            {isLoading || !selectedAvailable ? '—' : bytes(peak)}
                        </Text>
                    </Box>
                </SimpleGrid>

                {!isLoading && summary.undirected > 0 && (
                    <Text c="yellow.5" className={classes.tabular} size="xs">
                        {t('traffic-usage.undirected', { bytes: bytes(summary.undirected) })}
                    </Text>
                )}

                {!isLoading && summary.inconsistent && (
                    <Text c="red.5" size="xs">
                        {t('traffic-usage.inconsistent')}
                    </Text>
                )}

                <Box className={classes.sparklineFrame}>
                    <Group gap={6} justify="space-between" mb={4}>
                        <Group gap={4}>
                            <TbChartAreaLine
                                color="var(--mantine-color-dimmed)"
                                size={13}
                                style={{ flexShrink: 0 }}
                            />
                            <Text c="dimmed" size="11px">
                                {t(
                                    scope === 'node'
                                        ? 'traffic-usage.node-scope'
                                        : 'traffic-usage.proxy-scope'
                                )}
                            </Text>
                        </Group>
                    </Group>
                    {isLoading ? (
                        <Skeleton height={84} radius="sm" />
                    ) : (
                        <Sparkline
                            color={
                                direction === 'upload'
                                    ? 'blue.5'
                                    : direction === 'download'
                                      ? 'teal.5'
                                      : 'cyan.5'
                            }
                            curveType="monotone"
                            data={
                                data.length > 1
                                    ? data
                                    : data.length === 1
                                      ? [data[0], data[0]]
                                      : [0, 0]
                            }
                            fillOpacity={0.22}
                            h={84}
                            strokeWidth={2}
                        />
                    )}
                </Box>
            </Stack>
        </Card>
    )
}
