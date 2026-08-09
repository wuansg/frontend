import { ActionIcon, Select, SimpleGrid, Stack } from '@mantine/core'
import { DatePickerInput, DatesRangeValue } from '@mantine/dates'
import { HostsStatisticBarchartWidget } from '@widgets/dashboard/hosts-statistic/statistic-barchart'
import { NodesStatisticSparklineCardWidget } from '@widgets/dashboard/nodes-statistic/statistic-sparkline-card'
import dayjs from 'dayjs'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HiChartPie } from 'react-icons/hi'
import { TbCalendar, TbRefresh, TbWorld } from 'react-icons/tb'

import { useGetStatsHostsUsage } from '@shared/api/hooks'
import { Page, PageHeaderShared } from '@shared/ui'
import { TopLeaderboardCardShared } from '@shared/ui/leaderboard-item-card'

const TOP_HOSTS_LIMIT_OPTIONS = [
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

const DEFAULT_TOP_HOSTS_LIMIT = 20

const DEFAULT_DATE_RANGE = {
    start: dayjs().subtract(6, 'day').format('YYYY-MM-DD'),
    end: dayjs().format('YYYY-MM-DD')
}

const getHostUsageName = (host: {
    hosts: { remark: string }[]
    isShared: boolean
    remark: string
}) =>
    host.isShared && host.hosts.length > 1
        ? host.hosts.map((item) => item.remark.trim()).join(' + ')
        : host.remark

export const StatisticHostsPage = () => {
    const { t, i18n } = useTranslation()

    const [rawRange, setRawRange] = useState<[null | string, null | string]>([
        DEFAULT_DATE_RANGE.start,
        DEFAULT_DATE_RANGE.end
    ])

    const [topHostsLimit, setTopHostsLimit] = useState<number>(DEFAULT_TOP_HOSTS_LIMIT)
    const [queryRange, setQueryRange] = useState<{ end: string; start: string }>(DEFAULT_DATE_RANGE)

    const {
        data: hostsStats,
        isLoading,
        refetch,
        isRefetching
    } = useGetStatsHostsUsage({
        query: {
            start: queryRange.start,
            end: queryRange.end,
            topHostsLimit
        },
        rQueryParams: {
            enabled: Boolean(queryRange.start && queryRange.end)
        }
    })

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

    return (
        <Page title={t('constants.hosts-statistics')}>
            <PageHeaderShared
                actions={
                    <>
                        <Select
                            allowDeselect={false}
                            data={TOP_HOSTS_LIMIT_OPTIONS}
                            leftSection={<TbWorld size="20px" />}
                            onChange={(value) => setTopHostsLimit(Number(value))}
                            size="md"
                            value={String(topHostsLimit)}
                            w={150}
                        />
                        <DatePickerInput
                            allowSingleDateInRange
                            dropdownType="modal"
                            headerControlsOrder={['previous', 'next', 'level']}
                            leftSection={<TbCalendar size="24px" />}
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
                    </>
                }
                icon={<HiChartPie size={24} />}
                title={t('constants.hosts-statistics')}
                wrapActions
            />

            <Stack gap="md">
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    <NodesStatisticSparklineCardWidget
                        isLoading={isLoading}
                        sparklineData={hostsStats?.sparklineData}
                    />

                    <TopLeaderboardCardShared
                        emptyText={t('statistic-nodes.component.no-data-available')}
                        isLoading={isLoading}
                        items={hostsStats?.topHosts?.map((host) => ({
                            color: host.color,
                            name: host.isShared
                                ? `${getHostUsageName(host)} (${t('statistic-hosts.component.shared')})`
                                : host.remark,
                            total: host.total,
                            uuid: host.groupKey
                        }))}
                        maxHeight={230}
                    />
                </SimpleGrid>

                <HostsStatisticBarchartWidget
                    categories={hostsStats?.categories}
                    isLoading={isLoading}
                    series={hostsStats?.series}
                />
            </Stack>
        </Page>
    )
}
