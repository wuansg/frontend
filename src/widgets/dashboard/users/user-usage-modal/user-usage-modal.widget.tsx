import {
    ActionIcon,
    Drawer,
    Group,
    SegmentedControl,
    Select,
    SimpleGrid,
    Stack
} from '@mantine/core'
import { TbCalendar, TbChartPie, TbRefresh, TbServer2, TbWorldWww } from 'react-icons/tb'
import { DatePickerInput, DatesRangeValue } from '@mantine/dates'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import dayjs from 'dayjs'

import { UserUsageSparklineCardWidget } from '@widgets/dashboard/users/user-usage-statistic/usage-sparkline-card'
import { UserUsageBarchartWidget } from '@widgets/dashboard/users/user-usage-statistic/usage-barchart'
import { HostsStatisticBarchartWidget } from '@widgets/dashboard/hosts-statistic/statistic-barchart'
import { useGetStatsUserHostsUsage, useGetStatsUserUsage } from '@shared/api/hooks'
import { TopLeaderboardCardShared } from '@shared/ui/leaderboard-item-card'
import { BaseOverlayHeader } from '@shared/ui/overlays/base-overlay-header'
import { CountryFlag } from '@shared/ui/get-country-flag'

import { IProps } from './interfaces'

type UsageView = 'hosts' | 'nodes'

const TOP_LIMIT_OPTIONS = [
    { value: '5', label: 'Top 5' },
    { value: '10', label: 'Top 10' },
    { value: '20', label: 'Top 20' },
    { value: '30', label: 'Top 30' },
    { value: '40', label: 'Top 40' },
    { value: '50', label: 'Top 50' },
    { value: '60', label: 'Top 60' },
    { value: '70', label: 'Top 70' },
    { value: '80', label: 'Top 80' },
    { value: '90', label: 'Top 90' },
    { value: '100', label: 'Top 100' }
]

const DEFAULT_TOP_LIMIT = 20

const DEFAULT_DATE_RANGE = {
    start: dayjs().subtract(6, 'day').format('YYYY-MM-DD'),
    end: dayjs().format('YYYY-MM-DD')
}

