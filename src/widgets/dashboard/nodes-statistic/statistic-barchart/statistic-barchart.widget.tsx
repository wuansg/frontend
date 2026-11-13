import { GetStatsNodesUsageCommand } from '@remnawave/backend-contract'
import { useTranslation } from 'react-i18next'

import { TrafficBarchartCard } from '@shared/ui/traffic-usage'
import { TrafficDirection } from '@shared/utils/traffic-usage'

interface IProps {
    direction?: TrafficDirection
    categories: string[] | undefined
    isLoading: boolean
    onNodeClick?: (nodeUuid: string) => void
    series: GetStatsNodesUsageCommand.Response['response']['series'] | undefined
}

export const NodesStatisticBarchartWidget = (props: IProps) => {
    const { direction = 'total', categories = [], series = [], isLoading, onNodeClick } = props
    const { t } = useTranslation()

    return (
        <TrafficBarchartCard
            categories={categories}
            clickHintText={t('statistic-nodes.component.click-to-see-all')}
            direction={direction}
            emptyText={t('statistic-nodes.component.no-data-available-for-the-selected-period')}
            entityColumnLabel={t('statistic-nodes.component.node')}
            isLoading={isLoading}
            items={series.map((s) => ({
                key: s.uuid || s.name,
                uuid: s.uuid,
                name: s.name,
                color: s.color,
                data: s.data,
                countryCode: s.countryCode
            }))}
            onRowClick={
                onNodeClick
                    ? (entry) => {
                          if (entry.uuid) onNodeClick(entry.uuid)
                      }
                    : undefined
            }
        />
    )
}
