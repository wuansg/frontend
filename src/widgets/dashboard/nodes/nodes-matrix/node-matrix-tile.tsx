import {
    ActionIcon,
    Avatar,
    Badge,
    Box,
    Checkbox,
    Flex,
    Progress,
    Stack,
    Text,
    Tooltip
} from '@mantine/core'
import { useClipboard } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { GetNodesCommand } from '@remnawave/backend-contract'
import { TFunction } from 'i18next'
import { memo, useMemo } from 'react'
import ReactCountryFlag from 'react-country-flag'
import { useTranslation } from 'react-i18next'
import {
    PiArrowDownDuotone,
    PiArrowsCounterClockwise,
    PiArrowUpDuotone,
    PiCpuDuotone,
    PiGlobeSimple,
    PiUsersDuotone
} from 'react-icons/pi'
import { TbAlertCircle, TbChartArcs } from 'react-icons/tb'

import { showModal } from '@shared/_modals/show-modal'
import { Logo } from '@shared/ui/logo'
import { NodeTrafficProgress } from '@shared/ui/node-traffic-progress'
import { prettifyBytesUtil, prettySiRealtimeBytesUtil } from '@shared/utils/bytes'
import { faviconResolver } from '@shared/utils/misc'
import { getNodeCoreDisplay } from '@shared/utils/node-core-version'
import { getNodeRuntimeMode, WithNodeRuntimeStatus } from '@shared/utils/node-runtime-status'
import { getCoreUptimeUtil, getNodeResetDaysUtil } from '@shared/utils/time-utils'

import classes from './NodesMatrix.module.css'

export type MatrixNodeType = WithNodeRuntimeStatus<GetNodesCommand.Response['response'][number]>

type NodeStatusTone = 'blue' | 'gray' | 'orange' | 'red' | 'teal' | 'yellow'

interface NodeMatrixTileProps {
    isSelected: boolean
    node: MatrixNodeType
    onToggleSelect: (node: MatrixNodeType, shiftKey: boolean) => void
    onViewNode: (nodeUuid: string) => void
}

const getStatusInfo = (
    node: MatrixNodeType,
    isConfigMissing: boolean,
    t: TFunction
): { color: string; dotColor: string; label: string; tone: NodeStatusTone } => {
    if (isConfigMissing) {
        return {
            tone: 'red',
            color: 'red',
            dotColor: 'var(--mantine-color-red-5)',
            label: t('node-card.widget.dangling')
        }
    }
    if (node.isDisabled) {
        return {
            tone: 'gray',
            color: 'gray',
            dotColor: 'var(--mantine-color-gray-5)',
            label: t('node-status-badge.widget.disabled')
        }
    }
    if (node.isConnected) {
        if (node.runtimeStatus?.mode === 'DEGRADED') {
            return {
                tone: 'orange',
                color: 'orange',
                dotColor: 'var(--mantine-color-orange-5)',
                label: t('node-status-badge.widget.degraded')
            }
        }
        if (node.runtimeStatus?.mode === 'FORWARDING_ONLY') {
            return {
                tone: 'blue',
                color: 'blue',
                dotColor: 'var(--mantine-color-blue-5)',
                label: t('node-status-badge.widget.forwarding-only')
            }
        }
        if (node.runtimeStatus?.mode === 'IDLE') {
            return {
                tone: 'gray',
                color: 'gray',
                dotColor: 'var(--mantine-color-gray-5)',
                label: t('node-status-badge.widget.idle')
            }
        }
        return {
            tone: 'teal',
            color: 'teal',
            dotColor: 'var(--mantine-color-teal-5)',
            label: t('node-status-badge.widget.core-active')
        }
    }
    if (node.isConnecting) {
        return {
            tone: 'yellow',
            color: 'yellow',
            dotColor: 'var(--mantine-color-yellow-5)',
            label: t('node-status-badge.widget.connecting')
        }
    }
    return {
        tone: 'red',
        color: 'red',
        dotColor: 'var(--mantine-color-red-5)',
        label: t('node-status-badge.widget.disconnected')
    }
}

