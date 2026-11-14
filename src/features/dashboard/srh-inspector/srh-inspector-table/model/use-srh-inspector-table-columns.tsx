import { MRT_ColumnDef } from '@kastov/mantine-react-table-open'
/* eslint-disable camelcase */
import { GetSubscriptionRequestHistoryCommand } from '@remnawave/backend-contract'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { formatTimeUtil } from '@shared/utils/time-utils'

export const useSrhInspectorTableColumns = () => {
    const { t, i18n } = useTranslation()

    return useMemo<
        MRT_ColumnDef<
            GetSubscriptionRequestHistoryCommand.Response['response']['records'][number]
        >[]
    >(
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
                accessorKey: 'userAgent',
                header: t('use-srh-inspector-table-columns.user-agent'),
                accessorFn: (originalRow) => originalRow.userAgent || '–',
                size: 320
            },
            {
                accessorKey: 'requestAt',
                header: t('use-srh-inspector-table-columns.request-at'),
                accessorFn: (originalRow) =>
                    formatTimeUtil({
                        time: originalRow.requestAt,
                        template: 'TIME_FIRST_DATETIME',
                        language: i18n.language
                    }),
                minSize: 190,
                enableColumnFilterModes: false,
                enableColumnFilter: false,
                mantineTableBodyCellProps: {
                    align: 'left',
                    style: { fontVariantNumeric: 'tabular-nums' }
                }
            },
            {
                accessorKey: 'srrResponseType',
                header: t('use-srh-inspector-table-columns.response-type'),
                accessorFn: (originalRow) => originalRow.srrResponseType,
                size: 180
            },
            {
                accessorKey: 'srrRuleName',
                header: t('use-srh-inspector-table-columns.rule-name'),
                accessorFn: (originalRow) => originalRow.srrRuleName || '–',
                size: 180
            },
            {
                accessorKey: 'id',
                header: 'ID',
                accessorFn: (originalRow) => originalRow.id,
                size: 90,
                mantineTableBodyCellProps: {
                    style: { fontVariantNumeric: 'tabular-nums' }
                }
            }
        ],
        [t, i18n.language]
    )
}
