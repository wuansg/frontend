import { ActionIcon, Drawer, Group, Select, Stack } from '@mantine/core'
import { DatesRangeValue } from '@mantine/dates'
import { nprogress } from '@mantine/nprogress'
import dayjs from 'dayjs'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TbCalendar, TbChartArcs, TbRefresh, TbUsers } from 'react-icons/tb'

import { showModal } from '@shared/_modals/show-modal'
import { useGetStatsHostUsersUsage, useResolveUser } from '@shared/api/hooks'
import { DatePickerInput } from '@shared/ui/date-time-picker'
import { ITopLeaderboardItem, TopLeaderboardCardShared } from '@shared/ui/leaderboard-item-card'
import { BaseOverlayHeader } from '@shared/ui/overlays/base-overlay-header'
import { TrafficDirectionControl } from '@shared/ui/traffic-usage'
import { getDefaultDateRange } from '@shared/utils/time-utils'
import { selectTraffic, TrafficDirection } from '@shared/utils/traffic-usage'

import { MODALS, useModalCloseActions, useModalState } from '@entities/dashboard/modal-store'

import { HostUsersSparklineCardWidget } from './usage-sparkline-card'

const TOP_USERS_LIMIT_OPTIONS = [
    { value: '5', label: 'Top 5' },
    { value: '10', label: 'Top 10' },
    { value: '30', label: 'Top 30' },
    { value: '50', label: 'Top 50' },
    { value: '100', label: 'Top 100' },
    { value: '500', label: 'Top 500' },
    { value: '1000', label: 'Top 1000' },
    { value: '2000', label: 'Top 2000' }
]

const DEFAULT_TOP_USERS_LIMIT = 100

export const HostUsersUsageDrawer = () => {
    const { isOpen, internalState: host } = useModalState(MODALS.SHOW_HOST_USERS_USAGE_DRAWER)
    const [handleClose, clearInternalState] = useModalCloseActions(
        MODALS.SHOW_HOST_USERS_USAGE_DRAWER
    )

    const { t, i18n } = useTranslation()
    const defaultRange = getDefaultDateRange()
    const [trafficDirection, setTrafficDirection] = useState<TrafficDirection>('total')

    const [topUsersLimit, setTopUsersLimit] = useState<number>(DEFAULT_TOP_USERS_LIMIT)
    const [rawRange, setRawRange] = useState<[null | string, null | string]>([
        defaultRange.start,
        defaultRange.end
    ])

    const [queryRange, setQueryRange] = useState<{ end: string; start: string }>(defaultRange)
    const { mutateAsync: resolveUser } = useResolveUser()

    const handleViewUser = async (user: ITopLeaderboardItem) => {
        nprogress.start()
        try {
            const result = await resolveUser({ variables: { username: user.name } })
            if (result.id) {
                showModal('users_userUsageModal', {
                    userId: result.id,
                    initialRange: queryRange,
                    initialDirection: trafficDirection,
                    initialView: 'hosts'
                })
            }
        } finally {
            nprogress.complete()
        }
    }

    const handleDateRangeChange = (value: DatesRangeValue<string>) => {
        if (value[0] === null && value[1] === null) {
            const todayRange = getDefaultDateRange()
            setRawRange([todayRange.start, todayRange.end])
            setQueryRange(todayRange)
            return
        }

        setRawRange(value)
        if (!value[0] || !value[1]) return

        const startDate = value[0]
        const endDate = value[1]

        if (!dayjs(startDate).isValid() || !dayjs(endDate).isValid()) return

        const startISO = dayjs.utc(startDate).format('YYYY-MM-DD')
        const endISO = dayjs.utc(endDate).format('YYYY-MM-DD')

        setQueryRange({ start: startISO, end: endISO })
    }

    const {
        data: hostUsersStats,
        isLoading,
        refetch,
        isRefetching
    } = useGetStatsHostUsersUsage({
        route: {
            uuid: host?.hostUuid ?? ''
        },
        query: {
            start: queryRange.start,
            end: queryRange.end,
            trafficDirection,
            topUsersLimit
        },
        rQueryParams: {
            enabled: isOpen && Boolean(host?.hostUuid && queryRange.start && queryRange.end)
        }
    })

    return (
        <Drawer
            keepMounted={false}
            onClose={handleClose}
            onExitTransitionEnd={() => {
                const todayRange = getDefaultDateRange()
                setRawRange([todayRange.start, todayRange.end])
                setQueryRange(todayRange)
                setTopUsersLimit(DEFAULT_TOP_USERS_LIMIT)
                setTrafficDirection('total')
                clearInternalState()
            }}
            opened={isOpen}
            overlayProps={{ backgroundOpacity: 0.6, blur: 0 }}
            padding="lg"
            position="right"
            size="620px"
            title={
                <BaseOverlayHeader
                    iconColor="teal"
                    IconComponent={TbChartArcs}
                    iconVariant="soft"
                    subtitle={host?.hostRemark}
                    title={t('host-users-usage-drawer.widget.user-traffic-statistics')}
                />
            }
        >
            <Stack gap="md">
                <TrafficDirectionControl value={trafficDirection} onChange={setTrafficDirection} />
                <Group gap="xs" justify="space-between" wrap="wrap">
                    <Select
                        allowDeselect={false}
                        data={TOP_USERS_LIMIT_OPTIONS}
                        leftSection={<TbUsers size="18px" />}
                        onChange={(value) => {
                            if (value) setTopUsersLimit(Number(value))
                        }}
                        size="sm"
                        value={String(topUsersLimit)}
                        w={140}
                    />

                    <DatePickerInput
                        allowSingleDateInRange
                        dropdownType="modal"
                        headerControlsOrder={['previous', 'next', 'level']}
                        leftSection={<TbCalendar size="18px" />}
                        locale={i18n.language}
                        miw={180}
                        onChange={handleDateRangeChange}
                        size="sm"
                        style={{ flex: '1 1 200px' }}
                        styles={{
                            calendarHeaderLevel: {
                                justifyContent: 'flex-end'
                            }
                        }}
                        type="range"
                        value={rawRange}
                        valueFormat="DD MMM, YYYY"
                    />

                    <ActionIcon
                        loading={isRefetching}
                        onClick={() => refetch()}
                        size="input-sm"
                        variant="soft"
                    >
                        <TbRefresh size="18px" />
                    </ActionIcon>
                </Group>

                <HostUsersSparklineCardWidget
                    direction={trafficDirection}
                    downloadSparklineData={hostUsersStats?.downloadSparklineData}
                    isLoading={isLoading}
                    sparklineData={hostUsersStats?.sparklineData}
                    uploadSparklineData={hostUsersStats?.uploadSparklineData}
                />

                <TopLeaderboardCardShared
                    emptyText={t('host-users-usage-drawer.widget.no-data-available')}
                    isLoading={isLoading}
                    items={selectTraffic(hostUsersStats?.topUsers, trafficDirection)?.map(
                        (user) => ({
                            color: user.color,
                            name: user.username,
                            total: user.total
                        })
                    )}
                    maxHeight={460}
                    onItemClick={handleViewUser}
                    searchable
                    showRank
                    showShare
                    skeletonCount={8}
                    title={t('traffic-usage.leaderboard-title')}
                />
            </Stack>
        </Drawer>
    )
}
