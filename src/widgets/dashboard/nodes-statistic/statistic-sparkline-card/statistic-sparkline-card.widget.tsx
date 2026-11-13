import { TrafficUsageSummary, TrafficUsageSummaryProps } from '@shared/ui/traffic-usage'

export const NodesStatisticSparklineCardWidget = (props: TrafficUsageSummaryProps) => (
    <TrafficUsageSummary scope="node" {...props} />
)
