import { Chart } from '@highcharts/react'
import {
    alpha,
    Badge,
    Box,
    Card,
    Center,
    Group,
    ScrollArea,
    SegmentedControl,
    Skeleton,
    Stack,
    Table,
    Text,
    ThemeIcon
} from '@mantine/core'
import { modals } from '@mantine/modals'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PiEmpty } from 'react-icons/pi'
import { TbChartBar, TbChartHistogram } from 'react-icons/tb'

import { CountryFlag } from '@shared/ui/get-country-flag'
import { BaseOverlayHeader } from '@shared/ui/overlays/base-overlay-header'
import { prettifyBytesUtil } from '@shared/utils/bytes'
import { formatTimeUtil } from '@shared/utils/time-utils'
import { TrafficDirection } from '@shared/utils/traffic-usage'

import classes from './traffic-usage.module.css'

export interface TrafficChartSeriesItem {
    key: string
    name: string
    color: string
    data: number[]
    countryCode?: string
    isShared?: boolean
    userId?: number
    uuid?: string
}

export interface TrafficBarchartCardProps {
    categories: string[] | undefined
    clickHintText: string
    direction?: TrafficDirection
    emptyText: string
    entityColumnLabel: string
    isLoading: boolean
    items: TrafficChartSeriesItem[] | undefined
    minHeight?: number
    onRowClick?: (item: TrafficChartSeriesItem) => void
    sharedLabel?: string
}

