import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { ActionIcon, Group, NativeSelect, SegmentedControl, SimpleGrid, Stack } from '@mantine/core'
import { DatePickerInput, DatesRangeValue } from '@mantine/dates'
import { HostsStatisticBarchartWidget } from '@widgets/dashboard/hosts-statistic/statistic-barchart'
import { UserUsageBarchartWidget } from '@widgets/dashboard/users/user-usage-statistic/usage-barchart'
import { UserUsageSparklineCardWidget } from '@widgets/dashboard/users/user-usage-statistic/usage-sparkline-card'
import dayjs from 'dayjs'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TbCalendar, TbChartArcs, TbRefresh, TbServer2, TbWorldWww } from 'react-icons/tb'

import { showModal } from '@shared/_modals/show-modal'
import { useNiceMantineModal } from '@shared/_modals/use-nice-modal'
import { useGetStatsUserHostsUsage, useGetStatsUserUsage } from '@shared/api/hooks'
import { CompoundDrawerShared } from '@shared/ui/compound-drawer/compound-drawer.shared'
import { CountryFlag } from '@shared/ui/get-country-flag'
import { TopLeaderboardCardShared } from '@shared/ui/leaderboard-item-card'
import { BaseOverlayHeader } from '@shared/ui/overlays/base-overlay-header'
import { getDefaultDateRange } from '@shared/utils/time-utils'

type UsageView = 'hosts' | 'nodes'

