import { ActionIcon, Select, SimpleGrid, Stack } from '@mantine/core'
import { DatePickerInput, DatesRangeValue } from '@mantine/dates'
import { UsersStatisticBarchartWidget } from '@widgets/dashboard/users-statistic/statistic-barchart'
import { UserUsageSparklineCardWidget } from '@widgets/dashboard/users/user-usage-statistic/usage-sparkline-card'
import dayjs from 'dayjs'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HiChartPie } from 'react-icons/hi'
import { TbCalendar, TbRefresh, TbUsers } from 'react-icons/tb'

import { showModal } from '@shared/_modals/show-modal'
import { useGetStatsUsersUsage } from '@shared/api/hooks'
import { Page, PageHeaderShared } from '@shared/ui'
import { TopLeaderboardCardShared } from '@shared/ui/leaderboard-item-card'
import { getDefaultDateRange } from '@shared/utils/time-utils'

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

export const StatisticUsersPage = () => {
    const { t, i18n } = useTranslation()
    const defaultRange = getDefaultDateRange()

    const [rawRange, setRawRange] = useState<[null | string, null | string]>([
        defaultRange.start,
        defaultRange.end
    ])

    const [topUsersLimit, setTopUsersLimit] = useState<number>(DEFAULT_TOP_USERS_LIMIT)
    const [queryRange, setQueryRange] = useState<{ end: string; start: string }>(defaultRange)

    const {
        data: usersStats,
        isLoading,
        refetch,
        isRefetching
    } = useGetStatsUsersUsage({
        query: {
            start: queryRange.start,
            end: queryRange.end,
            topUsersLimit
        },
        rQueryParams: {
            enabled: Boolean(queryRange.start && queryRange.end)
        }
    })

    const handleOpenUser = (userId: number) => {
        showModal('users_viewUserModal', { userId })
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

        setQueryRange({
            start: dayjs.utc(startDate).format('YYYY-MM-DD'),
            end: dayjs.utc(endDate).format('YYYY-MM-DD')
        })
    }

    return (
        <Page title={t('constants.users-statistics')}>
            <PageHeaderShared
                actions={
                    <>
                        <Select
                            allowDeselect={false}
                            data={TOP_USERS_LIMIT_OPTIONS}
                            leftSection={<TbUsers size="20px" />}
                            onChange={(value) => setTopUsersLimit(Number(value))}
                            size="md"
                            value={String(topUsersLimit)}
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
                title={t('constants.users-statistics')}
                wrapActions
            />

            <Stack gap="md">
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    <UserUsageSparklineCardWidget
                        isLoading={isLoading}
                        sparklineData={usersStats?.sparklineData}
                    />

                    <TopLeaderboardCardShared
                        emptyText={t('statistic-users.component.no-data-available')}
                        isLoading={isLoading}
                        items={usersStats?.topUsers?.map((user) => ({
                            color: user.color,
                            name: user.username,
                            total: user.total,
                            uuid: String(user.id)
                        }))}
                        maxHeight={230}
                        onItemClick={(user) => {
                            if (user.uuid) {
                                handleOpenUser(Number(user.uuid))
                            }
                        }}
                    />
                </SimpleGrid>

                <UsersStatisticBarchartWidget
                    categories={usersStats?.categories}
                    isLoading={isLoading}
                    onUserClick={handleOpenUser}
                    series={usersStats?.series}
                />
            </Stack>
        </Page>
    )
}
