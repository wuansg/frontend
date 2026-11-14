import { MRT_ColumnDef } from '@kastov/mantine-react-table-open'
/* eslint-disable camelcase */
import { GetHwidDevicesCommand } from '@remnawave/backend-contract'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { formatTimeUtil } from '@shared/utils/time-utils'

export const useHwidInspectorTableColumns = () => {
    const { t, i18n } = useTranslation()

    return useMemo<MRT_ColumnDef<GetHwidDevicesCommand.Response['response']['devices'][number]>[]>(
        () => [
            {
                accessorKey: 'userId',
                header: t('use-hwid-inspector-table-columns.user-id'),
                accessorFn: (originalRow) => originalRow.userId,
                size: 110,
                mantineTableBodyCellProps: {
                    style: { fontVariantNumeric: 'tabular-nums' }
                }
            },
            {
                accessorKey: 'requestIp',
                header: t('use-srh-inspector-table-columns.request-ip'),
                accessorFn: (originalRow) => originalRow.requestIp || '–',
                size: 150,
                mantineTableBodyCellProps: {
                    style: { fontVariantNumeric: 'tabular-nums' }
                }
            },
            {
                accessorKey: 'hwid',
                header: 'HWID',
                accessorFn: (originalRow) => originalRow.hwid,
                size: 200
            },
            {
                accessorKey: 'platform',
                header: t('use-hwid-inspector-table-columns.platform'),
                accessorFn: (originalRow) => originalRow.platform || '–',
                size: 130
            },
            {
                accessorKey: 'osVersion',
                header: t('use-hwid-inspector-table-columns.os-version'),
                accessorFn: (originalRow) => originalRow.osVersion || '–',
                size: 110
            },
            {
                accessorKey: 'deviceModel',
                header: t('use-hwid-inspector-table-columns.device-model'),
                accessorFn: (originalRow) => originalRow.deviceModel || '–',
                size: 160
            },
            {
                accessorKey: 'userAgent',
                header: t('use-hwid-inspector-table-columns.user-agent'),
                accessorFn: (originalRow) => originalRow.userAgent || '–',
                size: 320
            },

            {
                accessorKey: 'createdAt',
                header: t('use-hwid-inspector-table-columns.created-at'),
                accessorFn: (originalRow) =>
                    formatTimeUtil({
                        time: originalRow.createdAt,
                        template: 'TIME_FIRST_DATETIME',
                        language: i18n.language
                    }),

                minSize: 190,
                enableColumnFilter: false,
                enableColumnFilterModes: false,
                mantineTableBodyCellProps: {
                    align: 'left',
                    style: { fontVariantNumeric: 'tabular-nums' }
                }
            },
            {
                accessorKey: 'updatedAt',
                header: t('use-hwid-inspector-table-columns.updated-at'),
                accessorFn: (originalRow) =>
                    formatTimeUtil({
                        time: originalRow.updatedAt,
                        template: 'TIME_FIRST_DATETIME',
                        language: i18n.language
                    }),
                minSize: 190,
                enableColumnFilter: false,
                enableColumnFilterModes: false,
                mantineTableBodyCellProps: {
                    align: 'left',
                    style: { fontVariantNumeric: 'tabular-nums' }
                }
            }
        ],
        [t, i18n.language]
    )
}