const TOP_LIMIT_OPTIONS = [5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((value) => ({
    label: `Top ${value}`,
    value: String(value)
}))

const DEFAULT_TOP_LIMIT = 20

const getHostUsageName = (host: {
    hosts: { remark: string }[]
    isShared: boolean
    remark: string
}) =>
    host.isShared && host.hosts.length > 1
        ? host.hosts.map((item) => item.remark.trim()).join(' + ')
        : host.remark

interface IProps {
    userId: number
}

export const UserUsageModal = NiceModal.create((props: IProps) => {
    const { userId } = props
    const { t, i18n } = useTranslation()
    const defaultRange = getDefaultDateRange()
    const modal = useModal()
    const { modalProps } = useNiceMantineModal({ modal, drawer: true })

    const [rawRange, setRawRange] = useState<[null | string, null | string]>([
        defaultRange.start,
        defaultRange.end
    ])
    const [queryRange, setQueryRange] = useState<{ end: string; start: string }>(defaultRange)
    const [topLimit, setTopLimit] = useState(String(DEFAULT_TOP_LIMIT))
    const [usageView, setUsageView] = useState<UsageView>('nodes')

    const handleDateRangeChange = (value: DatesRangeValue<string>) => {
        if (value[0] === null && value[1] === null) {
            setRawRange([defaultRange.start, defaultRange.end])
            setQueryRange(defaultRange)
            return
        }

        setRawRange(value)
        if (!value[0] || !value[1]) return
        if (!dayjs(value[0]).isValid() || !dayjs(value[1]).isValid()) return

        setQueryRange({
            start: dayjs(value[0]).format('YYYY-MM-DD'),
            end: dayjs(value[1]).format('YYYY-MM-DD')
        })
    }

    const userUsageQuery = useGetStatsUserUsage({
        route: { userId },
        query: {
            start: queryRange.start,
            end: queryRange.end,
            topNodesLimit: Number(topLimit)
        },
        rQueryParams: {
            enabled: usageView === 'nodes' && Boolean(queryRange.start && queryRange.end)
        }
    })

    const userHostsUsageQuery = useGetStatsUserHostsUsage({
        route: { userId },
        query: {
            start: queryRange.start,
            end: queryRange.end,
            topHostsLimit: Number(topLimit)
        },
        rQueryParams: {
            enabled: usageView === 'hosts' && Boolean(queryRange.start && queryRange.end)
        }
    })

    const activeQuery = usageView === 'nodes' ? userUsageQuery : userHostsUsageQuery
    const activeStats = activeQuery.data
    const handleNodeClick = (nodeUuid: string) => {
        showModal('nodes_editNodeModal', { nodeUuid })
    }

    return (
        <CompoundDrawerShared
            drawerProps={{ ...modalProps, position: 'right', size: '900px' }}
            buttons={
                <ActionIcon
                    loading={activeQuery.isRefetching || activeQuery.isLoading}
                    onClick={() => activeQuery.refetch()}
                    size="lg"
                    variant="soft"
                >
                    <TbRefresh size="20px" />
                </ActionIcon>
            }
            title={
                <BaseOverlayHeader
                    iconColor="teal"
                    IconComponent={TbChartArcs}
                    iconVariant="soft"
                    title={t('common.usage-stats')}
                />
            }
        >
            <Stack gap="md">
                <Group gap="xs" justify="space-between" wrap="nowrap">
                    <SegmentedControl
                        data={[
                            { label: t('constants.nodes'), value: 'nodes' },
                            { label: t('constants.hosts'), value: 'hosts' }
                        ]}
                        onChange={(value) => setUsageView(value as UsageView)}
                        value={usageView}
                    />
                    <NativeSelect
                        data={TOP_LIMIT_OPTIONS}
                        leftSection={
                            usageView === 'nodes' ? (
                                <TbServer2 size="20px" />
                            ) : (
                                <TbWorldWww size="20px" />
                            )
                        }
                        onChange={(event) => setTopLimit(event.currentTarget.value)}
                        size="md"
                        value={topLimit}
                        miw="fit-content"
                    />
                    <DatePickerInput
                        allowSingleDateInRange
                        dropdownType="modal"
                        headerControlsOrder={['previous', 'next', 'level']}
                        leftSection={<TbCalendar size="20px" />}
                        locale={i18n.language}
                        maxDate={new Date()}
                        onChange={handleDateRangeChange}
                        size="md"
                        miw={0}
                        type="range"
                        value={rawRange}
                        valueFormat="DD MMM, YYYY"
                    />
                </Group>

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    <UserUsageSparklineCardWidget
                        isLoading={activeQuery.isLoading}
                        sparklineData={activeStats?.sparklineData}
                    />

                    {usageView === 'nodes' ? (
                        <TopLeaderboardCardShared
                            emptyText={t('user-usage-modal.widget.no-data-available')}
                            isLoading={userUsageQuery.isLoading}
                            onItemClick={(node) => handleNodeClick(node.uuid)}
                            items={userUsageQuery.data?.topNodes?.map((node) => ({
                                color: node.color,
                                countryCode: node.countryCode,
                                name: node.name,
                                total: node.total,
                                uuid: node.uuid
                            }))}
                            maxHeight={230}
                            renderCountryFlag={(item) => (
                                <CountryFlag countryCode={item.countryCode} />
                            )}
                        />
                    ) : (
                        <TopLeaderboardCardShared
                            emptyText={t('user-usage-modal.widget.no-data-available')}
                            isLoading={userHostsUsageQuery.isLoading}
                            items={userHostsUsageQuery.data?.topHosts?.map((host) => ({
                                color: host.color,
                                name: host.isShared
                                    ? `${getHostUsageName(host)} (${t('statistic-hosts.component.shared')})`
                                    : host.remark,
                                total: host.total,
                                uuid: host.groupKey
                            }))}
                            maxHeight={230}
                        />
                    )}
                </SimpleGrid>

                {usageView === 'nodes' ? (
                    <UserUsageBarchartWidget
                        categories={userUsageQuery.data?.categories}
                        isLoading={userUsageQuery.isLoading}
                        series={userUsageQuery.data?.series}
                    />
                ) : (
                    <HostsStatisticBarchartWidget
                        categories={userHostsUsageQuery.data?.categories}
                        isLoading={userHostsUsageQuery.isLoading}
                        series={userHostsUsageQuery.data?.series}
                        showAddress={false}
                    />
                )}
            </Stack>
        </CompoundDrawerShared>
    )
})
