import { Sparkline } from '@mantine/charts'
import { Box, Card, Group, SimpleGrid, Skeleton, Stack, Text } from '@mantine/core'
import { useTranslation } from 'react-i18next'

import { prettifyBytesUtil } from '@shared/utils/bytes'
import { summarizeTraffic, TrafficDirection } from '@shared/utils/traffic-usage'

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

    return (
        <Card p="md" withBorder>
            <Stack gap="md">
                <Box>
                    <Text c="dimmed" fw={500} mb={4} size="xs">
                        {t('traffic-usage.period-label', {
                            direction: t(`traffic-usage.${direction}`)
                        })}
                    </Text>
                    {isLoading ? (
                        <Skeleton height={28} width={140} />
                    ) : (
                        <Text fw={700} size="xl">
                            {selectedAvailable
                                ? bytes(summary[direction])
                                : t('traffic-usage.unavailable')}
                        </Text>
                    )}
                </Box>
                <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="sm">
                    {(['total', 'upload', 'download'] as const).map((key) => (
                        <Box key={key}>
                            <Text c="dimmed" size="xs">
                                {t(`traffic-usage.${key}`)}
                            </Text>
                            {isLoading ? (
                                <Skeleton height={20} width={80} />
                            ) : (
                                <Text fw={600} size="sm">
                                    {key === 'total' || summary.directionalAvailable
                                        ? bytes(summary[key])
                                        : t('traffic-usage.unavailable')}
                                </Text>
                            )}
                        </Box>
                    ))}
                </SimpleGrid>
                <Group justify="space-between">
                    <Text c="dimmed" size="xs">
                        {t('traffic-usage.daily-average')}:{' '}
                        {isLoading || !selectedAvailable ? '—' : bytes(average)}
                    </Text>
                    <Text c="dimmed" size="xs">
                        {t('statistic-sparkline-card.widget.peak')}:{' '}
                        {isLoading || !selectedAvailable ? '—' : bytes(peak)}
                    </Text>
                </Group>
                {!isLoading && summary.directionalAvailable && summary.total > 0 && (
                    <Text c="dimmed" size="xs">
                        {t('traffic-usage.upload-share', {
                            percentage: ((summary.upload / summary.total) * 100).toFixed(1)
                        })}
                    </Text>
                )}
                {!isLoading && summary.undirected > 0 && (
                    <Text c="yellow.6" size="xs">
                        {t('traffic-usage.undirected', { bytes: bytes(summary.undirected) })}
                    </Text>
                )}
                {!isLoading && summary.inconsistent && (
                    <Text c="red.6" size="xs">
                        {t('traffic-usage.inconsistent')}
                    </Text>
                )}
                <Text c="dimmed" size="xs">
                    {t(scope === 'node' ? 'traffic-usage.node-scope' : 'traffic-usage.proxy-scope')}
                </Text>
                {isLoading ? (
                    <Skeleton height={70} />
                ) : (
                    <Sparkline
                        curveType="linear"
                        data={data.length ? data : [0, 0]}
                        fillOpacity={0.2}
                        h={70}
                        strokeWidth={2}
                        color={
                            direction === 'upload'
                                ? 'blue.6'
                                : direction === 'download'
                                  ? 'teal.6'
                                  : 'gray.6'
                        }
                    />
                )}
            </Stack>
        </Card>
    )
}
