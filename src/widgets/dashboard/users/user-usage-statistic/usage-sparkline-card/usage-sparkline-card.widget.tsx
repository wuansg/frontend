import { Sparkline } from '@mantine/charts'
import { Box, Card, SimpleGrid, Skeleton, Stack, Text } from '@mantine/core'
import { useTranslation } from 'react-i18next'

import { prettifyBytesUtil } from '@shared/utils/bytes'

interface IProps {
    isLoading: boolean
    sparklineData: number[] | undefined
    uploadSparklineData?: number[]
    downloadSparklineData?: number[]
}

export const UserUsageSparklineCardWidget = (props: IProps) => {
    const { sparklineData = [], uploadSparklineData, downloadSparklineData, isLoading } = props

    const { t } = useTranslation()

    const totalUsage = sparklineData.reduce((sum, val) => sum + val, 0)
    const uploadUsage = uploadSparklineData?.reduce((sum, val) => sum + val, 0) ?? 0
    const downloadUsage = downloadSparklineData?.reduce((sum, val) => sum + val, 0) ?? 0
    const hasDirectionalUsage =
        uploadSparklineData !== undefined && downloadSparklineData !== undefined
    const hasHistoricalUndirectedUsage =
        hasDirectionalUsage && uploadUsage + downloadUsage !== totalUsage

    let dailyAverage = 0
    let peakDay = 0
    let isDataAvailable = false

    if (sparklineData.length > 0) {
        peakDay = Math.max(...sparklineData)
        dailyAverage = totalUsage / sparklineData.length
        isDataAvailable = true
    }

    return (
        <Card p="md" withBorder>
            <Stack gap="md">
                <Box>
                    <Text c="dimmed" fw={500} mb={4} size="xs" tt="uppercase">
                        {t('user-usage-modal.widget.total-traffic')}
                    </Text>
                    {isLoading ? (
                        <Skeleton height={28} width={140} />
                    ) : (
                        <Text fw={700} style={{ fontSize: '2rem', lineHeight: 1 }}>
                            {prettifyBytesUtil(totalUsage) || '0 GiB'}
                        </Text>
                    )}
                </Box>

                <SimpleGrid cols={2} spacing="sm">
                    {hasDirectionalUsage && (
                        <>
                            <Box>
                                <Text c="dimmed" size="xs">
                                    ↑ {t('user-usage-modal.widget.upload-traffic')}
                                </Text>
                                {isLoading ? (
                                    <Skeleton height={20} mt={4} width={80} />
                                ) : (
                                    <Text fw={600} size="sm">
                                        {prettifyBytesUtil(uploadUsage) || '0 B'}
                                    </Text>
                                )}
                            </Box>
                            <Box>
                                <Text c="dimmed" size="xs">
                                    ↓ {t('user-usage-modal.widget.download-traffic')}
                                </Text>
                                {isLoading ? (
                                    <Skeleton height={20} mt={4} width={80} />
                                ) : (
                                    <Text fw={600} size="sm">
                                        {prettifyBytesUtil(downloadUsage) || '0 B'}
                                    </Text>
                                )}
                            </Box>
                        </>
                    )}
                    <Box>
                        <Text c="dimmed" size="xs">
                            Ø / day
                        </Text>
                        {isLoading ? (
                            <Skeleton height={20} mt={4} width={80} />
                        ) : (
                            <Text fw={600} size="sm">
                                {prettifyBytesUtil(dailyAverage) || '0 GiB'}
                            </Text>
                        )}
                    </Box>
                    <Box>
                        <Text c="dimmed" size="xs">
                            {t('statistic-sparkline-card.widget.peak')}
                        </Text>
                        {isLoading ? (
                            <Skeleton height={20} mt={4} width={80} />
                        ) : (
                            <Text fw={600} size="sm">
                                {prettifyBytesUtil(peakDay) || '0 GiB'}
                            </Text>
                        )}
                    </Box>
                </SimpleGrid>

                {hasHistoricalUndirectedUsage && !isLoading && (
                    <Text c="yellow.6" size="xs">
                        {t('user-usage-modal.widget.directional-data-after-upgrade')}
                    </Text>
                )}

                <Box style={{ flex: 1 }}>
                    {isLoading ? (
                        <Skeleton height={100} />
                    ) : (
                        <Sparkline
                            curveType="bump"
                            data={isDataAvailable ? sparklineData : [1, 1, 1]}
                            fillOpacity={0.3}
                            h={100}
                            strokeWidth={2}
                            trendColors={{
                                negative: 'red.6',
                                neutral: 'gray.5',
                                positive: 'teal.6'
                            }}
                            w="100%"
                        />
                    )}
                </Box>
            </Stack>
        </Card>
    )
}
