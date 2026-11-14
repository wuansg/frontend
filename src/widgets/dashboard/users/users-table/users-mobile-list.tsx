import type {
    MRT_ColumnFiltersState,
    MRT_PaginationState,
    MRT_RowSelectionState,
    MRT_SortingState,
    MRT_TableInstance
} from '@kastov/mantine-react-table-open'

import { UsersTableSelectionFeature } from '@features/ui/dashboard/users/users-table-selection/users-table-selection.feature'
import {
    ActionIcon,
    ActionIconGroup,
    Alert,
    Badge,
    Box,
    Checkbox,
    CloseButton,
    Group,
    Indicator,
    Pagination,
    Progress,
    Select,
    Skeleton,
    Stack,
    Text,
    TextInput,
    Tooltip
} from '@mantine/core'
import {
    GetNodesCommand,
    GetUsersCommand,
    RESET_PERIODS,
    TUsersStatus,
    USERS_STATUS
} from '@remnawave/backend-contract'
import { UserStatusBadge } from '@widgets/dashboard/users/user-status-badge'
import ReactCountryFlag from 'react-country-flag'
import { useTranslation } from 'react-i18next'
import {
    TbArrowsSort,
    TbBolt,
    TbCalendar,
    TbEdit,
    TbSearch,
    TbShieldSearch,
    TbWifi
} from 'react-icons/tb'

import { showModal } from '@shared/_modals/show-modal'
import { getUserStatusOptions } from '@shared/constants/forms/user-status.constants'
import { EmptyPageLayout } from '@shared/ui/layouts/empty-page'
import { prettifyBytesUtil } from '@shared/utils/bytes'
import {
    getConnectionStatusColorUtil,
    getExpirationTextUtil,
    getTimeAgoUtil
} from '@shared/utils/time-utils'

import { useUsersTableSelectionStoreActions } from '@entities/dashboard/users/users-table-selection'

import classes from './UsersMobileList.module.css'

type TUserRow = GetUsersCommand.Response['response']['users'][number]

interface IUsersMobileListProps {
    columnFilters: MRT_ColumnFiltersState
    isError: boolean
    isLoading: boolean
    nodes?: GetNodesCommand.Response['response']
    onColumnFiltersChange: (
        updater: ((prev: MRT_ColumnFiltersState) => MRT_ColumnFiltersState) | MRT_ColumnFiltersState
    ) => void
    onPaginationChange: (
        updater: ((prev: MRT_PaginationState) => MRT_PaginationState) | MRT_PaginationState
    ) => void
    onSortingChange: (
        updater: ((prev: MRT_SortingState) => MRT_SortingState) | MRT_SortingState
    ) => void
    pagination: MRT_PaginationState
    sorting: MRT_SortingState
    table: MRT_TableInstance<TUserRow>
    tableSelection: MRT_RowSelectionState
    total: number
    users: TUserRow[]
}

const STATUS_STRIPE_COLOR: Record<TUsersStatus, string> = {
    [USERS_STATUS.ACTIVE]: 'var(--mantine-color-teal-5)',
    [USERS_STATUS.LIMITED]: 'var(--mantine-color-orange-5)',
    [USERS_STATUS.EXPIRED]: 'var(--mantine-color-red-5)',
    [USERS_STATUS.DISABLED]: 'var(--mantine-color-gray-5)'
}

