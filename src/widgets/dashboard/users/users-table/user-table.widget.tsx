import { UserActionGroupFeature } from '@features/dashboard/users/users-action-group'
import { useUserTableColumns } from '@features/dashboard/users/users-table/model/use-table-columns'
import { UsersTableSelectionFeature } from '@features/ui/dashboard/users/users-table-selection/users-table-selection.feature'
import {
    MantineReactTable,
    MRT_ColumnFilterFnsState,
    MRT_ShowHideColumnsButton,
    MRT_ToggleDensePaddingButton,
    MRT_ToggleFiltersButton,
    MRT_ToggleFullScreenButton,
    useMantineReactTable
} from '@kastov/mantine-react-table-open'
import { ActionIcon, ActionIconGroup, Badge, Text, Tooltip } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PiUsersDuotone } from 'react-icons/pi'
import { TbBolt, TbEdit, TbShieldSearch } from 'react-icons/tb'
import { useSearchParams } from 'react-router'

import { showModal } from '@shared/_modals/show-modal'
import {
    useGetExternalSquads,
    useGetInternalSquads,
    useGetNodes,
    useGetUsers,
    useGetUserTags
} from '@shared/api/hooks'
import { SEARCH_PARAMS } from '@shared/constants/search-params'
import { usePreventTableBackScroll } from '@shared/hooks'
import { useIsMobile } from '@shared/hooks/use-is-mobile'
import { DEFAULT_PAGINATION_STATE, useMrtTableBinding } from '@shared/lib/mrt-table-store'
import { DataTableShared } from '@shared/ui/table'
import { sToMs } from '@shared/utils/time-utils'

import {
    useUsersTableSelectionStoreActions,
    useUsersTableSelectionStoreTableSelection
} from '@entities/dashboard/users/users-table-selection'
import { useUsersTableStore } from '@entities/dashboard/users/users-table-store'

import { UsersMobileList } from './users-mobile-list'

const MRT_TOOLBAR_BG_STYLE = {
    '--mrt-base-background-color': 'light-dark(var(--mantine-color-white), #1b2027)'
}

