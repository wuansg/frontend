import { GetActiveSessionsOnNodeFeature } from '@features/ui/dashboard/nodes/get-active-sesions-on-node'
import { GetNodeBenchmarkFeature } from '@features/ui/dashboard/nodes/get-node-benchmark/get-node-benchmark.feature'
import { GetNodeGeocheckFeature } from '@features/ui/dashboard/nodes/get-node-geocheck'
import { GetNodeInboundsHostsFeature } from '@features/ui/dashboard/nodes/get-node-inbounds-hosts'
import { GetNodeLinkedHostsFeature } from '@features/ui/dashboard/nodes/get-node-linked-hosts'
import { GetNodeUsersUsageFeature } from '@features/ui/dashboard/nodes/get-node-users-usage'
import {
    ActionIcon,
    Badge,
    Box,
    Divider,
    Group,
    Loader,
    SimpleGrid,
    Stack,
    Text,
    ThemeIconProps,
    Tooltip
} from '@mantine/core'
import { modals } from '@mantine/modals'
import { GetNodeCommand, UpdateNodeCommand } from '@remnawave/backend-contract'
import { githubDarkTheme, JsonEditor } from 'json-edit-react'
import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
    PiArrowsCounterClockwise,
    PiCloudArrowUpDuotone,
    PiCpuDuotone,
    PiUsersDuotone,
    PiWarningCircle
} from 'react-icons/pi'
import { TbJson, TbPower, TbWifi, TbWifiOff } from 'react-icons/tb'

import { queryClient } from '@shared/api'
import { QueryKeys, useDisableNode, useEnableNode, useGetNodeMetadata } from '@shared/api/hooks'
import { Logo } from '@shared/ui'
import surface from '@shared/ui/node-panel-surface.module.css'
import { NodeTrafficProgress } from '@shared/ui/node-traffic-progress'
import { BaseOverlayHeader } from '@shared/ui/overlays/base-overlay-header'
import { SectionCard } from '@shared/ui/section-card'
import { prettifyBytesUtil } from '@shared/utils/bytes'
import { getNodeCoreDisplay } from '@shared/utils/node-core-version'
import { WithNodeRuntimeStatus } from '@shared/utils/node-runtime-status'
import { getCoreUptimeUtil, getNodeResetDaysUtil } from '@shared/utils/time-utils'

interface IProps {
    node: GetNodeCommand.Response['response']
}

