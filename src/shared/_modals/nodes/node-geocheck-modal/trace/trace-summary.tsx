import type { IGeocheckConnectivity } from './trace.types'

import { Badge, Box, Group } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { TbRoute } from 'react-icons/tb'

import { TraceStat } from './trace-stat'
import classes from './Trace.module.css'
import { resolveVerdictColor, resolveVerdictLabel } from './trace.types'

const formatMs = (value: number): string => (value >= 100 ? value.toFixed(0) : value.toFixed(2))

interface IProps {
    connectivity: IGeocheckConnectivity
}

export const TraceSummary = (props: IProps) => {
    const { connectivity } = props
    const { t } = useTranslation()

    return (
        <Box className={classes.summary}>
            <Group gap="xs" wrap="nowrap">
                <TbRoute color="var(--mantine-color-cyan-4)" size={18} />
                <TraceStat
                    label={t('node-geocheck.trace.score')}
                    value={String(connectivity.score ?? '—')}
                />
            </Group>

            {connectivity.latency_floor_ms !== undefined && (
                <TraceStat
                    label={t('node-geocheck.trace.floor')}
                    value={`${formatMs(connectivity.latency_floor_ms)} ms`}
                />
            )}

            <Group gap={6} wrap="wrap">
                {Object.entries(connectivity.breakdown ?? {})
                    .filter(([, count]) => count > 0)
                    .map(([verdict, count]) => (
                        <Badge
                            className={classes.tabular}
                            color={resolveVerdictColor(verdict)}
                            key={verdict}
                            size="sm"
                            variant="soft"
                        >
                            {resolveVerdictLabel(verdict, t)} {count}
                        </Badge>
                    ))}
            </Group>

            {connectivity.icmp_available === false && (
                <Badge color="red" size="sm" variant="soft">
                    {t('node-geocheck.trace.no-icmp')}
                </Badge>
            )}
        </Box>
    )
}