export function TrafficBarchartCard({
    categories = [],
    clickHintText,
    direction = 'total',
    emptyText,
    entityColumnLabel,
    isLoading,
    items = [],
    minHeight = 520,
    onRowClick,
    sharedLabel
}: TrafficBarchartCardProps) {
    const { t, i18n } = useTranslation()
    const [manualMode, setManualMode] = useState<'bar' | 'column' | null>(null)

    if (isLoading) {
        return <Skeleton height={minHeight} radius="md" />
    }

    if (categories.length === 0 || items.length === 0) {
        return (
            <Card className={classes.chartCard} mih={minHeight} p="md" radius="md">
                <Center h={minHeight - 40}>
                    <Stack align="center" gap={8}>
                        <ThemeIcon color="gray" radius="xl" size="xl" variant="light">
                            <PiEmpty size={24} />
                        </ThemeIcon>
                        <Text c="dimmed" size="sm">
                            {emptyText}
                        </Text>
                    </Stack>
                </Center>
            </Card>
        )
    }

    const mode: 'bar' | 'column' = manualMode ?? (categories.length > 21 ? 'bar' : 'column')

    const chartPixelHeight =
        mode === 'bar' ? Math.max(420, categories.length * 32 + 140) : Math.max(420, minHeight - 60)

    const handleBarClick = (category: string, pointIndex: number) => {
        if (!category) return

        const allDayData = items
            .map((entry) => ({
                ...entry,
                value: entry.data[pointIndex] || 0
            }))
            .filter((item) => item.value > 0)
            .sort((a, b) => b.value - a.value)

        const totalDayTraffic = allDayData.reduce((sum, item) => sum + item.value, 0)
        const maxDayValue = allDayData[0]?.value || 1
        if (allDayData.length === 0) return

        modals.open({
            centered: true,
            size: '640px',
            title: (
                <BaseOverlayHeader
                    iconColor="teal"
                    IconComponent={TbChartBar}
                    iconVariant="soft"
                    subtitle={`${t(`traffic-usage.${direction}`)}: ${prettifyBytesUtil(totalDayTraffic)}`}
                    title={formatTimeUtil({
                        time: category,
                        template: 'FULL_DATE',
                        language: i18n.language
                    })}
                />
            ),
            children: (
                <Stack gap="xs">
                    <ScrollArea h={420} offsetScrollbars type="always">
                        <Table highlightOnHover verticalSpacing="xs" withTableBorder>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th style={{ width: 52 }}>
                                        {t('traffic-usage.rank')}
                                    </Table.Th>
                                    <Table.Th>{entityColumnLabel}</Table.Th>
                                    <Table.Th style={{ textAlign: 'right', width: 90 }}>
                                        {t('traffic-usage.share')}
                                    </Table.Th>
                                    <Table.Th style={{ textAlign: 'right', width: 140 }}>
                                        {t('statistic-nodes.component.traffic')}
                                    </Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {allDayData.map((entry, idx) => {
                                    const pct =
                                        totalDayTraffic > 0
                                            ? (entry.value / totalDayTraffic) * 100
                                            : 0
                                    return (
                                        <Table.Tr
                                            key={entry.key}
                                            onClick={
                                                onRowClick
                                                    ? () => {
                                                          modals.closeAll()
                                                          onRowClick(entry)
                                                      }
                                                    : undefined
                                            }
                                            style={onRowClick ? { cursor: 'pointer' } : undefined}
                                        >
                                            <Table.Td>
                                                <Badge
                                                    className={classes.tabular}
                                                    color={
                                                        idx === 0
                                                            ? 'yellow'
                                                            : idx === 1
                                                              ? 'cyan'
                                                              : idx === 2
                                                                ? 'teal'
                                                                : 'gray'
                                                    }
                                                    radius="sm"
                                                    size="xs"
                                                    variant="light"
                                                >
                                                    #{idx + 1}
                                                </Badge>
                                            </Table.Td>
                                            <Table.Td>
                                                <Group gap={8} wrap="nowrap">
                                                    <Box
                                                        h={10}
                                                        style={{
                                                            background: entry.color,
                                                            borderRadius: '50%',
                                                            flexShrink: 0
                                                        }}
                                                        w={10}
                                                    />
                                                    {entry.countryCode && (
                                                        <CountryFlag
                                                            countryCode={entry.countryCode}
                                                        />
                                                    )}
                                                    <Text fw={500} size="sm" truncate>
                                                        {entry.name}
                                                    </Text>
                                                    {entry.isShared && sharedLabel && (
                                                        <Badge
                                                            color="cyan"
                                                            size="xs"
                                                            style={{ flexShrink: 0 }}
                                                            variant="light"
                                                        >
                                                            {sharedLabel}
                                                        </Badge>
                                                    )}
                                                </Group>
                                            </Table.Td>
                                            <Table.Td style={{ textAlign: 'right' }}>
                                                <Text
                                                    c="dimmed"
                                                    className={classes.tabular}
                                                    fw={500}
                                                    size="xs"
                                                >
                                                    {pct.toFixed(1)}%
                                                </Text>
                                                <div className={classes.dayShareTrack}>
                                                    <div
                                                        className={classes.dayShareFill}
                                                        style={{
                                                            width: `${Math.max((entry.value / maxDayValue) * 100, 4)}%`,
                                                            background: entry.color
                                                        }}
                                                    />
                                                </div>
                                            </Table.Td>
                                            <Table.Td style={{ textAlign: 'right' }}>
                                                <Text
                                                    className={classes.tabular}
                                                    fw={600}
                                                    size="sm"
                                                >
                                                    {prettifyBytesUtil(entry.value)}
                                                </Text>
                                            </Table.Td>
                                        </Table.Tr>
                                    )
                                })}
                            </Table.Tbody>
                        </Table>
                    </ScrollArea>
                </Stack>
            )
        })
    }

    return (
        <Card className={classes.chartCard} p="md" radius="md">
            <Group
                align="center"
                className={classes.chartHeader}
                justify="space-between"
                wrap="wrap"
            >
                <Group gap="xs" style={{ minWidth: 0 }}>
                    <ThemeIcon color="cyan" radius="md" size="md" variant="light">
                        <TbChartHistogram size={17} />
                    </ThemeIcon>
                    <Box style={{ minWidth: 0 }}>
                        <Group gap={8} wrap="wrap">
                            <Text fw={650} size="sm">
                                {t('traffic-usage.daily-chart-title')}
                            </Text>
                            <Badge
                                className={classes.tabular}
                                color="cyan"
                                radius="sm"
                                size="xs"
                                variant="light"
                            >
                                {t('traffic-usage.active-items', { count: items.length })}
                            </Badge>
                            <Badge
                                className={classes.tabular}
                                color="gray"
                                radius="sm"
                                size="xs"
                                variant="light"
                            >
                                {t('traffic-usage.days-count', { count: categories.length })}
                            </Badge>
                        </Group>
                        <Text c="dimmed" size="xs">
                            {t('traffic-usage.daily-chart-hint')}
                        </Text>
                    </Box>
                </Group>

                <SegmentedControl
                    data={[
                        { label: t('traffic-usage.chart-column'), value: 'column' },
                        { label: t('traffic-usage.chart-bar'), value: 'bar' }
                    ]}
                    onChange={(next) => setManualMode(next as 'bar' | 'column')}
                    radius="md"
                    size="xs"
                    value={mode}
                />
            </Group>

            <Chart
                options={{
                    accessibility: { enabled: false },
                    chart: {
                        type: mode,
                        height: chartPixelHeight,
                        backgroundColor: 'transparent',
                        style: { fontFamily: 'inherit' }
                    },
                    credits: { enabled: false },
                    exporting: { enabled: false },
                    legend: {
                        enabled: true,
                        layout: 'horizontal',
                        align: 'center',
                        verticalAlign: 'bottom',
                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                        borderWidth: 1,
                        padding: 14,
                        borderRadius: 10,
                        borderColor: 'rgba(128, 128, 128, 0.18)',
                        itemMarginTop: 4,
                        itemMarginBottom: 4,
                        itemStyle: {
                            color: 'var(--mantine-color-text)',
                            fontSize: '12.5px',
                            fontWeight: '500'
                        },
                        itemHoverStyle: {
                            color: 'var(--mantine-color-text)',
                            fontWeight: '600'
                        },
                        itemHiddenStyle: {
                            color: 'var(--mantine-color-dimmed)'
                        },
                        symbolRadius: 5,
                        symbolHeight: 9,
                        symbolWidth: 9,
                        navigation: {
                            enabled: true,
                            activeColor: 'var(--mantine-color-cyan-5)',
                            inactiveColor: 'var(--mantine-color-dimmed)',
                            style: {
                                fontWeight: '500',
                                color: 'var(--mantine-color-text)',
                                fontSize: '12px'
                            }
                        }
                    },
                    plotOptions: {
                        [mode]: {
                            stacking: 'normal',
                            borderRadius: 3,
                            cursor: 'pointer',
                            maxPointWidth: mode === 'column' ? 64 : 36
                        },
                        series: {
                            states: {
                                hover: { enabled: true, brightness: 0.12 },
                                inactive: { opacity: 0.22 }
                            },
                            stickyTracking: false
                        }
                    },
                    xAxis: {
                        reversed: false,
                        reversedStacks: true,
                        categories,
                        crosshair: true,
                        labels: {
                            style: {
                                color: 'var(--mantine-color-dimmed)',
                                fontSize: '11.5px',
                                fontVariantNumeric: 'tabular-nums'
                            },
                            formatter: ({ value }) =>
                                formatTimeUtil({
                                    time: value,
                                    template: 'SHORT_DATE',
                                    language: i18n.language
                                })
                        },
                        lineColor: 'rgba(128, 128, 128, 0.2)',
                        gridLineColor: 'rgba(128, 128, 128, 0.1)',
                        gridLineWidth: mode === 'bar' ? 1 : 0,
                        gridLineDashStyle: 'ShortDash'
                    },
                    yAxis: {
                        title: undefined,
                        reversedStacks: false,
                        labels: {
                            autoRotation: [-45, 45],
                            style: {
                                color: 'var(--mantine-color-dimmed)',
                                fontSize: '11.5px',
                                fontVariantNumeric: 'tabular-nums'
                            },
                            formatter: ({ value }) => prettifyBytesUtil(value, true)
                        },
                        gridLineColor: 'rgba(128, 128, 128, 0.12)',
                        gridLineDashStyle: 'ShortDash'
                    },
                    tooltip: {
                        shared: false,
                        backgroundColor: 'var(--mantine-color-body)',
                        borderColor: 'rgba(128, 128, 128, 0.28)',
                        borderRadius: 10,
                        style: {
                            color: 'var(--mantine-color-text)',
                            fontVariantNumeric: 'tabular-nums'
                        },
                        useHTML: true,
                        formatter() {
                            const value = this.y || 0
                            const pointIndex = this.index
                            const seriesData = this.series.data

                            let parsedColor = this.series.color
                            if (typeof parsedColor === 'string' && parsedColor) {
                                parsedColor = alpha(parsedColor, 0.85)
                            } else {
                                parsedColor = '#888'
                            }

                            const totalInThisDay = this.series.chart.series.reduce((sum, s) => {
                                const point = s.data[pointIndex]
                                return sum + (point?.y || 0)
                            }, 0)

                            const sharePct =
                                totalInThisDay > 0
                                    ? ((value / totalInThisDay) * 100).toFixed(1)
                                    : '0.0'

                            const nearbyDays: {
                                date: string
                                isCurrent: boolean
                                value: number
                            }[] = []

                            for (let i = 4; i >= -4; i--) {
                                const idx = pointIndex + i
                                if (idx >= 0 && idx < seriesData.length) {
                                    const point = seriesData[idx]
                                    nearbyDays.push({
                                        date: formatTimeUtil({
                                            time: point.category,
                                            template: 'SHORT_DATE',
                                            language: i18n.language
                                        }),
                                        isCurrent: i === 0,
                                        value: point.y || 0
                                    })
                                }
                            }

                            const maxValue = Math.max(...nearbyDays.map((d) => d.value), 1)
                            let nearbyDaysHtml = ''

                            nearbyDays.forEach((day) => {
                                if (day.value === 0) return
                                const fontWeight = day.isCurrent ? 600 : 400
                                nearbyDaysHtml += `
                            <div style="display: flex; align-items: center; gap: 6px; opacity: ${day.isCurrent ? 1 : 0.55}; font-variant-numeric: tabular-nums;">
                                <span style="width: 44px; font-size: 0.72rem; text-align: right; font-weight: ${fontWeight};">${day.date}</span>
                                <div style="flex: 1; height: 5px; background: rgba(128,128,128,0.16); border-radius: 3px; overflow: hidden;">
                                    <div style="width: ${Math.max((day.value / maxValue) * 100, 3)}%; height: 100%; background: ${parsedColor}; border-radius: 3px;"></div>
                                </div>
                                <span style="width: 54px; font-size: 0.72rem; text-align: right; font-weight: ${fontWeight};">${prettifyBytesUtil(day.value, true)}</span>
                            </div>`
                            })

                            return `
                            <div style="font-size: 0.85rem; padding: 6px; min-width: 236px; font-variant-numeric: tabular-nums;">
                                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; gap: 12px;">
                                    <span style="font-weight: 650;">${formatTimeUtil({
                                        time: this.category,
                                        template: 'FULL_DATE',
                                        language: i18n.language
                                    })}</span>
                                    <span style="font-size: 0.8rem; color: var(--mantine-color-dimmed);">
                                        Σ ${prettifyBytesUtil(totalInThisDay, true)}
                                    </span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                                    <div style="width: 9px; height: 9px; background: ${parsedColor}; border-radius: 50%; flex-shrink: 0;"></div>
                                    <span style="flex: 1; font-weight: 500;">${this.series.name}</span>
                                    <span style="font-weight: 650;">${prettifyBytesUtil(value)} <span style="color: var(--mantine-color-dimmed); font-weight: 400; font-size: 0.75rem;">(${sharePct}%)</span></span>
                                </div>
                                <div style="display: flex; flex-direction: column; gap: 3px; padding-top: 8px; border-top: 1px solid rgba(128,128,128,0.2);">
                                    ${nearbyDaysHtml}
                                </div>
                                <div style="color: var(--mantine-color-dimmed); font-size: 0.7rem; text-align: center; margin-top: 8px;">${clickHintText}</div>
                            </div>`
                        }
                    },
                    series: items.map((s) => ({
                        type: mode,
                        name: s.name,
                        data: s.data,
                        color: alpha(s.color, 0.58),
                        borderWidth: 1,
                        borderColor: s.color,
                        point: {
                            events: {
                                click: (event) => {
                                    handleBarClick(
                                        event.point.category as string,
                                        event.point.index
                                    )
                                }
                            }
                        }
                    }))
                }}
                title=""
            />
        </Card>
    )
}
