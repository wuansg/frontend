import { Box, Group, Progress, ProgressProps, Stack, Text, Tooltip } from '@mantine/core'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { prettifyBytesUtil } from '@shared/utils/bytes'
import { getNodeTrafficBudget, NodeTrafficBudgetInput } from '@shared/utils/node-traffic-budget'

import classes from './NodeTrafficProgress.module.css'

interface Props {
    node: NodeTrafficBudgetInput
    value: number
    color?: ProgressProps['color']
    size?: ProgressProps['size']
    compact?: boolean
}

const prettyBytes = (value: number) => prettifyBytesUtil(value) ?? '0 B'

export function NodeTrafficProgress({ node, value, color, size = 'sm', compact = false }: Props) {
    const { t } = useTranslation()
    const [now, setNow] = useState(() => new Date())

    useEffect(() => {
        const refresh = () => setNow(new Date())
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') refresh()
        }
        const timer = window.setInterval(refresh, 60_000)
        document.addEventListener('visibilitychange', onVisibilityChange)
        return () => {
            window.clearInterval(timer)
            document.removeEventListener('visibilitychange', onVisibilityChange)
        }
    }, [])

    const budget = getNodeTrafficBudget(node, now)
    const progress = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0
    const expectedLabel = budget
        ? t('node-traffic-progress.expected', {
              amount: prettyBytes(budget.expectedBytes),
              percent: budget.expectedPercentage.toFixed(1)
          })
        : ''
    const differenceLabel = budget
        ? t(`node-traffic-progress.${budget.status}`, {
              amount: prettyBytes(Math.abs(budget.differenceBytes))
          })
        : ''

    return (
        <Box className={classes.root} data-testid="node-traffic-progress">
            <Tooltip
                disabled={!budget}
                events={{ hover: true, focus: true, touch: true }}
                label={
                    budget ? (
                        <Stack gap={4}>
                            <Text fw={600} size="xs">
                                {expectedLabel}
                            </Text>
                            <Text size="xs">{differenceLabel}</Text>
                            <Text size="xs">
                                {t('node-traffic-progress.cycle-day', {
                                    day: budget.elapsedDays,
                                    days: budget.cycleDays
                                })}
                                {' · '}
                                {t('node-traffic-progress.daily', {
                                    amount: prettyBytes(budget.dailyBytes)
                                })}
                            </Text>
                            <Text size="xs">
                                {t('node-traffic-progress.cycle', {
                                    start: budget.cycleStart.toISOString().slice(0, 10),
                                    end: new Date(budget.cycleEnd.getTime() - 1)
                                        .toISOString()
                                        .slice(0, 10)
                                })}
                            </Text>
                            <Text size="xs">{t('node-traffic-progress.explanation')}</Text>
                        </Stack>
                    ) : (
                        ''
                    )
                }
                multiline
                w={300}
                withArrow
            >
                <Box className={classes.track} tabIndex={budget ? 0 : undefined}>
                    <Progress
                        aria-label={t('node-traffic-progress.actual')}
                        aria-valuetext={
                            budget
                                ? `${progress}%. ${expectedLabel}. ${differenceLabel}`
                                : undefined
                        }
                        color={color}
                        radius="sm"
                        size={size}
                        value={progress}
                    />
                    {budget && (
                        <Box
                            aria-hidden
                            className={classes.marker}
                            data-testid="node-traffic-budget-marker"
                            style={{
                                insetInlineStart: `clamp(1px, ${budget.expectedPercentage}%, calc(100% - 1px))`
                            }}
                        />
                    )}
                </Box>
            </Tooltip>
            {budget && (
                <Group gap={4} justify="space-between" mt={6}>
                    <Group gap={5} wrap="nowrap">
                        <Box aria-hidden className={classes.legend} />
                        <Text c="dimmed" size={compact ? '10px' : 'xs'}>
                            {t('node-traffic-progress.expected-short', {
                                amount: prettyBytes(budget.expectedBytes)
                            })}
                        </Text>
                    </Group>
                    {!compact && (
                        <Text
                            c={
                                budget.status === 'ahead'
                                    ? 'orange'
                                    : budget.status === 'behind'
                                      ? 'teal'
                                      : 'dimmed'
                            }
                            data-testid="node-traffic-budget-difference"
                            size="xs"
                        >
                            {differenceLabel}
                        </Text>
                    )}
                </Group>
            )}
        </Box>
    )
}