export const UserUsageModalWidget = (props: IProps) => {
    const { userUuid, opened, onClose } = props
    const { t, i18n } = useTranslation()

    const [rawRange, setRawRange] = useState<[null | string, null | string]>([
        DEFAULT_DATE_RANGE.start,
        DEFAULT_DATE_RANGE.end
    ])

    const [queryRange, setQueryRange] = useState<{ end: string; start: string }>(DEFAULT_DATE_RANGE)
    const [topLimit, setTopLimit] = useState<number>(DEFAULT_TOP_LIMIT)
    const [usageView, setUsageView] = useState<UsageView>('nodes')

    const handleDateRangeChange = (value: DatesRangeValue<string>) => {
        if (value[0] === null && value[1] === null) {
            setRawRange([DEFAULT_DATE_RANGE.start, DEFAULT_DATE_RANGE.end])
            setQueryRange(DEFAULT_DATE_RANGE)
            return
        }

        setRawRange(value)
        if (!value[0] || !value[1]) return

        const startDate = value[0]
        const endDate = value[1]

        if (!dayjs(startDate).isValid() || !dayjs(endDate).isValid()) return

        const startISO = dayjs(startDate).format('YYYY-MM-DD')
        const endISO = dayjs(endDate).format('YYYY-MM-DD')

        setQueryRange({ start: startISO, end: endISO })
    }

    const {
        data: userUsageStats,
        isLoading: isUserUsageLoading,
        refetch: refetchUserUsage,
        isRefetching: isUserUsageRefetching
    } = useGetStatsUserUsage({
        route: {
            uuid: userUuid
        },
        query: {
            start: queryRange.start,
            end: queryRange.end,
            topNodesLimit: topLimit
        },
        rQueryParams: {
            enabled: opened && usageView === 'nodes' && Boolean(queryRange.start && queryRange.end)
        }
    })

    const {
        data: userHostsUsageStats,
        isLoading: isUserHostsUsageLoading,
        refetch: refetchUserHostsUsage,
        isRefetching: isUserHostsUsageRefetching
    } = useGetStatsUserHostsUsage({
        route: {
            uuid: userUuid
        },
        query: {
            start: queryRange.start,
            end: queryRange.end,
            topHostsLimit: topLimit
        },
        rQueryParams: {
            enabled: opened && usageView === 'hosts' && Boolean(queryRange.start && queryRange.end)
        }
    })

    const activeStats = usageView === 'nodes' ? userUsageStats : userHostsUsageStats
    const isLoading = usageView === 'nodes' ? isUserUsageLoading : isUserHostsUsageLoading
    const isRefetching = usageView === 'nodes' ? isUserUsageRefetching : isUserHostsUsageRefetching
    const refetch = usageView === 'nodes' ? refetchUserUsage : refetchUserHostsUsage

    const handleClose = () => {
        setRawRange([DEFAULT_DATE_RANGE.start, DEFAULT_DATE_RANGE.end])
        setQueryRange(DEFAULT_DATE_RANGE)
        setTopLimit(DEFAULT_TOP_LIMIT)
        setUsageView('nodes')
        onClose()
    }

    return (
        <Drawer
            keepMounted={false}
            onClose={handleClose}
            opened={opened}
            position="right"
            size="900px"
            title={
                <BaseOverlayHeader
                    iconColor="teal"
                    IconComponent={TbChartPie}
                    iconVariant="soft"
                    title={t('user-usage-modal.widget.traffic-statistics')}
                />
            }
        >
            <Stack gap="md">
                <Group justify="space-between">
                    <SegmentedControl
                        data={[
                            { label: t('constants.nodes'), value: 'nodes' },
                            { label: t('constants.hosts'), value: 'hosts' }
                        ]}
                        onChange={(value) => setUsageView(value as UsageView)}
                        value={usageView}
                    />

                    <Group justify="flex-end">
                        <Select
                            allowDeselect={false}
                            data={TOP_LIMIT_OPTIONS}
                            leftSection={
                                usageView === 'nodes' ? (
                                    <TbServer2 size="20px" />
                                ) : (
                                    <TbWorldWww size="20px" />
                                )
                            }
                            onChange={(value) => setTopLimit(Number(value))}
                            size="md"
                            value={String(topLimit)}
                            w={150}
                        />
                        <DatePickerInput
                            allowSingleDateInRange
                            dropdownType="modal"
                            headerControlsOrder={['previous', 'next', 'level']}
                            leftSection={<TbCalendar size="20px" />}
                            locale={i18n.language}
                            maxDate={new Date()}
                            onChange={handleDateRangeChange}
                            presets={[
                                {
                                    label: t('statistic-nodes.component.current-month'),
                                    value: [
                                        dayjs().startOf('month').format('YYYY-MM-DD'),
                                        dayjs().format('YYYY-MM-DD')
                                    ]
                                },
                                {
                                    label: t('statistic-nodes.component.3-days'),
                                    value: [
                                        dayjs().subtract(2, 'day').format('YYYY-MM-DD'),
                                        dayjs().format('YYYY-MM-DD')
                                    ]
                                },
                                {
                                    label: t('statistic-nodes.component.7-days'),
                                    value: [
                                        dayjs().subtract(6, 'day').format('YYYY-MM-DD'),
                                        dayjs().format('YYYY-MM-DD')
                                    ]
                                },
                                {
                                    label: t('statistic-nodes.component.14-days'),
                                    value: [
                                        dayjs().subtract(13, 'day').format('YYYY-MM-DD'),
                                        dayjs().format('YYYY-MM-DD')
                                    ]
                                },
                                {
                                    label: t('statistic-nodes.component.30-days'),
                                    value: [
                                        dayjs().subtract(29, 'day').format('YYYY-MM-DD'),
                                        dayjs().format('YYYY-MM-DD')
                                    ]
                                },
                                {
                                    label: t('statistic-nodes.component.60-days'),
                                    value: [
                                        dayjs().subtract(59, 'day').format('YYYY-MM-DD'),
                                        dayjs().format('YYYY-MM-DD')
                                    ]
                                },
                                {
                                    label: t('statistic-nodes.component.90-days'),
                                    value: [
                                        dayjs().subtract(89, 'day').format('YYYY-MM-DD'),
                                        dayjs().format('YYYY-MM-DD')
                                    ]
                                },
                                {
                                    label: t('statistic-nodes.component.180-days'),
                                    value: [
                                        dayjs().subtract(179, 'day').format('YYYY-MM-DD'),
                                        dayjs().format('YYYY-MM-DD')
                                    ]
                                }
                            ]}
                            size="md"
                            styles={{
                                calendarHeaderLevel: {
                                    justifyContent: 'flex-end'
                                },
                                presetsList: {
                                    justifyContent: 'center'
                                }
                            }}
                            type="range"
                            value={rawRange}
                            valueFormat="DD MMM, YYYY"
                        />

                        <ActionIcon
                            loading={isRefetching}
                            onClick={() => refetch()}
                            size="input-md"
                            variant="soft"
                        >
                            <TbRefresh size="24px" />
                        </ActionIcon>
                    </Group>
                </Group>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    <UserUsageSparklineCardWidget
                        isLoading={isLoading}
                        sparklineData={activeStats?.sparklineData}
                    />

                    {usageView === 'nodes' ? (
                        <TopLeaderboardCardShared
                            emptyText={t('user-usage-modal.widget.no-data-available')}
                            isLoading={isLoading}
                            items={userUsageStats?.topNodes?.map((node) => ({
                                color: node.color,
                                countryCode: node.countryCode,
                                name: node.name,
                                total: node.total
                            }))}
                            maxHeight={230}
                            renderCountryFlag={(item) => (
                                <CountryFlag countryCode={item.countryCode} />
                            )}
                        />
                    ) : (
                        <TopLeaderboardCardShared
                            emptyText={t('user-usage-modal.widget.no-data-available')}
                            isLoading={isLoading}
                            items={userHostsUsageStats?.topHosts?.map((host) => ({
                                color: host.color,
                                name: host.remark,
                                total: host.total
                            }))}
                            maxHeight={230}
                        />
                    )}
                </SimpleGrid>

                {usageView === 'nodes' ? (
                    <UserUsageBarchartWidget
                        categories={userUsageStats?.categories}
                        isLoading={isLoading}
                        series={userUsageStats?.series}
                    />
                ) : (
                    <HostsStatisticBarchartWidget
                        categories={userHostsUsageStats?.categories}
                        isLoading={isLoading}
                        series={userHostsUsageStats?.series}
                        showAddress={false}
                    />
                )}
            </Stack>
        </Drawer>
    )
}
