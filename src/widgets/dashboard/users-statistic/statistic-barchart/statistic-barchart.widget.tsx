import { GetStatsUsersUsageCommand } from '@remnawave/backend-contract'
import { useTranslation } from 'react-i18next'

import { TrafficBarchartCard } from '@shared/ui/traffic-usage'
import { TrafficDirection } from '@shared/utils/traffic-usage'

interface IProps {
    direction?: TrafficDirection
    categories: string[] | undefined
    isLoading: boolean
    onUserClick: (userId: number) => void
    series: GetStatsUsersUsageCommand.Response['response']['series'] | undefined
}

export const UsersStatisticBarchartWidget = (props: IProps) => {
    const { direction = 'total', categories = [], series = [], isLoading, onUserClick } = props
    const { t } = useTranslation()

    return (
        <TrafficBarchartCard
            categories={categories}
            clickHintText={t('statistic-nodes.component.click-to-see-all')}
            direction={direction}
            emptyText={t('statistic-nodes.component.no-data-available-for-the-selected-period')}
            entityColumnLabel={t('statistic-users.component.user')}
            isLoading={isLoading}
            items={series.map((item) => ({
                key: String(item.id),
                name: item.username,
                color: item.color,
                data: item.data,
                userId: item.id
            }))}
            onRowClick={(entry) => {
                if (entry.userId !== undefined) {
                    onUserClick(entry.userId)
                }
            }}
        />
    )
}
