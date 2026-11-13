import { useTranslation } from 'react-i18next'

import { GetStatsHostsUsageResponse } from '@shared/api/hooks'
import { TrafficBarchartCard } from '@shared/ui/traffic-usage'
import { TrafficDirection } from '@shared/utils/traffic-usage'

interface IProps {
    direction?: TrafficDirection
    categories: string[] | undefined
    isLoading: boolean
    series: GetStatsHostsUsageResponse['response']['series'] | undefined
    showAddress?: boolean
}

export const HostsStatisticBarchartWidget = (props: IProps) => {
    const {
        direction = 'total',
        categories = [],
        series = [],
        isLoading,
        showAddress = true
    } = props
    const { t } = useTranslation()

    const getHostName = (host: GetStatsHostsUsageResponse['response']['series'][number]) => {
        const name =
            host.isShared && host.hosts.length > 1
                ? host.hosts.map((item) => item.remark.trim()).join(' + ')
                : host.remark

        if (!showAddress || host.isShared) {
            return name
        }

        return `${name} (${host.address}:${host.port})`
    }

    return (
        <TrafficBarchartCard
            categories={categories}
            clickHintText={t('statistic-nodes.component.click-to-see-all')}
            direction={direction}
            emptyText={t('statistic-nodes.component.no-data-available-for-the-selected-period')}
            entityColumnLabel={t('statistic-hosts.component.host')}
            isLoading={isLoading}
            items={series.map((s) => ({
                key: s.groupKey,
                name: getHostName(s),
                color: s.color,
                data: s.data,
                isShared: s.isShared
            }))}
            sharedLabel={t('statistic-hosts.component.shared')}
        />
    )
}