const getProgressColor = (percentage: number, fallback: boolean) => {
    if (fallback) return 'teal.6'
    if (percentage > 95) return 'red.6'
    if (percentage > 80) return 'yellow.6'
    return 'teal.6'
}

export const NodeMatrixTile = memo((props: NodeMatrixTileProps) => {
    const { isSelected, node, onToggleSelect, onViewNode } = props
    const { t } = useTranslation()
    const clipboard = useClipboard({ timeout: 500 })

    const isConfigMissing = node.configProfile.activeConfigProfileUuid === null
    const statusInfo = useMemo(
        () => getStatusInfo(node, isConfigMissing, t),
        [isConfigMissing, node, t]
    )

    const runtimeMode = getNodeRuntimeMode(node)
    const isOnline = node.isConnected && !node.isDisabled
    const isCoreActive = isOnline && (runtimeMode === null || runtimeMode === 'CORE_ACTIVE')

    const prettyUsedData = prettifyBytesUtil(node.trafficUsedBytes || 0) || '0 B'
    const maxData = node.isTrafficTrackingActive
        ? prettifyBytesUtil(node.trafficLimitBytes || 0) || '∞'
        : '∞'
    const percentage = useMemo(() => {
        if (!node.isTrafficTrackingActive) return 0
        if (node.trafficLimitBytes === 0) return 100
        return Math.floor(((node.trafficUsedBytes ?? 0) * 100) / (node.trafficLimitBytes ?? 0))
    }, [node.isTrafficTrackingActive, node.trafficLimitBytes, node.trafficUsedBytes])
    const fallbackProgress = node.isTrafficTrackingActive && node.trafficLimitBytes === 0
    const progressColor = getProgressColor(percentage, fallbackProgress)

    const telemetry = useMemo(() => {
        if (!node.system) {
            return {
                cpus: 1,
                cpuPercent: null as number | null,
                cpuColor: 'teal',
                loadAvg: null as number[] | null,
                ramPercent: null as number | null,
                ramColor: 'teal',
                ramUsedPretty: '—',
                ramTotalPretty: '—',
                rxSpeed: '—',
                txSpeed: '—'
            }
        }
        const { cpus, memoryTotal } = node.system.info
        const { loadAvg, memoryUsed, interface: iface } = node.system.stats
        const safeCpus = Math.max(1, cpus)
        const cpuPercent = loadAvg ? Math.round((loadAvg[0] / safeCpus) * 100) : null
        let cpuColor = 'teal'
        if (cpuPercent !== null) {
            if (cpuPercent > 100) cpuColor = 'red'
            else if (cpuPercent > 70) cpuColor = 'yellow'
        }

        const ramPercent = memoryTotal > 0 ? Math.round((memoryUsed / memoryTotal) * 100) : 0
        let ramColor = 'teal'
        if (ramPercent > 90) ramColor = 'red'
        else if (ramPercent > 70) ramColor = 'yellow'

        return {
            cpus: safeCpus,
            cpuPercent,
            cpuColor,
            loadAvg,
            ramPercent,
            ramColor,
            ramUsedPretty: prettifyBytesUtil(memoryUsed, false) || '0 B',
            ramTotalPretty: prettifyBytesUtil(memoryTotal, false) || '0 B',
            rxSpeed: iface ? prettySiRealtimeBytesUtil(iface.rxBytesPerSec, true, true) : '—',
            txSpeed: iface ? prettySiRealtimeBytesUtil(iface.txBytesPerSec, true, true) : '—'
        }
    }, [node.system])

    const addressLabel = node.port ? `${node.address}:${node.port}` : node.address

    const handleCopy = (event: React.MouseEvent) => {
        event.stopPropagation()
        clipboard.copy(node.address)
        notifications.show({
            message: node.address,
            title: t('node-card.widget.copied'),
            color: 'teal'
        })
    }

    const handleOpenUsageStats = (event: React.MouseEvent) => {
        event.stopPropagation()
        showModal('nodes_nodeUsageStatsDrawer', { nodeUuid: node.uuid })
    }

    return (
        <Box
            className={classes.tile}
            data-selected={isSelected}
            data-status-tone={statusInfo.tone}
            onClick={() => onViewNode(node.uuid)}
        >
            {/* Header Row: Checkbox + Flag + Name | Status Pill + Quick Stats */}
            <Flex align="center" gap={8} justify="space-between" miw={0}>
                <Flex align="center" gap={7} miw={0} style={{ flex: 1 }}>
                    <Box
                        onClick={(event) => {
                            event.stopPropagation()
                            onToggleSelect(node, event.shiftKey)
                        }}
                        style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}
                    >
                        <Checkbox
                            aria-label={t('nodes-matrix.widget.select-node', { name: node.name })}
                            checked={isSelected}
                            color="cyan"
                            onChange={() => {}}
                            radius="xs"
                            size="xs"
                            styles={{ input: { cursor: 'pointer' } }}
                        />
                    </Box>

                    {node.countryCode && node.countryCode !== 'XX' && (
                        <ReactCountryFlag
                            countryCode={node.countryCode}
                            style={{
                                width: '1.3em',
                                height: '0.96em',
                                borderRadius: '2px',
                                flexShrink: 0
                            }}
                            svg
                        />
                    )}

                    <Text className={classes.nodeName} fw={600} size="sm" title={node.name}>
                        {node.name}
                    </Text>
                </Flex>

                <Flex align="center" gap={4} style={{ flexShrink: 0 }}>
                    <Badge
                        color={statusInfo.color}
                        leftSection={
                            isConfigMissing ? (
                                <TbAlertCircle size={11} />
                            ) : (
                                <span
                                    className={classes.statusDot}
                                    style={{ backgroundColor: statusInfo.dotColor }}
                                />
                            )
                        }
                        size="xs"
                        variant="light"
                    >
                        {statusInfo.label}
                    </Badge>

                    <ActionIcon
                        aria-label={t('node-card.widget.usage-stats')}
                        color="cyan"
                        onClick={handleOpenUsageStats}
                        size="sm"
                        title={t('node-card.widget.usage-stats')}
                        variant="subtle"
                    >
                        <TbChartArcs size={14} />
                    </ActionIcon>
                </Flex>
            </Flex>

            {/* Sub-header Row: Address:Port | Provider + Drift + Multiplier */}
            <Flex align="center" gap={6} justify="space-between" miw={0}>
                <Flex align="center" gap={5} miw={0} style={{ flex: 1 }}>
                    <PiGlobeSimple className={classes.icon} size={12} />
                    <Text
                        c="dimmed"
                        className={classes.addressText}
                        onClick={handleCopy}
                        size="xs"
                        title={t('node-card.widget.copy-address')}
                    >
                        {addressLabel}
                    </Text>
                </Flex>

                <Flex align="center" gap={4} style={{ flexShrink: 0 }}>
                    {node.versionDrift && (
                        <Badge color="orange" size="xs" variant="light">
                            {t('node-card.widget.version-drift')}
                        </Badge>
                    )}
                    {node.consumptionMultiplier !== 1 && (
                        <Badge className={classes.tabular} color="violet" size="xs" variant="light">
                            {node.consumptionMultiplier.toFixed(1)}×
                        </Badge>
                    )}
                    {node.provider && (
                        <Badge
                            color="gray"
                            leftSection={
                                <Avatar
                                    alt={node.provider.name}
                                    color="initials"
                                    imageProps={{ decoding: 'async', loading: 'lazy' }}
                                    name={node.provider.name}
                                    onLoad={(event) => {
                                        const img = event.target as HTMLImageElement
                                        if (img.naturalWidth <= 16 && img.naturalHeight <= 16) {
                                            img.src = ''
                                        }
                                    }}
                                    radius="sm"
                                    size={12}
                                    src={faviconResolver(node.provider.faviconLink)}
                                />
                            }
                            size="xs"
                            style={{
                                maxWidth: '14ch',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}
                            variant="light"
                        >
                            {node.provider.name}
                        </Badge>
                    )}
                </Flex>
            </Flex>

            {/* 2-Column Live KPI Strip: Throughput | Online Users & Uptime */}
            <div className={classes.kpiStrip}>
                <div className={classes.kpiCell}>
                    <Flex align="center" gap={5} miw={0}>
                        <PiArrowDownDuotone
                            color="var(--mantine-color-teal-5)"
                            size={12}
                            style={{ flexShrink: 0 }}
                        />
                        <Text className={classes.tabular} fw={600} size="xs" truncate>
                            {telemetry.rxSpeed}
                        </Text>
                    </Flex>
                    <Flex align="center" gap={5} miw={0}>
                        <PiArrowUpDuotone
                            color="var(--mantine-color-cyan-5)"
                            size={12}
                            style={{ flexShrink: 0 }}
                        />
                        <Text c="dimmed" className={classes.tabular} fw={500} size="xs" truncate>
                            {telemetry.txSpeed}
                        </Text>
                    </Flex>
                </div>

                <div className={classes.kpiCell}>
                    <Flex align="center" gap={5} justify="space-between" miw={0}>
                        <Flex align="center" gap={4}>
                            <PiUsersDuotone
                                color={
                                    (node.usersOnline ?? 0) > 0
                                        ? 'var(--mantine-color-teal-5)'
                                        : 'var(--mantine-color-dimmed)'
                                }
                                size={13}
                            />
                            <Text className={classes.tabular} fw={600} size="xs">
                                {node.usersOnline ?? 0}
                            </Text>
                        </Flex>
                        <Text c="dimmed" size="10px">
                            {t('use-nodes-table-widget.online')}
                        </Text>
                    </Flex>

                    <Flex align="center" gap={4} miw={0}>
                        <PiCpuDuotone
                            color={
                                isCoreActive
                                    ? 'var(--mantine-color-teal-5)'
                                    : 'var(--mantine-color-dimmed)'
                            }
                            size={12}
                            style={{ flexShrink: 0 }}
                        />
                        <Text
                            c={isCoreActive ? 'teal' : 'dimmed'}
                            className={classes.tabular}
                            fw={isCoreActive ? 600 : 400}
                            size="xs"
                            truncate
                        >
                            {isCoreActive ? getCoreUptimeUtil(node.coreUptime) : '—'}
                        </Text>
                    </Flex>
                </div>
            </div>

            {/* Dual System Gauges: CPU Load | RAM */}
            <div className={classes.gaugeGrid}>
                <Tooltip
                    label={
                        telemetry.loadAvg ? (
                            <Stack gap={2}>
                                <Text fw={600} size="xs">
                                    {t('node-card.widget.load-average-title', {
                                        count: telemetry.cpus
                                    })}
                                </Text>
                                <Text className={classes.tabular} size="xs">
                                    {t('node-card.widget.load-1m', {
                                        value: telemetry.loadAvg[0].toFixed(2),
                                        percent: Math.round(
                                            (telemetry.loadAvg[0] / telemetry.cpus) * 100
                                        )
                                    })}
                                </Text>
                                <Text className={classes.tabular} size="xs">
                                    {t('node-card.widget.load-5m', {
                                        value: telemetry.loadAvg[1].toFixed(2),
                                        percent: Math.round(
                                            (telemetry.loadAvg[1] / telemetry.cpus) * 100
                                        )
                                    })}
                                </Text>
                                <Text className={classes.tabular} size="xs">
                                    {t('node-card.widget.load-15m', {
                                        value: telemetry.loadAvg[2].toFixed(2),
                                        percent: Math.round(
                                            (telemetry.loadAvg[2] / telemetry.cpus) * 100
                                        )
                                    })}
                                </Text>
                                <Text c="dimmed" mt={2} size="xs">
                                    {t('node-card.widget.load-legend')}
                                </Text>
                            </Stack>
                        ) : (
                            t('node-card.widget.no-data')
                        )
                    }
                    multiline
                    radius="md"
                    w={250}
                >
                    <Stack gap={4} miw={0}>
                        <Flex align="center" justify="space-between">
                            <Text c="dimmed" className={classes.tabular} size="11px">
                                {`${t('nodes-matrix.widget.cpu')} · ${telemetry.cpus}C`}
                            </Text>
                            <Text className={classes.tabular} fw={500} size="11px">
                                {telemetry.loadAvg
                                    ? `${telemetry.loadAvg[0].toFixed(2)} (${telemetry.cpuPercent}%)`
                                    : '—'}
                            </Text>
                        </Flex>
                        <Progress
                            color={telemetry.cpuColor}
                            radius="sm"
                            size={4}
                            value={Math.min(100, telemetry.cpuPercent ?? 0)}
                        />
                    </Stack>
                </Tooltip>

                <Tooltip
                    label={
                        telemetry.ramPercent !== null
                            ? t('nodes-matrix.widget.ram-detail', {
                                  used: telemetry.ramUsedPretty,
                                  total: telemetry.ramTotalPretty,
                                  percent: telemetry.ramPercent
                              })
                            : t('node-card.widget.no-data')
                    }
                    radius="md"
                >
                    <Stack gap={4} miw={0}>
                        <Flex align="center" justify="space-between">
                            <Text c="dimmed" size="11px">
                                {t('nodes-matrix.widget.ram')}
                            </Text>
                            <Text className={classes.tabular} fw={500} size="11px">
                                {telemetry.ramPercent !== null ? `${telemetry.ramPercent}%` : '—'}
                            </Text>
                        </Flex>
                        <Progress
                            color={telemetry.ramColor}
                            radius="sm"
                            size={4}
                            value={telemetry.ramPercent ?? 0}
                        />
                    </Stack>
                </Tooltip>
            </div>

            {/* Traffic Quota & Budget Progress */}
            <div className={classes.quotaBlock}>
                <Flex align="baseline" gap={6} justify="space-between">
                    <Flex align="baseline" gap={4} miw={0}>
                        <Text className={classes.tabular} fw={600} size="xs" truncate>
                            {prettyUsedData}
                        </Text>
                        <Text c="dimmed" className={classes.tabular} size="11px">
                            {`/ ${maxData}`}
                        </Text>
                    </Flex>

                    {node.isTrafficTrackingActive && (
                        <Flex align="center" gap={3} style={{ flexShrink: 0 }}>
                            <PiArrowsCounterClockwise className={classes.icon} size={11} />
                            <Text c="dimmed" className={classes.tabular} size="11px">
                                {getNodeResetDaysUtil(node.trafficResetDay ?? 1)}
                            </Text>
                        </Flex>
                    )}
                </Flex>

                <NodeTrafficProgress
                    color={node.isTrafficTrackingActive && percentage >= 0 ? progressColor : 'teal'}
                    compact
                    node={node}
                    size="xs"
                    value={node.isTrafficTrackingActive && percentage >= 0 ? percentage : 100}
                />

                <div className={classes.footerMeta}>
                    <Flex align="center" gap={4} miw={0} style={{ flex: 1, overflow: 'hidden' }}>
                        {(node.tags ?? []).slice(0, 3).map((tag) => (
                            <Badge
                                color="gray"
                                key={tag}
                                size="xs"
                                style={{ flexShrink: 0 }}
                                variant="light"
                            >
                                {tag}
                            </Badge>
                        ))}
                    </Flex>

                    <Flex align="center" gap={6} style={{ flexShrink: 0 }}>
                        {node.versions?.singBox && node.versions.core && (
                            <Text c="dimmed" className={classes.tabular} size="11px">
                                {getNodeCoreDisplay(node.versions)}
                            </Text>
                        )}
                        <Flex align="center" gap={3}>
                            <Logo color="var(--mantine-color-dimmed)" size={11} />
                            <Text c="dimmed" className={classes.tabular} size="11px">
                                {node.versions?.node ?? '—'}
                            </Text>
                        </Flex>
                    </Flex>
                </div>
            </div>
        </Box>
    )
})
