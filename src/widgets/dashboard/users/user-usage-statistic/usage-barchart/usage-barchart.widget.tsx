import { GetStatsUserUsageCommand } from '@remnawave/backend-contract'
import { useTranslation } from 'react-i18next'

import { TrafficBarchartCard } from '@shared/ui/traffic-usage'
import { TrafficDirection } from '@shared/utils/traffic-usage'

interface IProps {
    direction?: TrafficDirection
    categories: string[] | undefined
    isLoading: boolean
    series: GetStatsUserUsageCommand.Response['response']['series'] | undefined
}

export const UserUsageBarchartWidget = (props: IProps) => {
    const { categories = [], series = [], isLoading, direction = 'total' } = props
    const { t } = useTranslation()

    return (
        <TrafficBarchartCard
            categories={categories}
            clickHintText={t('user-usage-modal.widget.click-to-see-all')}
            direction={direction}
            emptyText={t('user-usage-modal.widget.no-data-available-for-the-selected-period')}
            entityColumnLabel={t('statistic-nodes.component.node')}
            isLoading={isLoading}
            items={series.map((s) => ({
                key: s.name,
                name: s.name,
                color: s.color,
                data: s.data,
                countryCode: s.countryCode
            }))}
            minHeight={440}
        />
    )
}