export const NodeDetailsCardWidget = memo((props: IProps) => {
    const { node } = props
    const runtimeStatus = (node as WithNodeRuntimeStatus<typeof node>).runtimeStatus
    const usageSnapshot = (
        node as typeof node & {
            usageSnapshot?: {
                receivedThrough: number
                appliedThrough: number
                pending: number
                queueBytes: number
                capturing: boolean
                ingestSuccesses: number
                ingestFailures: number
                databaseRetries: number
                lastCapturedAt: Date | null
                lastSuccessAt: Date | null
                lastDurationMs: number | null
                lastError: string | null
            } | null
        }
    ).usageSnapshot

    const { t } = useTranslation()

    const mutationParams = {
        route: {
            uuid: node.uuid
        },
        mutationFns: {
            onSuccess: async (updatedNode: UpdateNodeCommand.Response['response']) => {
                await queryClient.setQueryData(
                    QueryKeys.nodes.getNode({ uuid: updatedNode.uuid }).queryKey,
                    updatedNode
                )
            }
        }
    }

    const { data: metadata, isLoading: isMetadataLoading } = useGetNodeMetadata({
        route: { uuid: node.uuid }
    })
    const { mutate: disableNode, isPending: isDisableNodePending } = useDisableNode(mutationParams)
    const { mutate: enableNode, isPending: isEnableNodePending } = useEnableNode(mutationParams)

    const activeProfileUuid = node.configProfile.activeConfigProfileUuid
    const isConfigMissing = activeProfileUuid === null
    const hasCore = node.configProfile.activeInbounds.length > 0
    const configApplyStatus = node.configApply?.status
    const runtimeMode = runtimeStatus?.mode

    const configApplyPresentation = useMemo(() => {
        switch (configApplyStatus) {
            case 'APPLIED':
                return {
                    color: 'teal',
                    key: 'node-details-card.widget.config-status-applied'
                } as const
            case 'UNCHANGED':
                return {
                    color: 'teal',
                    key: 'node-details-card.widget.config-status-unchanged'
                } as const
            case 'PENDING':
                return {
                    color: 'blue',
                    key: 'node-details-card.widget.config-status-pending'
                } as const
            case 'ROLLED_BACK':
                return {
                    color: 'yellow',
                    key: 'node-details-card.widget.config-status-rolled_back'
                } as const
            default:
                return {
                    color: 'red',
                    key: 'node-details-card.widget.config-status-failed'
                } as const
        }
    }, [configApplyStatus])

    const runtimePresentation = useMemo(() => {
        switch (runtimeMode) {
            case 'FORWARDING_ONLY':
                return {
                    color: 'blue',
                    translationKey: 'node-status-badge.widget.forwarding-only'
                } as const
            case 'IDLE':
                return {
                    color: 'gray',
                    translationKey: 'node-status-badge.widget.idle'
                } as const
            case 'DEGRADED':
                return {
                    color: 'orange',
                    translationKey: 'node-status-badge.widget.degraded'
                } as const
            default:
                return {
                    color: 'teal',
                    translationKey: 'node-status-badge.widget.core-active'
                } as const
        }
    }, [runtimeMode])

    const { IconComponent, themeIconColor } = useMemo(() => {
        let IconComp: React.ComponentType<{ size: number }>
        let iconColor: ThemeIconProps['color'] = 'red'

        if (isConfigMissing) {
            IconComp = PiWarningCircle
            iconColor = 'red'
            return { IconComponent: IconComp, themeIconColor: iconColor }
        }

        if (node.isDisabled) {
            IconComp = TbWifiOff
            iconColor = 'gray'
            return { IconComponent: IconComp, themeIconColor: iconColor }
        }

        if (node.isConnected && runtimeMode === 'DEGRADED') {
            IconComp = PiWarningCircle
            iconColor = 'orange'
        } else if (node.isConnected && runtimeMode === 'FORWARDING_ONLY') {
            IconComp = PiCloudArrowUpDuotone
            iconColor = 'blue'
        } else if (node.isConnected && runtimeMode === 'IDLE') {
            IconComp = TbWifi
            iconColor = 'gray'
        } else if (node.isConnected) {
            IconComp = TbWifi
            iconColor = 'teal'
        } else if (node.isConnecting) {
            IconComp = PiCloudArrowUpDuotone
            iconColor = 'yellow'
        } else {
            IconComp = PiWarningCircle
            iconColor = 'red'
        }

        return { IconComponent: IconComp, themeIconColor: iconColor }
    }, [node.isConnected, node.isConnecting, node.isDisabled, isConfigMissing, runtimeMode])

    const trafficData = useMemo(() => {
        let maxData = '∞'
        let percentage = 0

        const prettyUsedData = prettifyBytesUtil(node.trafficUsedBytes || 0) || '0 B'

        if (node.isTrafficTrackingActive) {
            maxData = prettifyBytesUtil(node.trafficLimitBytes || 0) || '∞'
            if (node.trafficLimitBytes === 0) {
                percentage = 100
            } else {
                percentage = Math.floor(
                    ((node.trafficUsedBytes ?? 0) * 100) / (node.trafficLimitBytes ?? 0)
                )
            }
        }

        return {
            maxData,
            percentage,
            prettyUsedData,
            isUnlimited: !node.isTrafficTrackingActive || node.trafficLimitBytes === 0
        }
    }, [node.trafficUsedBytes, node.trafficLimitBytes, node.isTrafficTrackingActive])

    const getProgressColor = useCallback(() => {
        if (trafficData.isUnlimited) return 'teal'
        if (trafficData.percentage > 95) return 'red'
        if (trafficData.percentage > 80) return 'yellow.4'
        return 'teal'
    }, [trafficData.percentage, trafficData.isUnlimited])

    const handleToggleNodeStatus = () => {
        if (node.isDisabled) {
            enableNode({})
        } else {
            disableNode({})
        }
    }

    const showCoreUptime =
        node.isConnected &&
        hasCore &&
        node.coreUptime > 0 &&
        (!runtimeStatus || runtimeMode === 'CORE_ACTIVE')

    const endpointLabel = node.port ? `${node.address}:${node.port}` : node.address
    const onlineUsers = node.usersOnline ?? 0
    const coreLabel =
        hasCore && node.versions
            ? getNodeCoreDisplay(node.versions)
            : t('node-details-card.widget.core-not-required')

    return (
        <SectionCard.Root gap="sm">
            <SectionCard.Section>
                <Group align="center" justify="space-between" wrap="nowrap">
                    <BaseOverlayHeader
                        iconColor={themeIconColor}
                        IconComponent={IconComponent}
                        iconSize={20}
                        iconVariant="soft"
                        subtitle={endpointLabel}
                        title={t('node-details-card.widget.node-details')}
                        titleOrder={5}
                        truncateTitle
                        withCopy
                    />

                    <Group gap={6} wrap="nowrap">
                        {node.isDisabled ? (
                            <Badge color="gray" size="sm" variant="light">
                                {t('node-status-badge.widget.disabled')}
                            </Badge>
                        ) : !node.isConnected ? (
                            <Badge
                                color={node.isConnecting ? 'yellow' : 'red'}
                                size="sm"
                                variant="light"
                            >
                                {t(
                                    node.isConnecting
                                        ? 'node-status-badge.widget.connecting'
                                        : 'node-status-badge.widget.disconnected'
                                )}
                            </Badge>
                        ) : runtimeStatus ? (
                            <Tooltip
                                label={
                                    <Box>
                                        <Text fw={600} size="xs">
                                            {t(runtimePresentation.translationKey)}
                                        </Text>
                                        <Text size="xs">
                                            core: {runtimeStatus.runningCore ?? 'not required'}
                                        </Text>
                                        <Text size="xs">
                                            forwarding:{' '}
                                            {runtimeStatus.forwarding?.state ?? 'unsupported'}
                                        </Text>
                                        {runtimeStatus.forwarding && (
                                            <>
                                                <Text size="xs">
                                                    rules: {runtimeStatus.forwarding.enabledRules} /{' '}
                                                    {runtimeStatus.forwarding.configuredRules}
                                                </Text>
                                                <Text ff="monospace" size="xs">
                                                    config:{' '}
                                                    {runtimeStatus.forwarding.configHash ?? '—'}
                                                </Text>
                                                <Text size="xs">
                                                    synced:{' '}
                                                    {runtimeStatus.forwarding.lastSyncedAt
                                                        ? new Date(
                                                              runtimeStatus.forwarding.lastSyncedAt
                                                          ).toLocaleString()
                                                        : '—'}
                                                </Text>
                                                {Object.keys(runtimeStatus.forwarding.dnsResults)
                                                    .length > 0 && (
                                                    <Text ff="monospace" size="xs">
                                                        dns:{' '}
                                                        {Object.entries(
                                                            runtimeStatus.forwarding.dnsResults
                                                        )
                                                            .map(
                                                                ([rule, address]) =>
                                                                    `${rule}=${address}`
                                                            )
                                                            .join(', ')}
                                                    </Text>
                                                )}
                                                {runtimeStatus.forwarding.lastError && (
                                                    <Text c="red" size="xs">
                                                        {runtimeStatus.forwarding.lastError}
                                                    </Text>
                                                )}
                                            </>
                                        )}
                                    </Box>
                                }
                                maw={560}
                                multiline
                            >
                                <Badge
                                    color={runtimePresentation.color}
                                    leftSection={<PiCpuDuotone size={13} />}
                                    size="sm"
                                    variant="light"
                                >
                                    {t(runtimePresentation.translationKey)}
                                </Badge>
                            </Tooltip>
                        ) : (
                            <Badge
                                color="teal"
                                leftSection={<PiCpuDuotone size={13} />}
                                size="sm"
                                variant="light"
                            >
                                {t('node-status-badge.widget.connected')}
                            </Badge>
                        )}

                        {!isConfigMissing ? (
                            <Tooltip
                                label={
                                    node.isDisabled
                                        ? t('node-details-card.widget.enable-node')
                                        : t('node-details-card.widget.disable-node')
                                }
                            >
                                <ActionIcon
                                    color={node.isDisabled ? 'teal' : 'red'}
                                    disabled={isDisableNodePending || isEnableNodePending}
                                    radius="md"
                                    size="md"
                                    variant="light"
                                    onClick={handleToggleNodeStatus}
                                >
                                    {isDisableNodePending || isEnableNodePending ? (
                                        <Loader
                                            color={node.isDisabled ? 'teal' : 'red'}
                                            size="xs"
                                        />
                                    ) : (
                                        <TbPower size={16} />
                                    )}
                                </ActionIcon>
                            </Tooltip>
                        ) : (
                            <Tooltip
                                label={t(
                                    'node-details-card.widget.config-profile-or-inbounds-is-missing'
                                )}
                            >
                                <ActionIcon
                                    color="gray"
                                    disabled
                                    radius="md"
                                    size="md"
                                    variant="light"
                                >
                                    <TbPower size={16} />
                                </ActionIcon>
                            </Tooltip>
                        )}
                    </Group>
                </Group>
            </SectionCard.Section>

            <SectionCard.Section>
                <Stack gap="sm">
                    <Box className={surface.subPanel} p="xs">
                        <Stack gap={8}>
                            <Group gap={6} justify="space-between" wrap="wrap">
                                <Text
                                    c="dimmed"
                                    fw={600}
                                    lh={1.2}
                                    lts={0.5}
                                    size="10px"
                                    tt="uppercase"
                                >
                                    {t('node-details-card.widget.quick-tools')}
                                </Text>

                                <Group gap={6} wrap="wrap">
                                    {node.configApply && (
                                        <Tooltip
                                            label={
                                                <Box>
                                                    <Text fw={600} size="xs">
                                                        Sing-box config{' '}
                                                        {node.configApply.status.toLowerCase()}
                                                    </Text>
                                                    <Text ff="monospace" size="xs">
                                                        active: {node.configApply.activeHash ?? '—'}
                                                    </Text>
                                                    <Text ff="monospace" size="xs">
                                                        requested: {node.configApply.requestedHash}
                                                    </Text>
                                                    <Text size="xs">
                                                        time:{' '}
                                                        {new Date(
                                                            node.configApply.appliedAt ??
                                                                node.configApply.attemptedAt
                                                        ).toLocaleString()}
                                                    </Text>
                                                    <Text size="xs">
                                                        rollback:{' '}
                                                        {node.configApply.rollback.toLowerCase()}
                                                    </Text>
                                                </Box>
                                            }
                                            maw={520}
                                            multiline
                                        >
                                            <Badge
                                                color={configApplyPresentation.color}
                                                leftSection={<TbJson size={11} />}
                                                size="xs"
                                                variant="light"
                                            >
                                                {t(configApplyPresentation.key)}
                                            </Badge>
                                        </Tooltip>
                                    )}

                                    {usageSnapshot && (
                                        <Tooltip
                                            label={
                                                usageSnapshot.lastError ??
                                                `received ${usageSnapshot.receivedThrough}, applied ${usageSnapshot.appliedThrough}, node queue ${prettifyBytesUtil(usageSnapshot.queueBytes)}, retries ${usageSnapshot.databaseRetries}, failures ${usageSnapshot.ingestFailures}`
                                            }
                                        >
                                            <Badge
                                                color={
                                                    usageSnapshot.lastError
                                                        ? 'red'
                                                        : !usageSnapshot.capturing
                                                          ? 'gray'
                                                          : usageSnapshot.pending > 0 ||
                                                              usageSnapshot.receivedThrough >
                                                                  usageSnapshot.appliedThrough
                                                            ? 'yellow'
                                                            : 'teal'
                                                }
                                                leftSection={<PiArrowsCounterClockwise size={11} />}
                                                size="xs"
                                                variant="light"
                                            >
                                                {usageSnapshot.capturing
                                                    ? t('node-details-card.widget.stats-active', {
                                                          pending: usageSnapshot.pending,
                                                          lag: Math.max(
                                                              0,
                                                              usageSnapshot.receivedThrough -
                                                                  usageSnapshot.appliedThrough
                                                          )
                                                      })
                                                    : t('node-details-card.widget.stats-paused')}
                                            </Badge>
                                        </Tooltip>
                                    )}

                                    {showCoreUptime && (
                                        <Tooltip
                                            label={t(
                                                'node-stats.card.represents-the-uptime-of-the-core'
                                            )}
                                        >
                                            <Badge
                                                className={surface.tabular}
                                                color="teal"
                                                leftSection={<PiCpuDuotone size={11} />}
                                                size="xs"
                                                variant="light"
                                            >
                                                {getCoreUptimeUtil(node.coreUptime)}
                                            </Badge>
                                        </Tooltip>
                                    )}
                                </Group>
                            </Group>

                            <Group gap="xs" justify="space-between" wrap="wrap">
                                <Group gap={6} wrap="wrap">
                                    <Tooltip label={t('node-details-card.widget.metadata')}>
                                        <ActionIcon
                                            color="teal"
                                            disabled={!metadata}
                                            loading={isMetadataLoading}
                                            size="lg"
                                            variant="soft"
                                            onClick={() => {
                                                if (!metadata) return
                                                modals.open({
                                                    centered: true,
                                                    size: 'auto',
                                                    title: (
                                                        <BaseOverlayHeader
                                                            iconColor="teal"
                                                            IconComponent={TbJson}
                                                            iconVariant="soft"
                                                            title={t(
                                                                'node-details-card.widget.metadata'
                                                            )}
                                                        />
                                                    ),
                                                    children: (
                                                        <Box>
                                                            <JsonEditor
                                                                collapse={3}
                                                                data={metadata.metadata as object}
                                                                indent={4}
                                                                maxWidth="100%"
                                                                rootName=""
                                                                theme={githubDarkTheme}
                                                                viewOnly
                                                            />
                                                        </Box>
                                                    )
                                                })
                                            }}
                                        >
                                            <TbJson size={20} />
                                        </ActionIcon>
                                    </Tooltip>

                                    <Divider opacity={0.25} orientation="vertical" />

                                    <GetNodeLinkedHostsFeature nodeUuid={node.uuid} />
                                    <GetNodeInboundsHostsFeature nodeUuid={node.uuid} />
                                </Group>

                                <Group gap={6} wrap="wrap">
                                    <GetNodeGeocheckFeature node={node} />
                                    <GetNodeBenchmarkFeature kind="HARDWARE" node={node} />
                                    <GetNodeBenchmarkFeature kind="NETWORK" node={node} />
                                    <GetNodeUsersUsageFeature nodeUuid={node.uuid} />
                                    <GetActiveSessionsOnNodeFeature nodeUuid={node.uuid} />
                                </Group>
                            </Group>
                        </Stack>
                    </Box>

                    <Box className={surface.subPanel} p="xs">
                        <Group gap="xs" justify="space-between" mb={6}>
                            <Text className={surface.tabular} fw={700} size="sm">
                                {trafficData.prettyUsedData}
                            </Text>
                            <Text c="dimmed" className={surface.tabular} size="xs">
                                {trafficData.maxData}
                            </Text>
                        </Group>

                        <NodeTrafficProgress
                            color={getProgressColor()}
                            node={node}
                            size="sm"
                            value={trafficData.isUnlimited ? 100 : trafficData.percentage}
                        />

                        {node.isTrafficTrackingActive && node.trafficResetDay && (
                            <Group gap={4} justify="flex-end" mt={6}>
                                <PiArrowsCounterClockwise
                                    color="var(--mantine-color-dimmed)"
                                    size={12}
                                />
                                <Text c="dimmed" className={surface.tabular} size="xs">
                                    {t('node-stats.card.traffic-refill-in-days')}{' '}
                                    {getNodeResetDaysUtil(node.trafficResetDay)}
                                </Text>
                            </Group>
                        )}
                    </Box>

                    {node.isConnected && (
                        <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="xs">
                            <Box className={surface.metricBlock}>
                                <Group gap={4} justify="space-between" mb={2} wrap="nowrap">
                                    <Text c="dimmed" fw={600} size="10px" tt="uppercase">
                                        {t('node-details-card.widget.online-users')}
                                    </Text>
                                    <PiUsersDuotone
                                        color={
                                            onlineUsers > 0
                                                ? 'var(--mantine-color-teal-4)'
                                                : 'var(--mantine-color-gray-6)'
                                        }
                                        size={13}
                                    />
                                </Group>
                                <Text
                                    c={onlineUsers > 0 ? 'teal.4' : 'dimmed'}
                                    className={surface.tabular}
                                    fw={700}
                                    size="sm"
                                >
                                    {onlineUsers}
                                </Text>
                            </Box>

                            <Tooltip label={t('node-details-card.widget.core-version')}>
                                <Box className={surface.metricBlock} style={{ minWidth: 0 }}>
                                    <Group gap={4} justify="space-between" mb={2} wrap="nowrap">
                                        <Text c="dimmed" fw={600} size="10px" tt="uppercase">
                                            {t('node-details-card.widget.core-engine')}
                                        </Text>
                                        <PiCpuDuotone
                                            color={
                                                hasCore
                                                    ? 'var(--mantine-color-violet-4)'
                                                    : 'var(--mantine-color-gray-6)'
                                            }
                                            size={13}
                                        />
                                    </Group>
                                    <Text
                                        c={hasCore ? 'violet.3' : 'dimmed'}
                                        className={surface.tabular}
                                        fw={600}
                                        size="xs"
                                        truncate
                                    >
                                        {coreLabel}
                                    </Text>
                                </Box>
                            </Tooltip>

                            <Tooltip label={t('node-details-card.widget.remnawave-node-version')}>
                                <Box className={surface.metricBlock} style={{ minWidth: 0 }}>
                                    <Group gap={4} justify="space-between" mb={2} wrap="nowrap">
                                        <Text c="dimmed" fw={600} size="10px" tt="uppercase">
                                            {t('node-details-card.widget.node-agent')}
                                        </Text>
                                        <Logo color="var(--mantine-color-indigo-4)" size={12} />
                                    </Group>
                                    <Text
                                        c="indigo.3"
                                        className={surface.tabular}
                                        fw={600}
                                        size="xs"
                                        truncate
                                    >
                                        {node.versions?.node ?? '—'}
                                    </Text>
                                </Box>
                            </Tooltip>
                        </SimpleGrid>
                    )}
                </Stack>
            </SectionCard.Section>
        </SectionCard.Root>
    )
})