export function UserTableWidget() {
    const { t, i18n } = useTranslation()
    const isMobile = useIsMobile()

    const { data: internalSquads } = useGetInternalSquads()
    const { data: externalSquads } = useGetExternalSquads()
    const { data: nodes } = useGetNodes()
    const { data: tags } = useGetUserTags()

    const tableColumns = useUserTableColumns(internalSquads, externalSquads, nodes)
    const usersTableSelectionStoreActions = useUsersTableSelectionStoreActions()
    const tableSelection = useUsersTableSelectionStoreTableSelection()
    const [searchParams, setSearchParams] = useSearchParams()

    const { state: persistedTableState, handlers: persistedTableHandlers } =
        useMrtTableBinding(useUsersTableStore)

    const defaultFilterFns: Record<string, string> = {
        hwidDeviceLimit: 'equals',
        tag: 'equals',
        trafficLimitBytes: 'between'
    }

    const [columnFilterFns, setColumnFilterFns] = useState<MRT_ColumnFilterFnsState>(() =>
        Object.fromEntries(
            tableColumns.map(({ accessorKey }) => [
                accessorKey,
                defaultFilterFns[accessorKey!] ?? 'contains'
            ])
        )
    )

    usePreventTableBackScroll()

    const params = {
        start: persistedTableState.pagination.pageIndex * persistedTableState.pagination.pageSize,
        size: persistedTableState.pagination.pageSize,
        filters: persistedTableState.columnFilters.filter(({ value }) =>
            Array.isArray(value)
                ? value.some((bound) => bound !== null && bound !== undefined && bound !== '')
                : value !== null && value !== undefined && value !== ''
        ),
        filterModes: columnFilterFns,
        sorting: persistedTableState.sorting
    }

    const {
        data: usersResponse,
        isError,
        isFetching,
        isLoading,
        refetch
    } = useGetUsers({
        query: params,
        rQueryParams: {
            refetchInterval:
                usersTableSelectionStoreActions.getIdsLength() === 0 ? sToMs(25) : false
        }
    })

    useEffect(() => {
        if (isLoading) return
        const userId = searchParams.get(SEARCH_PARAMS.USER)
        if (!userId) return

        showModal('users_viewUserModal', { userId: Number(userId) })

        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev)
                next.delete(SEARCH_PARAMS.USER)
                return next
            },
            { replace: true }
        )
    }, [isLoading, searchParams, setSearchParams])

    const selectedCount = Object.keys(tableSelection).length

    const table = useMantineReactTable({
        columns: tableColumns,
        data: usersResponse?.users ?? [],
        enableFacetedValues: true,
        getFacetedUniqueValues: (_table, columnId) => () => {
            if (columnId === 'tag') {
                return new Map<string, number>(tags?.tags.map((tag) => [tag, 0]) ?? [])
            }
            if (columnId === 'status') {
                return new Map<string, number>(
                    ['ACTIVE', 'DISABLED', 'LIMITED', 'EXPIRED'].map((status) => [status, 0]) ?? []
                )
            }
            return new Map<string, number>()
        },
        columnFilterDisplayMode: 'subheader',
        mantineFilterSelectProps: ({ column }) => {
            const value = column.getFilterValue()
            return {
                clearable: value !== undefined && value !== null && value !== ''
            }
        },
        mantineFilterMultiSelectProps: ({ column }) => {
            const value = column.getFilterValue()
            const count = Array.isArray(value) ? value.length : 0
            return {
                clearable: count > 0,
                renderPill: () => null,
                ...(count > 0 && {
                    leftSection: <Badge variant="soft">{count}</Badge>,
                    placeholder: '',
                    clearSectionMode: 'clear'
                })
            }
        },
        enableFullScreenToggle: true,
        enableSortingRemoval: true,
        enableGlobalFilter: false,
        enableClickToCopy: false,
        enableColumnFilterModes: true,
        enableColumnOrdering: true,
        columnFilterModeOptions: ['contains'],
        initialState: {
            density: 'xxs',
            pagination: DEFAULT_PAGINATION_STATE,
            sorting: [{ id: 'id', desc: true }]
        },
        mantineFilterTextInputProps: () => ({
            placeholder: t('common.filter-by')
        }),
        mantineTopToolbarProps: {
            style: MRT_TOOLBAR_BG_STYLE
        },
        mantineTableHeadProps: {
            style: MRT_TOOLBAR_BG_STYLE
        },
        mantineBottomToolbarProps: {
            style: MRT_TOOLBAR_BG_STYLE
        },
        mantinePaperProps: {
            style: {
                '--paper-radius': 'var(--mantine-radius-xs)'
            },
            withBorder: false
        },
        enableDensityToggle: true,
        manualFiltering: true,
        manualPagination: true,
        manualSorting: true,
        enableColumnResizing: true,
        /* prettier-ignore */
        mantineToolbarAlertBannerProps: isError ? {
            color: 'red',
            children: t('user-table.widget.error-loading-data')
        } : undefined,

        ...persistedTableHandlers,
        onColumnFilterFnsChange: setColumnFilterFns,
        rowCount: usersResponse?.total ?? 0,
        enableRowSelection: true,
        mantineSelectCheckboxProps: {
            size: 'md',
            color: 'cyan',
            variant: 'outline'
        },
        mantineSelectAllCheckboxProps: {
            size: 'md',
            color: 'cyan',
            variant: 'outline'
        },
        enableColumnPinning: true,
        positionToolbarAlertBanner: 'top',
        renderToolbarAlertBannerContent: () => {
            if (isError && selectedCount === 0) {
                return <Text size="sm">{t('user-table.widget.error-loading-data')}</Text>
            }
            return (
                <UsersTableSelectionFeature
                    resetRowSelection={table.resetRowSelection}
                    toggleAllPageRowsSelected={table.toggleAllPageRowsSelected}
                />
            )
        },
        selectAllMode: 'page',
        renderToolbarInternalActions: ({ table: tableInstance }) => (
            <>
                <ActionIconGroup>
                    <Tooltip
                        label={i18n.language.startsWith('zh') ? '访问审计' : 'Access audit'}
                        withArrow
                    >
                        <ActionIcon
                            aria-label="Access audit"
                            color="indigo"
                            onClick={() => showModal('users_accessAuditModal', {})}
                            size="lg"
                            variant="soft"
                        >
                            <TbShieldSearch size={20} />
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label={t('common.bulk-actions')} withArrow>
                        <ActionIcon
                            color="green"
                            onClick={() => showModal('users_bulkAllUsersActionsModal')}
                            size="lg"
                            variant="soft"
                        >
                            <TbBolt size={20} />
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label={t('common.bulk-edit')} withArrow>
                        <ActionIcon
                            color="red"
                            onClick={() => showModal('users_bulkAllUsersUpdateModal')}
                            size="lg"
                            variant="soft"
                        >
                            <TbEdit size={20} />
                        </ActionIcon>
                    </Tooltip>
                </ActionIconGroup>
                <ActionIconGroup>
                    <MRT_ToggleFiltersButton table={tableInstance} />
                    <MRT_ToggleDensePaddingButton table={tableInstance} />
                    <MRT_ToggleFullScreenButton table={tableInstance} />
                    <MRT_ShowHideColumnsButton table={tableInstance} />
                </ActionIconGroup>
            </>
        ),
        state: {
            ...persistedTableState,
            columnFilterFns,
            isLoading,
            showAlertBanner: isError || selectedCount > 0,
            showProgressBars: isFetching,
            rowSelection: tableSelection
        },
        mantineTableBodyRowProps: ({ row }) => ({
            onClick: async () => {
                if (row.id === 'mrt-row-empty' || row.original.id === undefined) {
                    notifications.show({
                        title: 'Nice try!',
                        message: 'Nothing to show...',
                        color: 'indigo'
                    })
                    return
                }

                showModal('users_viewUserModal', { userId: row.original.id })
            },
            style: {
                cursor: 'pointer'
            }
        }),
        onRowSelectionChange: usersTableSelectionStoreActions.setTableSelection,
        getRowId: (originalRow) => originalRow.id?.toString() ?? 'unknown'
    })

    return (
        <DataTableShared.Container>
            <DataTableShared.Title
                actions={
                    <UserActionGroupFeature isLoading={isLoading} refetch={refetch} table={table} />
                }
                description={
                    usersResponse?.total !== undefined
                        ? t('users-mobile.total-count', { count: usersResponse.total })
                        : undefined
                }
                icon={<PiUsersDuotone size={24} />}
                title={t('user-table.widget.directory-title')}
            />

            <DataTableShared.Content>
                {isMobile ? (
                    <UsersMobileList
                        columnFilters={persistedTableState.columnFilters}
                        isError={isError}
                        isLoading={isLoading}
                        nodes={nodes}
                        onColumnFiltersChange={persistedTableHandlers.onColumnFiltersChange}
                        onPaginationChange={persistedTableHandlers.onPaginationChange}
                        onSortingChange={persistedTableHandlers.onSortingChange}
                        pagination={persistedTableState.pagination}
                        sorting={persistedTableState.sorting}
                        table={table}
                        tableSelection={tableSelection}
                        total={usersResponse?.total ?? 0}
                        users={usersResponse?.users ?? []}
                    />
                ) : (
                    <MantineReactTable table={table} />
                )}
            </DataTableShared.Content>
        </DataTableShared.Container>
    )
}
