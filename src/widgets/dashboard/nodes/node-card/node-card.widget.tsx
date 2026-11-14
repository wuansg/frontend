import { OptimisticSortingPlugin } from '@dnd-kit/dom/sortable'
import { useSortable } from '@dnd-kit/react/sortable'
import { ActionIcon, Avatar, Badge, Box, Flex, Progress, Stack, Text, Tooltip } from '@mantine/core'
import { useClipboard } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import clsx from 'clsx'
import { CSSProperties, memo, useMemo } from 'react'
import ReactCountryFlag from 'react-country-flag'
import { useTranslation } from 'react-i18next'
import {
    PiArrowDownDuotone,
    PiArrowsCounterClockwise,
    PiArrowUpDuotone,
    PiCpuDuotone,
    PiDotsSixVertical,
    PiGlobeSimple,
    PiMemoryDuotone,
    PiProhibitDuotone,
    PiUsersDuotone,
    PiWarningCircleDuotone
} from 'react-icons/pi'
import { TbAlertCircle, TbChartArcs } from 'react-icons/tb'

import { showModal } from '@shared/_modals/show-modal'
import { Logo } from '@shared/ui/logo'
import { NodeTrafficProgress } from '@shared/ui/node-traffic-progress'
import { prettifyBytesUtil, prettySiRealtimeBytesUtil } from '@shared/utils/bytes'
import { faviconResolver } from '@shared/utils/misc'
import { getNodeCoreDisplay } from '@shared/utils/node-core-version'
import { getNodeRuntimeMode } from '@shared/utils/node-runtime-status'
import { getCoreUptimeUtil, getNodeResetDaysUtil } from '@shared/utils/time-utils'

import { NodeStatusBadgeWidget } from '../node-status-badge'
import { IProps } from './interfaces'
import classes from './NodeCard.module.css'

type NodeStatusTone = 'blue' | 'gray' | 'orange' | 'red' | 'teal' | 'yellow'

const getNodeStatusTone = (node: IProps['node'], isConfigMissing: boolean): NodeStatusTone => {
    if (isConfigMissing) return 'red'
    if (node.isDisabled) return 'gray'
    if (node.isConnected) {
        if (node.runtimeStatus?.mode === 'DEGRADED') return 'orange'
        if (node.runtimeStatus?.mode === 'FORWARDING_ONLY') return 'blue'
        if (node.runtimeStatus?.mode === 'IDLE') return 'gray'
        return 'teal'
    }
    if (node.isConnecting) return 'yellow'
    return 'red'
}

const getProgressColor = (percentage: number, fallback: boolean) => {
    if (fallback) return 'teal.6'
    if (percentage > 95) return 'red.6'
    if (percentage > 80) return 'yellow.6'
    return 'teal.6'
}

const getPercentTextColor = (percent: number | null, isOnline: boolean) => {
    if (!isOnline || percent === null) return 'dimmed'
    if (percent > 90) return 'red'
    if (percent > 70) return 'orange'
    return 'dimmed'
}