export function UsersMobileList({
    users,
    total,
    nodes,
    isLoading,
    isError,
    columnFilters,
    pagination,
    sorting,
    tableSelection,
    table,
    onColumnFiltersChange,
    onPaginationChange,
    onSortingChange
}: IUsersMobileListProps) {
    const { t, i18n } = useTranslation()
    const selectionActions = useUsersTableSelectionStoreActions()

    const usernameFilter =
        (columnFilters.find((f) => f.id === 'username')?.value as string | undefined) ?? ''
    const statusFilter =
        (columnFilters.find((f) => f.id === 'status')?.value as string | undefined) ?? 'ALL'

    const sortKey = sorting[0] ? `${sorting[0].id}:${sorting[0].desc ? 'desc' : 'asc'}` : 'id:desc'

    const setFilterValue = (id: string, value: string | undefined) => {
        onColumnFiltersChange((prev) => {
            const without = prev.filter((item) => item.id !== id)
            if (!value) return without
            return [...without, { id, value }]
        })
        onPaginationChange((prev) => ({ ...prev, pageIndex: 0 }))
    }

    const handleSortChange = (nextValue: null | string) => {
        if (!nextValue) return
        const [id, dir] = nextValue.split(':')
        onSortingChange([{ id, desc: dir === 'desc' }])
        onPaginationChange((prev) => ({ ...prev, pageIndex: 0 }))
    }

    const statusPills = [
        { value: 'ALL', label: t('hosts-overview.widget.filter-all') },
        ...getUserStatusOptions(t)
    ]

    const sortOptions = [
        { value: 'id:desc', label: t('users-mobile.sort.newest') },
        { value: 'id:asc', label: t('users-mobile.sort.oldest') },
        { value: 'usedTrafficBytes:desc', label: t('users-mobile.sort.traffic-desc') },
        { value: 'expireAt:asc', label: t('users-mobile.sort.expire-asc') },
        { value: 'userTraffic.onlineAt:desc', label: t('users-mobile.sort.online-desc') }
    ]

    const totalPages = Math.max(1, Math.ceil(total / pagination.pageSize))
    const rangeStart = total === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1
    const rangeEnd = Math.min(total, (pagination.pageIndex + 1) * pagination.pageSize)
    const selectedCount = Object.keys(tableSelection).length

    return (
        <Box className={classes.container}>
            <Box className={classes.toolbar}>
                <Group gap="xs" wrap="nowrap">
                    <TextInput
                        flex={1}
                        leftSection={<TbSearch size={15} />}
                        onChange={(event) =>
                            setFilterValue('username', event.currentTarget.value || undefined)
                        }
                        placeholder={t('users-mobile.search-placeholder')}
                        rightSection={
                            usernameFilter ? (
                                <CloseButton
                                    onClick={() => setFilterValue('username', undefined)}
                                    size="sm"
                                />
                            ) : null
                        }
                        size="xs"
                        value={usernameFilter}
                    />
                    <ActionIconGroup>
                        <Tooltip
                            label={i18n.language.startsWith('zh') ? '访问审计' : 'Access audit'}
                            withArrow
                        >
                            <ActionIcon
                                aria-label="Access audit"
                                color="indigo"
                                onClick={() => showModal('users_accessAuditModal', {})}
                                size="md"
                                variant="soft"
                            >
                                <TbShieldSearch size={16} />
                            </ActionIcon>
                        </Tooltip>
                        <Tooltip label={t('common.bulk-actions')} withArrow>
                            <ActionIcon
                                color="green"
                                onClick={() => showModal('users_bulkAllUsersActionsModal')}
                                size="md"
                                variant="soft"
                            >
                                <TbBolt size={16} />
                            </ActionIcon>
                        </Tooltip>
                        <Tooltip label={t('common.bulk-edit')} withArrow>
                            <ActionIcon
                                color="red"
                                onClick={() => showModal('users_bulkAllUsersUpdateModal')}
                                size="md"
                                variant="soft"
                            >
                                <TbEdit size={16} />
                            </ActionIcon>
                        </Tooltip>
                    </ActionIconGroup>
                </Group>

                <Box className={classes.statusPills}>
                    {statusPills.map((pill) => {
                        const active = statusFilter === pill.value
                        return (
                            <Badge
                                className={classes.statusPill}
                                color={active ? 'cyan' : 'gray'}
                                key={pill.value}
                                onClick={() =>
                                    setFilterValue(
                                        'status',
                                        pill.value === 'ALL' ? undefined : pill.value
                                    )
                                }
                                size="sm"
                                variant={active ? 'filled' : 'light'}
                            >
                                {pill.label}
                            </Badge>
                        )
                    })}
                </Box>

                <Group gap="xs" justify="space-between" wrap="nowrap">
                    <Select
                        allowDeselect={false}
                        comboboxProps={{ withinPortal: true }}
                        data={sortOptions}
                        flex={1}
                        leftSection={<TbArrowsSort size={14} />}
                        onChange={handleSortChange}
                        size="xs"
                        value={sortKey}
                    />
                    <Text c="dimmed" className={classes.tabular} fw={500} size="xs">
                        {rangeStart}–{rangeEnd} / {total}
                    </Text>
                </Group>
            </Box>

            {isError && (
                <Alert color="red" variant="light">
                    {t('user-table.widget.error-loading-data')}
                </Alert>
            )}

            {selectedCount > 0 && (
                <Box className={classes.selectionBanner}>
                    <UsersTableSelectionFeature
                        resetRowSelection={table.resetRowSelection}
                        toggleAllPageRowsSelected={table.toggleAllPageRowsSelected}
                    />
                </Box>
            )}

            {isLoading ? (
                <Stack gap="xs">
                    {Array.from({ length: 5 }).map((_, idx) => (
                        <Skeleton height={108} key={idx} radius="md" />
                    ))}
                </Stack>
            ) : users.length === 0 ? (
                <EmptyPageLayout />
            ) : (
                <Stack gap="xs">
                    {users.map((user) => {
                        const rowKey = user.id?.toString() ?? user.shortUuid
                        const isSelected = Boolean(tableSelection[rowKey])
                        const usedBytes = user.userTraffic.usedTrafficBytes
                        const limitBytes = user.trafficLimitBytes
                        const isUnlimited = limitBytes === 0
                        const percentage = isUnlimited
                            ? 0
                            : Math.min(100, (usedBytes * 100) / limitBytes)
                        const progressColor = isUnlimited
                            ? 'teal'
                            : percentage > 95
                              ? 'red'
                              : percentage > 80
                                ? 'yellow.6'
                                : 'teal'

                        const strategy = {
                            [RESET_PERIODS.MONTH]: t('data-usage.column.monthly'),
                            [RESET_PERIODS.WEEK]: t('data-usage.column.weekly'),
                            [RESET_PERIODS.DAY]: t('data-usage.column.daily'),
                            [RESET_PERIODS.MONTH_ROLLING]: `${t('data-usage.column.monthly')} ↻`,
                            [RESET_PERIODS.NO_RESET]: '∞'
                        }[user.trafficLimitStrategy]

                        const connectedNode = nodes?.find(
                            (n) => n.uuid === user.userTraffic.lastConnectedNodeUuid
                        )
                        const onlineColor = getConnectionStatusColorUtil(user.userTraffic.onlineAt)
                        const onlineAgo = getTimeAgoUtil(
                            user.userTraffic.onlineAt,
                            t,
                            i18n.language
                        )
                        const expireLabel = getExpirationTextUtil(user.expireAt, t, i18n)

                        return (
                            <Box
                                className={`${classes.card} ${isSelected ? classes.cardSelected : ''}`}
                                key={rowKey}
                                onClick={() =>
                                    showModal('users_viewUserModal', { userId: user.id })
                                }
                            >
                                <Box
                                    className={classes.statusStripe}
                                    style={{
                                        backgroundColor:
                                            STATUS_STRIPE_COLOR[user.status] ??
                                            'var(--mantine-color-gray-5)'
                                    }}
                                />

                                <Stack gap={8}>
                                    <Group gap="xs" justify="space-between" wrap="nowrap">
                                        <Group gap={8} miw={0} style={{ flex: 1 }} wrap="nowrap">
                                            <Box
                                                onClick={(e) => e.stopPropagation()}
                                                style={{ display: 'flex', alignItems: 'center' }}
                                            >
                                                <Checkbox
                                                    checked={isSelected}
                                                    color="cyan"
                                                    onChange={(event) => {
                                                        const checked = event.currentTarget.checked
                                                        selectionActions.setTableSelection(
                                                            (prev) => {
                                                                const next = { ...prev }
                                                                if (checked) {
                                                                    next[rowKey] = true
                                                                } else {
                                                                    delete next[rowKey]
                                                                }
                                                                return next
                                                            }
                                                        )
                                                    }}
                                                    size="sm"
                                                    variant="outline"
                                                />
                                            </Box>
                                            <Indicator
                                                color={onlineColor}
                                                inline
                                                size={9}
                                                zIndex={0}
                                            />
                                            <Text fw={600} size="sm" truncate="end">
                                                {user.username}
                                            </Text>
                                            <Text
                                                c="dimmed"
                                                className={classes.tabular}
                                                fw={500}
                                                size="xs"
                                                style={{ flexShrink: 0 }}
                                            >
                                                #{user.id}
                                            </Text>
                                        </Group>

                                        <UserStatusBadge
                                            size="sm"
                                            status={user.status}
                                            style={{ flexShrink: 0 }}
                                        />
                                    </Group>

                                    <Box>
                                        <Group
                                            gap="xs"
                                            justify="space-between"
                                            mb={4}
                                            wrap="nowrap"
                                        >
                                            <Text
                                                className={classes.tabular}
                                                fw={600}
                                                size="xs"
                                                truncate="end"
                                            >
                                                {prettifyBytesUtil(usedBytes) || '0 B'}{' '}
                                                <Text c="dimmed" component="span" size="xs">
                                                    /{' '}
                                                    {isUnlimited
                                                        ? '∞'
                                                        : prettifyBytesUtil(limitBytes) || '∞'}
                                                </Text>
                                            </Text>
                                            <Text
                                                c="dimmed"
                                                className={classes.tabular}
                                                fw={500}
                                                size="xs"
                                                style={{ flexShrink: 0 }}
                                            >
                                                {isUnlimited
                                                    ? strategy
                                                    : `${percentage.toFixed(0)}% · ${strategy}`}
                                            </Text>
                                        </Group>
                                        <Progress
                                            color={progressColor}
                                            radius="xl"
                                            size={5}
                                            value={isUnlimited ? 100 : percentage}
                                        />
                                    </Box>

                                    <Group gap={8} justify="space-between" wrap="wrap">
                                        <Group gap={10} miw={0} wrap="nowrap">
                                            <Group gap={4} style={{ flexShrink: 0 }} wrap="nowrap">
                                                <TbCalendar
                                                    color="var(--mantine-color-dimmed)"
                                                    size={13}
                                                />
                                                <Text
                                                    c="dimmed"
                                                    className={classes.tabular}
                                                    size="xs"
                                                >
                                                    {expireLabel}
                                                </Text>
                                            </Group>

                                            <Group gap={4} miw={0} wrap="nowrap">
                                                <TbWifi
                                                    color="var(--mantine-color-dimmed)"
                                                    size={13}
                                                    style={{ flexShrink: 0 }}
                                                />
                                                <Text c="dimmed" size="xs" truncate="end">
                                                    {onlineAgo}
                                                </Text>
                                            </Group>
                                        </Group>

                                        <Group gap={4} wrap="nowrap">
                                            {connectedNode && (
                                                <Badge
                                                    color="cyan"
                                                    leftSection={
                                                        connectedNode.countryCode &&
                                                        connectedNode.countryCode !== 'XX' ? (
                                                            <ReactCountryFlag
                                                                countryCode={
                                                                    connectedNode.countryCode
                                                                }
                                                                style={{
                                                                    fontSize: '0.95em',
                                                                    borderRadius: '2px'
                                                                }}
                                                            />
                                                        ) : undefined
                                                    }
                                                    maw={120}
                                                    size="xs"
                                                    variant="soft"
                                                >
                                                    {connectedNode.name}
                                                </Badge>
                                            )}
                                            {user.tag && (
                                                <Badge color="gray" size="xs" variant="light">
                                                    {user.tag}
                                                </Badge>
                                            )}
                                            {user.activeInternalSquads.length > 0 && (
                                                <Badge
                                                    color="violet"
                                                    maw={100}
                                                    size="xs"
                                                    variant="soft"
                                                >
                                                    {user.activeInternalSquads[0].name}
                                                    {user.activeInternalSquads.length > 1
                                                        ? ` +${user.activeInternalSquads.length - 1}`
                                                        : ''}
                                                </Badge>
                                            )}
                                        </Group>
                                    </Group>
                                </Stack>
                            </Box>
                        )
                    })}
                </Stack>
            )}

            {totalPages > 1 && (
                <Group justify="center" py="xs">
                    <Pagination
                        onChange={(page) =>
                            onPaginationChange((prev) => ({ ...prev, pageIndex: page - 1 }))
                        }
                        siblings={0}
                        size="sm"
                        total={totalPages}
                        value={pagination.pageIndex + 1}
                    />
                </Group>
            )}
        </Box>
    )
}
