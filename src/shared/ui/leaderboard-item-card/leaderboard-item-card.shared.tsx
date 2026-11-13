import { Badge, Box, Group, Text } from '@mantine/core'
import { ReactNode } from 'react'

import { prettifyBytesUtil } from '@shared/utils/bytes'

import styles from './leaderboard-item-card.module.css'

interface IProps {
    color: string
    countryFlag?: ReactNode
    formatValue?: (value: number) => string
    name: string
    onItemClick?: () => void
    rank?: number
    sharePercent?: number
    total: number
    uuid?: string
    value: number
}

export const LeaderboardItemCardShared = (props: IProps) => {
    const {
        color,
        countryFlag,
        formatValue,
        value,
        name,
        total,
        uuid,
        onItemClick,
        rank,
        sharePercent
    } = props

    const width =
        value > 0 && Number.isFinite(total) && Number.isFinite(value)
            ? Math.min(100, Math.max(0, (total / value) * 100))
            : 0

    const rankColor = rank === 1 ? 'yellow' : rank === 2 ? 'cyan' : rank === 3 ? 'teal' : 'gray'

    return (
        <Box
            bdrs="sm"
            className={`${styles.item} ${onItemClick ? styles.clickable : ''}`}
            key={uuid ?? name}
            onClick={onItemClick}
            px="xs"
            py={8}
            pos="relative"
        >
            <Box
                bdrs="sm"
                className={styles.itemBackground}
                style={{
                    width: `${width}%`,
                    background: color
                }}
            />
            <Group gap={10} justify="space-between" style={{ position: 'relative' }} wrap="nowrap">
                <Group gap={8} style={{ minWidth: 0 }} wrap="nowrap">
                    {rank !== undefined && (
                        <Badge
                            className={styles.rankBadge}
                            color={rankColor}
                            radius="sm"
                            size="xs"
                            style={rank > 3 ? { opacity: 0.72 } : undefined}
                            variant="light"
                        >
                            #{rank}
                        </Badge>
                    )}
                    <Box
                        h={8}
                        style={{
                            background: color,
                            borderRadius: '50%',
                            flexShrink: 0
                        }}
                        w={8}
                    />
                    {countryFlag}
                    <Text fw={600} size="sm" style={{ minWidth: 0 }} truncate="end">
                        {name}
                    </Text>
                </Group>
                <Group gap={8} style={{ flexShrink: 0 }} wrap="nowrap">
                    {sharePercent !== undefined && Number.isFinite(sharePercent) && (
                        <Text c="dimmed" className={styles.tabular} fw={500} size="xs">
                            {sharePercent.toFixed(1)}%
                        </Text>
                    )}
                    <Text className={styles.tabular} fw={650} size="sm">
                        {formatValue ? formatValue(total) : prettifyBytesUtil(total)}
                    </Text>
                </Group>
            </Group>
        </Box>
    )
}
