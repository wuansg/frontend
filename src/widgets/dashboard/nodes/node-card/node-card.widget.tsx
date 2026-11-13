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
    PiUsersDuotone
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

    const { ramPercentage, ramColor, rxSpeed, txSpeed, loadAvg, cpus } = useMemo(() => {
        if (!node.system) {
            return {
                ramPercentage: null,
                ramColor: 'teal',
                rxSpeed: null,
                txSpeed: null,
                loadAvg: null,
                cpus: 1
            }
        }
        const { memoryTotal, cpus } = node.system.info
        const { memoryUsed, loadAvg } = node.system.stats

        const ramPercentage = memoryTotal > 0 ? Math.round((memoryUsed / memoryTotal) * 100) : 0

        let ramColor = 'teal'
        if (ramPercentage > 90) ramColor = 'red'
        else if (ramPercentage > 70) ramColor = 'yellow'

        if (!node.system.stats.interface) {
            return {
                ramPercentage,
                ramColor,
                rxSpeed: null,
                txSpeed: null,
                loadAvg,
                cpus
            }
        }
        return {
            ramPercentage,
            ramColor,
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
            cpus
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

    const getLoadColor = (load: number, cpuCount: number) => {
        const ratio = load / cpuCount
        if (ratio > 1) return 'red'
        if (ratio > 0.7) return 'yellow'
        return 'dimmed'
    }

    const addressLabel = node.port ? `${node.address}:${node.port}` : node.address

    const runtimeModeBadge = useMemo(() => {
        if (!node.isConnected || node.isDisabled) return null
        if (runtimeMode === 'FORWARDING_ONLY') {
            return (
                <Badge color="blue" size="xs" style={{ flexShrink: 0 }} variant="light">
                    {t('node-status-badge.widget.forwarding-only')}
                </Badge>
            )
        }
        if (runtimeMode === 'DEGRADED') {
            return (
                <Badge color="orange" size="xs" style={{ flexShrink: 0 }} variant="light">
                    {t('node-status-badge.widget.degraded')}
                </Badge>
            )
        }
        return null
    }, [node.isConnected, node.isDisabled, runtimeMode, t])

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
                    size={14}
                    src={faviconResolver(node.provider.faviconLink)}
                />
            }
            size="sm"
            style={{
                maxWidth: '18ch',
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

    return (
        <Box
            className={clsx(classes.nodeRow, {
                [classes.nodeRowDragging]: isDragging,
                [classes.nodeRowNoReorder]: disableReordering
            })}
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
                        <Flex align="center" gap="xs" miw={0}>
                            {isConfigMissing ? (
                                <Badge
                                    color="red"
                                    leftSection={<TbAlertCircle size={13} />}
                                    size="md"
                                    style={{ flexShrink: 0 }}
                                    variant="light"
                                >
                                    {t('node-card.widget.dangling')}
                                </Badge>
                            ) : (
                                <>
                                    <NodeStatusBadgeWidget node={node} withText={false} />
                                    <Badge
                                        className={classes.tabular}
                                        color={(node.usersOnline ?? 0) > 0 ? 'teal' : 'gray'}
                                        leftSection={<PiUsersDuotone size={13} />}
                                        miw="6.2ch"
                                        size="md"
                                        style={{ flexShrink: 0 }}
                                        variant="light"
                                    >
                                        {node.usersOnline ?? 0}
                                    </Badge>
                                </>
                            )}

                            <Flex align="center" className={classes.nameContainer} gap={8}>
                                {node.countryCode && node.countryCode !== 'XX' && (
                                    <ReactCountryFlag
                                        countryCode={node.countryCode}
                                        style={{
                                            width: '1.35em',
                                            height: '1em',
                                            borderRadius: '2px',
                                            flexShrink: 0
                                        }}
                                        svg
                                    />
                                )}
                                <Text className={classes.nodeName} fw={600} size="sm">
                                    {node.name}
                                </Text>
                            </Flex>

                            <Flex align="center" gap={6} style={{ flexShrink: 0 }}>
                                {runtimeModeBadge}
                                {node.versionDrift && (
                                    <Badge color="orange" size="xs" variant="light">
                                        {t('node-card.widget.version-drift')}
                                    </Badge>
                                )}
                                {providerBadge}
                            </Flex>
                        </Flex>

                        <Flex align="center" gap={6} justify="space-between" miw={0}>
                            <Flex align="center" gap={6} miw={0} style={{ flex: 1 }}>
                                <PiGlobeSimple className={classes.icon} size={14} />
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

                            <ActionIcon
                                aria-label={t('node-card.widget.usage-stats')}
                                color="cyan"
                                onClick={handleOpenUsageStats}
                                size="sm"
                                style={{ flexShrink: 0 }}
                                title={t('node-card.widget.usage-stats')}
                                variant="subtle"
                            >
                                <TbChartArcs size={15} />
                            </ActionIcon>
                        </Flex>

                        <Box miw={0}>
                            <Flex direction="column" gap={4}>
                                <Flex align="baseline" gap={6} justify="space-between">
                                    <Text className={classes.tabular} fw={600} size="xs" truncate>
                                        {prettyUsedData}
                                    </Text>
                                    <Text c="dimmed" className={classes.tabular} size="xs" truncate>
                                        {maxData}
                                    </Text>
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

                        <Flex align="center" gap="xs" justify="space-between" miw={0}>
                            {node.isTrafficTrackingActive ? (
                                <Flex align="center" gap={4} miw={0}>
                                    <PiArrowsCounterClockwise className={classes.icon} size={13} />
                                    <Text c="dimmed" className={classes.tabular} size="xs" truncate>
                                        {getNodeResetDaysUtil(node.trafficResetDay ?? 1)}
                                    </Text>
                                </Flex>
                            ) : (
                                <Box />
                            )}

                            {isCoreActive && (
                                <Flex align="center" gap={4} miw={0}>
                                    <PiCpuDuotone
                                        color="var(--mantine-color-teal-5)"
                                        size={13}
                                        style={{ flexShrink: 0 }}
                                    />
                                    <Text
                                        c="teal"
                                        className={classes.tabular}
                                        fw={600}
                                        size="xs"
                                        truncate
                                    >
                                        {getCoreUptimeUtil(node.coreUptime)}
                                    </Text>
                                </Flex>
                            )}
                        </Flex>
                    </div>

                    <div className={classes.telemetryRow}>
                        <Flex align="center" gap={6} style={{ flex: '1 1 130px', maxWidth: 190 }}>
                            <PiMemoryDuotone className={classes.icon} size={13} />
                            <Progress
                                color={ramColor}
                                radius="sm"
                                size="xs"
                                style={{ flex: 1 }}
                                value={ramPercentage ?? 0}
                            />
                            <Text c="dimmed" className={classes.tabular} size="xs">
                                {ramPercentage !== null ? `${ramPercentage}%` : '—'}
                            </Text>
                        </Flex>

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
                            <Flex align="center" gap={4}>
                                <PiCpuDuotone className={classes.icon} size={12} />
                                {loadAvg ? (
                                    <Text className={classes.tabular} size="xs">
                                        {loadAvg.map((load, i) => (
                                            <Text
                                                c={getLoadColor(load, cpus)}
                                                className={classes.tabular}
                                                component="span"
                                                key={i}
                                                size="xs"
                                            >
                                                {i > 0 && ' / '}
                                                {load.toFixed(2)}
                                            </Text>
                                        ))}
                                    </Text>
                                ) : (
                                    <Text c="dimmed" className={classes.tabular} size="xs">
                                        {'—'}
                                    </Text>
                                )}
                            </Flex>
                        </Tooltip>

                        <Flex align="center" gap={4}>
                            <PiArrowDownDuotone color="var(--mantine-color-teal-5)" size={12} />
                            <Text c="dimmed" className={classes.tabular} size="xs">
                                {rxSpeed ?? '—'}
                            </Text>
                        </Flex>

                        <Flex align="center" gap={4}>
                            <PiArrowUpDuotone color="var(--mantine-color-cyan-5)" size={12} />
                            <Text c="dimmed" className={classes.tabular} size="xs">
                                {txSpeed ?? '—'}
                            </Text>
                        </Flex>

                        <Flex align="center" gap="sm" ml="auto">
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
                    </div>
                </>
            )}

            {isMobile && (
                <Box>
                    <Flex align="center" gap={6} mb={6} miw={0}>
                        {isConfigMissing ? (
                            <Badge
                                color="red"
                                leftSection={<TbAlertCircle size={12} />}
                                size="sm"
                                style={{ flexShrink: 0 }}
                                variant="light"
                            >
                                {t('node-card.widget.dangling')}
                            </Badge>
                        ) : (
                            <>
                                <NodeStatusBadgeWidget node={node} withText={false} />
                                <Badge
                                    className={classes.tabular}
                                    color={(node.usersOnline ?? 0) > 0 ? 'teal' : 'gray'}
                                    leftSection={<PiUsersDuotone size={12} />}
                                    miw="5.5ch"
                                    size="sm"
                                    style={{ flexShrink: 0 }}
                                    variant="light"
                                >
                                    {node.usersOnline ?? 0}
                                </Badge>
                            </>
                        )}

                        <Flex align="center" gap={6} style={{ flex: 1, minWidth: 0 }}>
                            {node.countryCode && node.countryCode !== 'XX' && (
                                <ReactCountryFlag
                                    countryCode={node.countryCode}
                                    style={{
                                        width: '1.3em',
                                        height: '0.98em',
                                        borderRadius: '2px',
                                        flexShrink: 0
                                    }}
                                    svg
                                />
                            )}
                            <Text className={classes.nodeName} fw={600} size="sm">
                                {node.name}
                            </Text>
                        </Flex>

                        <ActionIcon
                            aria-label={t('node-card.widget.usage-stats')}
                            color="cyan"
                            onClick={handleOpenUsageStats}
                            size="sm"
                            style={{ flexShrink: 0 }}
                            variant="subtle"
                        >
                            <TbChartArcs size={14} />
                        </ActionIcon>
                    </Flex>

                    <Flex align="center" gap={6} mb={6} miw={0} wrap="wrap">
                        <Flex align="center" gap={4} miw={0} style={{ flex: '1 1 120px' }}>
                            <PiGlobeSimple className={classes.icon} size={12} />
                            <Text
                                c="dimmed"
                                className={classes.addressText}
                                onClick={handleCopy}
                                size="xs"
                            >
                                {addressLabel}
                            </Text>
                        </Flex>

                        {runtimeModeBadge}
                        {node.versionDrift && (
                            <Badge color="orange" size="xs" variant="light">
                                {t('node-card.widget.version-drift')}
                            </Badge>
                        )}
                        {providerBadge}
                    </Flex>

                    <Flex align="baseline" gap={6} justify="space-between" mb={4}>
                        <Text className={classes.tabular} fw={600} size="xs" truncate>
                            {prettyUsedData}
                        </Text>
                        <Text c="dimmed" className={classes.tabular} size="xs">
                            {maxData}
                        </Text>
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

                    <div className={classes.mobileTelemetryRow}>
                        {node.isTrafficTrackingActive && (
                            <Flex align="center" gap={4}>
                                <PiArrowsCounterClockwise className={classes.icon} size={11} />
                                <Text c="dimmed" className={classes.tabular} size="xs">
                                    {getNodeResetDaysUtil(node.trafficResetDay ?? 1)}
                                </Text>
                            </Flex>
                        )}

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
                                size="xs"
                            >
                                {isCoreActive ? getCoreUptimeUtil(node.coreUptime) : '—'}
                            </Text>
                        </Flex>

                        <Flex align="center" gap={5} style={{ flex: '1 1 90px', maxWidth: 140 }}>
                            <PiMemoryDuotone className={classes.icon} size={11} />
                            <Progress
                                color={ramColor}
                                radius="sm"
                                size="xs"
                                style={{ flex: 1 }}
                                value={ramPercentage ?? 0}
                            />
                            <Text c="dimmed" className={classes.tabular} size="xs">
                                {ramPercentage !== null ? `${ramPercentage}%` : '—'}
                            </Text>
                        </Flex>

                        <Flex align="center" gap={8} ml="auto">
                            <Flex align="center" gap={3}>
                                <PiArrowDownDuotone color="var(--mantine-color-teal-5)" size={10} />
                                <Text c="dimmed" className={classes.tabular} size="xs">
                                    {rxSpeed ?? '—'}
                                </Text>
                            </Flex>
                            <Flex align="center" gap={3}>
                                <PiArrowUpDuotone color="var(--mantine-color-cyan-5)" size={10} />
                                <Text c="dimmed" className={classes.tabular} size="xs">
                                    {txSpeed ?? '—'}
                                </Text>
                            </Flex>
                        </Flex>
                    </div>
                </Box>
            )}
        </Box>
    )
})