export const NodeCardWidget = memo((props: IProps) => {
    const { t } = useTranslation()
    const {
        handleViewNode,
        node,
        index,
        isDragOverlay = false,
        isMobile,
        disableReordering = false
    } = props

    const clipboard = useClipboard({ timeout: 500 })

    const sortable = useSortable({
        id: node.uuid,
        index,
        disabled: isDragOverlay || disableReordering,
        plugins: (defaults) => defaults.filter((plugin) => plugin !== OptimisticSortingPlugin)
    })

    const isDragging = !isDragOverlay && sortable.isDragging
    const { ref, handleRef } = sortable

    const style: CSSProperties = {
        opacity: isDragging ? 0 : 1,
        zIndex: isDragging ? 1000 : 'auto'
    }

    const prettyUsedData = prettifyBytesUtil(node.trafficUsedBytes || 0) || '0 B'
    const maxData = node.isTrafficTrackingActive
        ? prettifyBytesUtil(node.trafficLimitBytes || 0) || '∞'
        : '∞'
    const hasFiniteQuota = node.isTrafficTrackingActive && (node.trafficLimitBytes ?? 0) > 0

    const calcPercentage = () => {
        if (!node.isTrafficTrackingActive) return 0
        if (node.trafficLimitBytes === 0) return 100
        return Math.floor(((node.trafficUsedBytes ?? 0) * 100) / (node.trafficLimitBytes ?? 0))
    }
    const percentage = calcPercentage()
    const fallbackProgress = node.isTrafficTrackingActive && node.trafficLimitBytes === 0

    const runtimeMode = getNodeRuntimeMode(node)
    const isOnline = node.isConnected && !node.isDisabled
    const isCoreActive = isOnline && (runtimeMode === null || runtimeMode === 'CORE_ACTIVE')
    const isConfigMissing = node.configProfile.activeConfigProfileUuid === null
    const statusTone = getNodeStatusTone(node, isConfigMissing)
    const progressColor = getProgressColor(percentage, fallbackProgress)
    const activeUsersCount = isOnline ? (node.usersOnline ?? 0) : 0

    const { cpuColor, cpuPercent, cpus, loadAvg, ramColor, ramPercentage, rxSpeed, txSpeed } =
        useMemo(() => {
            if (!node.system) {
                return {
                    ramPercentage: null,
                    ramColor: 'teal',
                    cpuPercent: null as number | null,
                    cpuColor: 'teal',
                    rxSpeed: null,
                    txSpeed: null,
                    loadAvg: null,
                    cpus: 1
                }
            }
            const { memoryTotal, cpus: rawCpus } = node.system.info
            const { memoryUsed, loadAvg } = node.system.stats
            const safeCpus = Math.max(1, rawCpus)

            const cpuPercent = loadAvg ? Math.round((loadAvg[0] / safeCpus) * 100) : null
            let cpuColor = 'teal'
            if (cpuPercent !== null) {
                if (cpuPercent > 100) cpuColor = 'red'
                else if (cpuPercent > 70) cpuColor = 'orange'
            }

            const ramPercentage = memoryTotal > 0 ? Math.round((memoryUsed / memoryTotal) * 100) : 0

            let ramColor = 'teal'
            if (ramPercentage > 90) ramColor = 'red'
            else if (ramPercentage > 70) ramColor = 'orange'

            if (!node.system.stats.interface) {
                return {
                    ramPercentage,
                    ramColor,
                    cpuPercent,
                    cpuColor,
                    rxSpeed: null,
                    txSpeed: null,
                    loadAvg,
                    cpus: safeCpus
                }
            }
            return {
                ramPercentage,
                ramColor,
                cpuPercent,
                cpuColor,
                rxSpeed: prettySiRealtimeBytesUtil(
                    node.system.stats.interface.rxBytesPerSec,
                    true,
                    true
                ),
                txSpeed: prettySiRealtimeBytesUtil(
                    node.system.stats.interface.txBytesPerSec,
                    true,
                    true
                ),
                loadAvg,
                cpus: safeCpus
            }
        }, [node.system])

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation()
        clipboard.copy(node.address)
        notifications.show({
            message: node.address,
            title: t('node-card.widget.copied'),
            color: 'teal'
        })
    }

    const handleOpenUsageStats = (e: React.MouseEvent) => {
        e.stopPropagation()
        showModal('nodes_nodeUsageStatsDrawer', { nodeUuid: node.uuid })
    }

    const addressLabel = node.port ? `${node.address}:${node.port}` : node.address
    const cpuTextColor = getPercentTextColor(cpuPercent, isOnline)
    const ramTextColor = getPercentTextColor(ramPercentage, isOnline)

    let quotaBadgeColor = 'gray'
    if (percentage > 95) quotaBadgeColor = 'red'
    else if (percentage > 80) quotaBadgeColor = 'orange'

    const statusPill = useMemo(() => {
        if (isConfigMissing) return null
        if (node.isDisabled) {
            return (
                <Badge color="gray" fw={700} size="xs" style={{ flexShrink: 0 }} variant="light">
                    {t('node-status-badge.widget.disabled')}
                </Badge>
            )
        }
        if (!node.isConnected) {
            if (node.isConnecting) {
                return (
                    <Badge
                        color="yellow"
                        fw={700}
                        size="xs"
                        style={{ flexShrink: 0 }}
                        variant="light"
                    >
                        {t('node-status-badge.widget.connecting')}
                    </Badge>
                )
            }
            return (
                <Badge color="red" fw={700} size="xs" style={{ flexShrink: 0 }} variant="filled">
                    {t('node-status-badge.widget.disconnected')}
                </Badge>
            )
        }
        if (runtimeMode === 'DEGRADED') {
            return (
                <Badge color="orange" fw={700} size="xs" style={{ flexShrink: 0 }} variant="filled">
                    {t('node-status-badge.widget.degraded')}
                </Badge>
            )
        }
        if (runtimeMode === 'FORWARDING_ONLY') {
            return (
                <Badge color="blue" fw={700} size="xs" style={{ flexShrink: 0 }} variant="light">
                    {t('node-status-badge.widget.forwarding-only')}
                </Badge>
            )
        }
        if (runtimeMode === 'IDLE') {
            return (
                <Badge color="gray" fw={700} size="xs" style={{ flexShrink: 0 }} variant="light">
                    {t('node-status-badge.widget.idle')}
                </Badge>
            )
        }
        return null
    }, [isConfigMissing, node.isConnected, node.isConnecting, node.isDisabled, runtimeMode, t])

    const multiplierBadge =
        node.consumptionMultiplier !== 1 ? (
            <Badge
                className={classes.tabular}
                color="violet"
                fw={700}
                size="xs"
                style={{ flexShrink: 0 }}
                variant="light"
            >
                {node.consumptionMultiplier.toFixed(1)}×
            </Badge>
        ) : null

    const providerBadge = node.provider ? (
        <Badge
            color="gray"
            leftSection={
                <Avatar
                    alt={node.provider.name}
                    color="initials"
                    imageProps={{
                        decoding: 'async',
                        loading: 'lazy'
                    }}
                    name={node.provider.name}
                    onLoad={(event) => {
                        const img = event.target as HTMLImageElement
                        if (img.naturalWidth <= 16 && img.naturalHeight <= 16) {
                            img.src = ''
                        }
                    }}
                    radius="sm"
                    size={13}
                    src={faviconResolver(node.provider.faviconLink)}
                />
            }
            size="xs"
            style={{
                maxWidth: '16ch',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flexShrink: 0
            }}
            variant="light"
        >
            {node.provider.name}
        </Badge>
    ) : null

    const flagElement = (
        <span className={classes.flagFrame}>
            {node.countryCode && node.countryCode !== 'XX' ? (
                <ReactCountryFlag
                    countryCode={node.countryCode}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block'
                    }}
                    svg
                />
            ) : (
                <PiGlobeSimple className={classes.icon} size={13} />
            )}
        </span>
    )

    return (
        <Box
            className={clsx(classes.nodeRow, {
                [classes.nodeRowDragging]: isDragging,
                [classes.nodeRowNoReorder]: disableReordering
            })}
            data-disabled={node.isDisabled}
            data-drag-overlay={isDragOverlay}
            data-status-tone={statusTone}
            onClick={() => handleViewNode(node.uuid)}
            ref={isDragOverlay ? undefined : ref}
            style={style}
        >
            {!disableReordering && (
                <Box
                    className={clsx(classes.dragHandle, {
                        [classes.dragHandleActive]: isDragging
                    })}
                    onClick={(e) => e.stopPropagation()}
                    ref={isDragOverlay ? undefined : handleRef}
                >
                    <PiDotsSixVertical size={20} />
                </Box>
            )}

            {!isMobile && (
                <>
                    <div className={classes.desktopGrid}>
                        {/* Col 1: Status + Framed Flag + Bold Name + Alert/Mode/Multiplier/Provider Pills */}
                        <Flex align="center" gap="xs" miw={0}>
                            {isConfigMissing ? (
                                <Badge
                                    color="red"
                                    fw={700}
                                    leftSection={<TbAlertCircle size={13} />}
                                    size="sm"
                                    style={{ flexShrink: 0 }}
                                    variant="filled"
                                >
                                    {t('node-card.widget.dangling')}
                                </Badge>
                            ) : (
                                <NodeStatusBadgeWidget node={node} withText={false} />
                            )}

                            <Flex align="center" className={classes.nameContainer} gap={8}>
                                {flagElement}
                                <Text className={classes.nodeName} fw={700}>
                                    {node.name}
                                </Text>
                            </Flex>

                            <Flex align="center" gap={5} style={{ flexShrink: 0 }}>
                                {statusPill}
                                {node.versionDrift && (
                                    <Badge color="orange" fw={700} size="xs" variant="light">
                                        {t('node-card.widget.version-drift')}
                                    </Badge>
                                )}
                                {multiplierBadge}
                                {providerBadge}
                            </Flex>
                        </Flex>

                        {/* Col 2: Online Users + Primary Live Throughput */}
                        <Flex align="center" gap={8} miw={0}>
                            <Badge
                                className={classes.tabular}
                                color={activeUsersCount > 0 ? 'teal' : 'gray'}
                                fw={700}
                                leftSection={<PiUsersDuotone size={13} />}
                                miw="6ch"
                                size="md"
                                style={{ flexShrink: 0 }}
                                variant="light"
                            >
                                {activeUsersCount}
                            </Badge>

                            <div
                                className={clsx(
                                    classes.liveSpeedBox,
                                    !isOnline && classes.liveSpeedBoxOffline
                                )}
                            >
                                {isOnline ? (
                                    <>
                                        <Flex align="center" gap={4} miw={0}>
                                            <PiArrowDownDuotone
                                                color="var(--mantine-color-teal-5)"
                                                size={13}
                                                style={{ flexShrink: 0 }}
                                            />
                                            <Text
                                                className={classes.tabular}
                                                fw={700}
                                                size="xs"
                                                truncate
                                            >
                                                {rxSpeed ?? '—'}
                                            </Text>
                                        </Flex>
                                        <Flex align="center" gap={4} miw={0}>
                                            <PiArrowUpDuotone
                                                color="var(--mantine-color-cyan-5)"
                                                size={13}
                                                style={{ flexShrink: 0 }}
                                            />
                                            <Text
                                                c="dimmed"
                                                className={classes.tabular}
                                                fw={600}
                                                size="xs"
                                                truncate
                                            >
                                                {txSpeed ?? '—'}
                                            </Text>
                                        </Flex>
                                    </>
                                ) : (
                                    <Flex align="center" gap={5} miw={0}>
                                        {node.isDisabled ? (
                                            <PiProhibitDuotone
                                                color="var(--mantine-color-gray-5)"
                                                size={13}
                                                style={{ flexShrink: 0 }}
                                            />
                                        ) : (
                                            <PiWarningCircleDuotone
                                                color="var(--mantine-color-red-5)"
                                                size={13}
                                                style={{ flexShrink: 0 }}
                                            />
                                        )}
                                        <Text
                                            c={node.isDisabled ? 'dimmed' : 'red'}
                                            fw={600}
                                            size="xs"
                                            truncate
                                        >
                                            {node.isDisabled
                                                ? t('node-card.widget.disabled-telemetry')
                                                : t('node-card.widget.offline-telemetry')}
                                        </Text>
                                    </Flex>
                                )}
                            </div>
                        </Flex>

                        {/* Col 3: Traffic Quota + % + Reset + Budget Progress (Drives dynamic height!) */}
                        <Box miw={0}>
                            <Flex direction="column" gap={4}>
                                <Flex align="center" gap={6} justify="space-between">
                                    <Flex align="baseline" gap={4} miw={0}>
                                        <Text
                                            className={classes.tabular}
                                            fw={700}
                                            size="xs"
                                            truncate
                                        >
                                            {prettyUsedData}
                                        </Text>
                                        <Text c="dimmed" className={classes.tabular} size="11px">
                                            {`/ ${maxData}`}
                                        </Text>
                                        {hasFiniteQuota && (
                                            <Badge
                                                className={classes.tabular}
                                                color={quotaBadgeColor}
                                                fw={700}
                                                ml={2}
                                                size="xs"
                                                variant={percentage > 80 ? 'filled' : 'light'}
                                            >
                                                {`${percentage}%`}
                                            </Badge>
                                        )}
                                    </Flex>

                                    {node.isTrafficTrackingActive && (
                                        <Flex align="center" gap={3} style={{ flexShrink: 0 }}>
                                            <PiArrowsCounterClockwise
                                                className={classes.icon}
                                                size={11}
                                            />
                                            <Text
                                                c="dimmed"
                                                className={classes.tabular}
                                                size="11px"
                                            >
                                                {getNodeResetDaysUtil(node.trafficResetDay ?? 1)}
                                            </Text>
                                        </Flex>
                                    )}
                                </Flex>

                                <NodeTrafficProgress
                                    color={node.isTrafficTrackingActive ? progressColor : 'teal'}
                                    compact
                                    node={node}
                                    size="sm"
                                    value={node.isTrafficTrackingActive ? percentage : 100}
                                />
                            </Flex>
                        </Box>

                        {/* Col 4: Core Uptime + Quick Stats Drawer Trigger */}
                        <Flex align="center" gap={8} justify="flex-end" style={{ flexShrink: 0 }}>
                            {isCoreActive && (
                                <Flex align="center" gap={4}>
                                    <PiCpuDuotone
                                        color="var(--mantine-color-teal-5)"
                                        size={13}
                                        style={{ flexShrink: 0 }}
                                    />
                                    <Text c="teal" className={classes.tabular} fw={700} size="xs">
                                        {getCoreUptimeUtil(node.coreUptime)}
                                    </Text>
                                </Flex>
                            )}

                            <ActionIcon
                                aria-label={t('node-card.widget.usage-stats')}
                                color="cyan"
                                onClick={handleOpenUsageStats}
                                size="sm"
                                style={{ flexShrink: 0 }}
                                title={t('node-card.widget.usage-stats')}
                                variant="light"
                            >
                                <TbChartArcs size={15} />
                            </ActionIcon>
                        </Flex>
                    </div>

                    {/* Band 2: Address + Tags | CPU & RAM Gauges + Versions */}
                    <div className={classes.telemetryRow}>
                        <Flex align="center" gap={8} miw={0} style={{ flex: '1 1 220px' }}>
                            <Flex align="center" gap={5} miw={0}>
                                <PiGlobeSimple className={classes.icon} size={13} />
                                <Text
                                    c="dimmed"
                                    className={classes.addressText}
                                    onClick={handleCopy}
                                    title={t('node-card.widget.copy-address')}
                                >
                                    {addressLabel}
                                </Text>
                            </Flex>

                            <Flex align="center" gap={4} style={{ flexShrink: 0 }}>
                                {(node.tags ?? []).slice(0, 3).map((tag) => (
                                    <Badge color="gray" key={tag} size="xs" variant="light">
                                        {tag}
                                    </Badge>
                                ))}
                            </Flex>
                        </Flex>

                        <Flex
                            align="center"
                            className={clsx(!isOnline && classes.telemetryGaugesOffline)}
                            gap="md"
                            ml="auto"
                            wrap="wrap"
                        >
                            <Tooltip
                                label={
                                    loadAvg ? (
                                        <Stack gap={2}>
                                            <Text fw={600} size="xs">
                                                {t('node-card.widget.load-average-title', {
                                                    count: cpus
                                                })}
                                            </Text>
                                            <Text className={classes.tabular} size="xs">
                                                {t('node-card.widget.load-1m', {
                                                    value: loadAvg[0].toFixed(2),
                                                    percent: Math.round((loadAvg[0] / cpus) * 100)
                                                })}
                                            </Text>
                                            <Text className={classes.tabular} size="xs">
                                                {t('node-card.widget.load-5m', {
                                                    value: loadAvg[1].toFixed(2),
                                                    percent: Math.round((loadAvg[1] / cpus) * 100)
                                                })}
                                            </Text>
                                            <Text className={classes.tabular} size="xs">
                                                {t('node-card.widget.load-15m', {
                                                    value: loadAvg[2].toFixed(2),
                                                    percent: Math.round((loadAvg[2] / cpus) * 100)
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
                                w={260}
                            >
                                <Flex align="center" gap={6}>
                                    <PiCpuDuotone className={classes.icon} size={13} />
                                    <Text c="dimmed" className={classes.tabular} size="11px">
                                        {`${cpus}C`}
                                    </Text>
                                    <Progress
                                        color={isOnline ? cpuColor : 'gray'}
                                        radius="xl"
                                        size={5}
                                        style={{ width: 54 }}
                                        value={Math.min(100, cpuPercent ?? 0)}
                                    />
                                    <Text
                                        c={cpuTextColor}
                                        className={classes.tabular}
                                        fw={cpuTextColor !== 'dimmed' ? 700 : 500}
                                        size="xs"
                                    >
                                        {loadAvg
                                            ? `${loadAvg[0].toFixed(2)} (${cpuPercent}%)`
                                            : '—'}
                                    </Text>
                                </Flex>
                            </Tooltip>

                            <Flex align="center" gap={6}>
                                <PiMemoryDuotone className={classes.icon} size={13} />
                                <Progress
                                    color={isOnline ? ramColor : 'gray'}
                                    radius="xl"
                                    size={5}
                                    style={{ width: 54 }}
                                    value={ramPercentage ?? 0}
                                />
                                <Text
                                    c={ramTextColor}
                                    className={classes.tabular}
                                    fw={ramTextColor !== 'dimmed' ? 700 : 500}
                                    size="xs"
                                >
                                    {ramPercentage !== null ? `${ramPercentage}%` : '—'}
                                </Text>
                            </Flex>

                            <Flex align="center" gap="xs" justify="flex-end" miw={144}>
                                <Flex align="center" gap={4}>
                                    <PiCpuDuotone color="var(--mantine-color-dimmed)" size={12} />
                                    <Text c="dimmed" className={classes.tabular} size="xs">
                                        {node.versions ? getNodeCoreDisplay(node.versions) : '—'}
                                    </Text>
                                </Flex>
                                <Flex align="center" gap={4}>
                                    <Logo color="var(--mantine-color-dimmed)" size={12} />
                                    <Text c="dimmed" className={classes.tabular} size="xs">
                                        {node.versions ? node.versions.node : '—'}
                                    </Text>
                                </Flex>
                            </Flex>
                        </Flex>
                    </div>
                </>
            )}

            {isMobile && (
                <Box>
                    <Flex align="center" gap={7} mb={6} miw={0}>
                        {isConfigMissing ? (
                            <Badge
                                color="red"
                                fw={700}
                                leftSection={<TbAlertCircle size={12} />}
                                size="xs"
                                style={{ flexShrink: 0 }}
                                variant="filled"
                            >
                                {t('node-card.widget.dangling')}
                            </Badge>
                        ) : (
                            <NodeStatusBadgeWidget node={node} withText={false} />
                        )}

                        <Flex align="center" gap={7} style={{ flex: 1, minWidth: 0 }}>
                            {flagElement}
                            <Text className={classes.nodeName} fw={700}>
                                {node.name}
                            </Text>
                        </Flex>

                        {statusPill}

                        <ActionIcon
                            aria-label={t('node-card.widget.usage-stats')}
                            color="cyan"
                            onClick={handleOpenUsageStats}
                            size="sm"
                            style={{ flexShrink: 0 }}
                            variant="light"
                        >
                            <TbChartArcs size={14} />
                        </ActionIcon>
                    </Flex>

                    <Flex align="center" gap={6} mb={8} miw={0} wrap="wrap">
                        <Flex align="center" gap={4} miw={0} style={{ flex: '1 1 120px' }}>
                            <PiGlobeSimple className={classes.icon} size={12} />
                            <Text c="dimmed" className={classes.addressText} onClick={handleCopy}>
                                {addressLabel}
                            </Text>
                        </Flex>

                        {node.versionDrift && (
                            <Badge color="orange" fw={700} size="xs" variant="light">
                                {t('node-card.widget.version-drift')}
                            </Badge>
                        )}
                        {multiplierBadge}
                        {providerBadge}
                    </Flex>

                    <div className={classes.mobileKpiStrip}>
                        <div className={classes.mobileKpiCell}>
                            {isOnline ? (
                                <>
                                    <Flex align="center" gap={4} miw={0}>
                                        <PiArrowDownDuotone
                                            color="var(--mantine-color-teal-5)"
                                            size={12}
                                        />
                                        <Text
                                            className={classes.tabular}
                                            fw={700}
                                            size="xs"
                                            truncate
                                        >
                                            {rxSpeed ?? '—'}
                                        </Text>
                                    </Flex>
                                    <Flex align="center" gap={4} miw={0}>
                                        <PiArrowUpDuotone
                                            color="var(--mantine-color-cyan-5)"
                                            size={11}
                                        />
                                        <Text
                                            c="dimmed"
                                            className={classes.tabular}
                                            fw={600}
                                            size="11px"
                                            truncate
                                        >
                                            {txSpeed ?? '—'}
                                        </Text>
                                    </Flex>
                                </>
                            ) : (
                                <Text
                                    c={node.isDisabled ? 'dimmed' : 'red'}
                                    fw={600}
                                    size="xs"
                                    truncate
                                >
                                    {node.isDisabled
                                        ? t('node-card.widget.disabled-telemetry')
                                        : t('node-card.widget.offline-telemetry')}
                                </Text>
                            )}
                        </div>

                        <div className={classes.mobileKpiCell}>
                            <Flex align="center" gap={5} justify="space-between" miw={0}>
                                <Flex align="center" gap={4}>
                                    <PiUsersDuotone
                                        color={
                                            activeUsersCount > 0
                                                ? 'var(--mantine-color-teal-5)'
                                                : 'var(--mantine-color-dimmed)'
                                        }
                                        size={13}
                                    />
                                    <Text
                                        c={activeUsersCount > 0 ? 'teal' : 'dimmed'}
                                        className={classes.tabular}
                                        fw={800}
                                        size="sm"
                                    >
                                        {activeUsersCount}
                                    </Text>
                                </Flex>
                                <Text c="dimmed" size="10px">
                                    {t('use-nodes-table-widget.online')}
                                </Text>
                            </Flex>

                            <Flex align="center" gap={4}>
                                <PiCpuDuotone
                                    color={
                                        isCoreActive
                                            ? 'var(--mantine-color-teal-5)'
                                            : 'var(--mantine-color-dimmed)'
                                    }
                                    size={11}
                                />
                                <Text
                                    c={isCoreActive ? 'teal' : 'dimmed'}
                                    className={classes.tabular}
                                    fw={isCoreActive ? 600 : 500}
                                    size="11px"
                                >
                                    {isCoreActive ? getCoreUptimeUtil(node.coreUptime) : '—'}
                                </Text>
                            </Flex>
                        </div>
                    </div>

                    <Flex align="center" gap={6} justify="space-between" mb={4}>
                        <Flex align="baseline" gap={4} miw={0}>
                            <Text className={classes.tabular} fw={700} size="xs" truncate>
                                {prettyUsedData}
                            </Text>
                            <Text c="dimmed" className={classes.tabular} size="11px">
                                {`/ ${maxData}`}
                            </Text>
                            {hasFiniteQuota && (
                                <Badge
                                    className={classes.tabular}
                                    color={quotaBadgeColor}
                                    fw={700}
                                    size="xs"
                                    variant={percentage > 80 ? 'filled' : 'light'}
                                >
                                    {`${percentage}%`}
                                </Badge>
                            )}
                        </Flex>

                        {node.isTrafficTrackingActive && (
                            <Flex align="center" gap={3}>
                                <PiArrowsCounterClockwise className={classes.icon} size={11} />
                                <Text c="dimmed" className={classes.tabular} size="11px">
                                    {getNodeResetDaysUtil(node.trafficResetDay ?? 1)}
                                </Text>
                            </Flex>
                        )}
                    </Flex>

                    <NodeTrafficProgress
                        color={
                            node.isTrafficTrackingActive && percentage >= 0 ? progressColor : 'teal'
                        }
                        compact
                        node={node}
                        size="xs"
                        value={node.isTrafficTrackingActive && percentage >= 0 ? percentage : 100}
                    />

                    <div
                        className={clsx(
                            classes.mobileTelemetryRow,
                            !isOnline && classes.telemetryGaugesOffline
                        )}
                    >
                        <Flex align="center" gap={5} style={{ flex: '1 1 110px' }}>
                            <PiCpuDuotone className={classes.icon} size={11} />
                            <Progress
                                color={isOnline ? cpuColor : 'gray'}
                                radius="xl"
                                size={4}
                                style={{ flex: 1 }}
                                value={Math.min(100, cpuPercent ?? 0)}
                            />
                            <Text
                                c={cpuTextColor}
                                className={classes.tabular}
                                fw={cpuTextColor !== 'dimmed' ? 700 : 500}
                                size="11px"
                            >
                                {cpuPercent !== null ? `${cpuPercent}%` : '—'}
                            </Text>
                        </Flex>

                        <Flex align="center" gap={5} style={{ flex: '1 1 110px' }}>
                            <PiMemoryDuotone className={classes.icon} size={11} />
                            <Progress
                                color={isOnline ? ramColor : 'gray'}
                                radius="xl"
                                size={4}
                                style={{ flex: 1 }}
                                value={ramPercentage ?? 0}
                            />
                            <Text
                                c={ramTextColor}
                                className={classes.tabular}
                                fw={ramTextColor !== 'dimmed' ? 700 : 500}
                                size="11px"
                            >
                                {ramPercentage !== null ? `${ramPercentage}%` : '—'}
                            </Text>
                        </Flex>
                    </div>
                </Box>
            )}
        </Box>
    )
})
