import { SimpleGrid } from '@mantine/core'
import { GetNodesCommand } from '@remnawave/backend-contract'
import { motion } from 'motion/react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { PiArrowDownDuotone, PiArrowUpDuotone, PiPulse } from 'react-icons/pi'
import { TbUsers } from 'react-icons/tb'

import { IMetricCardProps, MetricCardShared } from '@shared/ui/metrics/metric-card'
import { prettySiRealtimeBytesUtil } from '@shared/utils/bytes'

import { isNodeAttention } from '../node-rollout-overview'

interface IProps {
    isLoading: boolean
    nodes: GetNodesCommand.Response['response'] | undefined
}

export function NodesRealtimeUsageMetrics(props: IProps) {
    const { nodes, isLoading } = props

    const { t } = useTranslation()

    const { aggregated, attentionCount, onlineCount } = useMemo(() => {
        if (!nodes?.length) {
            return {
                aggregated: null,
                attentionCount: 0,
                onlineCount: 0
            }
        }

        let rxSpeed = 0
        let txSpeed = 0
        let online = 0
        let attention = 0

        for (const curr of nodes) {
            rxSpeed += curr.system?.stats.interface?.rxBytesPerSec ?? 0
            txSpeed += curr.system?.stats.interface?.txBytesPerSec ?? 0
            if (curr.isConnected) online += 1
            if (isNodeAttention(curr)) attention += 1
        }

        return {
            aggregated: { rxSpeed, txSpeed },
            attentionCount: attention,
            onlineCount: online
        }
    }, [nodes])

    let onlineNodesColor: IMetricCardProps['iconColor'] = 'teal'
    if (nodes?.length) {
        if (onlineCount === 0) {
            onlineNodesColor = 'red'
        } else if (attentionCount > 0) {
            onlineNodesColor = 'orange'
        }
    }

    const cards: IMetricCardProps[] = [
        {
            IconComponent: PiArrowDownDuotone,
            title: t('nodes-realtime-metrics.widget.download-speed'),
            value: prettySiRealtimeBytesUtil(aggregated?.rxSpeed, true, true) || '0 B/s',
            iconVariant: 'soft',
            iconColor: 'teal'
        },
        {
            IconComponent: PiArrowUpDuotone,
            title: t('nodes-realtime-metrics.widget.upload-speed'),
            value: prettySiRealtimeBytesUtil(aggregated?.txSpeed ?? 0, true, true) || '0 B/s',
            iconVariant: 'soft',
            iconColor: 'indigo'
        },

        {
            IconComponent: TbUsers,
            title: t('nodes-quick-stats.widget.users-online'),
            value: nodes?.reduce((acc, curr) => acc + (curr.usersOnline ?? 0), 0) ?? 0,
            iconVariant: 'soft',
            iconColor: 'cyan'
        },
        {
            IconComponent: PiPulse,
            title: t('nodes-quick-stats.widget.online-nodes'),
            value: nodes?.length ? `${onlineCount} / ${nodes.length}` : 0,
            iconVariant: 'soft',
            iconColor: onlineNodesColor
        }
    ]
    return (
        <SimpleGrid cols={{ base: 2, xl: 4 }} spacing="xs">
            {cards.map((card, index) => (
                <motion.div
                    animate={{ opacity: 1, y: 0 }}
                    initial={{ opacity: 0, y: 0 }}
                    key={card.title}
                    transition={{
                        duration: 0.15,
                        delay: index * 0.03,
                        ease: 'easeIn'
                    }}
                >
                    <MetricCardShared
                        iconColor={card.iconColor}
                        IconComponent={card.IconComponent}
                        iconVariant={card.iconVariant}
                        isLoading={isLoading}
                        subtitle={card.subtitle}
                        title={card.title}
                        value={card.value}
                    />
                </motion.div>
            ))}
        </SimpleGrid>
    )
}
