import { DataTable } from '@kastov/mantine-datatable'
import { ActionIcon, Tooltip } from '@mantine/core'
import { useClipboard } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TbRefresh, TbTrophy } from 'react-icons/tb'

import { showModal } from '@shared/_modals/show-modal'
import { useGetTopUsersByHwidDevices } from '@shared/api/hooks'
import { DataTableShared } from '@shared/ui/table'
import { sToMs } from '@shared/utils/time-utils'

import { getHwidInspectorLeaderboardColumns } from './get-hwid-inspector-leaderboard-columns'

const PAGE_SIZE = 5
const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100]

export function HwidInspectorLeaderboardWidget() {
    const { t } = useTranslation()

    const [pageSize, setPageSize] = useState(PAGE_SIZE)
    const [page, setPage] = useState(1)
    const { copy } = useClipboard()

    const {
        data: usersResponse,
        isLoading,
        isFetching,
        refetch
    } = useGetTopUsersByHwidDevices({
        query: {
            start: (page - 1) * pageSize,
            size: pageSize
        },
        rQueryParams: {
            refetchInterval: sToMs(25)
        }
    })

    const handleChangePageSize = (pageSize: number) => {
        setPageSize(pageSize)
        setPage(1)
    }

    return (
        <DataTableShared.Container>
            <DataTableShared.Title
                actions={
                    <Tooltip label={t('common.update')} withArrow>
                        <ActionIcon
                            loading={isFetching}
                            onClick={() => refetch()}
                            size="input-md"
                            variant="soft"
                        >
                            <TbRefresh size="24px" />
                        </ActionIcon>
                    </Tooltip>
                }
                icon={<TbTrophy size={24} />}
                iconProps={{
                    color: 'yellow',
                    variant: 'soft'
                }}
                title={t('hwid-inspector-leaderboard.widget.top-users-title')}
            />
            <DataTableShared.Content>
                <DataTable
                    borderRadius="sm"
                    columns={getHwidInspectorLeaderboardColumns(t, async (userId) => {
                        showModal('users_viewUserModal', { userId })
                    })}
                    defaultColumnProps={{
                        noWrap: true,
                        textAlign: 'left',
                        ellipsis: true,
                        draggable: false
                    }}
                    fetching={isLoading}
                    height={350}
                    idAccessor="userUuid"
                    onCellClick={({ record, column }) => {
                        if (column.accessor === 'actions') {
                            return
                        }
                        copy(record[column.accessor as keyof typeof record])
                        notifications.show({
                            title: t('common.copied'),
                            message: record[column.accessor as keyof typeof record],
                            color: 'teal'
                        })
                    }}
                    onPageChange={setPage}
                    onRecordsPerPageChange={handleChangePageSize}
                    page={page}
                    pinFirstColumn
                    records={usersResponse?.users ?? []}
                    recordsPerPage={pageSize}
                    recordsPerPageLabel=""
                    recordsPerPageOptions={PAGE_SIZE_OPTIONS}
                    renderPagination={({ Controls }) => (
                        <>
                            <Controls.Text />
                            <Controls.PageSizeSelector />
                            <Controls.Pagination />
                        </>
                    )}
                    striped
                    totalRecords={usersResponse?.total ?? 0}
                    withColumnBorders
                    withRowBorders
                    withTableBorder={false}
                />
            </DataTableShared.Content>
        </DataTableShared.Container>
    )
}
