import type { ForwardingConflict, InboundPortLike } from './node-forwarding.utils'
import type { GetNodeCommand } from '@remnawave/backend-contract'
import type { ForwardRefComponent, HTMLMotionProps, Variants } from 'motion/react'

import {
    ActionIcon,
    Alert,
    Autocomplete,
    Badge,
    Box,
    Button,
    Collapse,
    CopyButton,
    Divider,
    Group,
    Menu,
    Modal,
    NumberInput,
    Paper,
    ScrollArea,
    SegmentedControl,
    SimpleGrid,
    Skeleton,
    Stack,
    Switch,
    Text,
    TextInput,
    ThemeIcon,
    Tooltip
} from '@mantine/core'
import { DatesRangeValue } from '@mantine/dates'
import { schemaResolver, useForm, type UseFormReturnType } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import clsx from 'clsx'
import dayjs from 'dayjs'
import { useEffect, useMemo, useRef, useState } from 'react'
import ReactCountryFlag from 'react-country-flag'
import { useTranslation } from 'react-i18next'
import {
    TbAlertTriangle,
    TbArrowDown,
    TbArrowRight,
    TbArrowsExchange,
    TbArrowsMaximize,
    TbArrowUp,
    TbCalendar,
    TbCheck,
    TbChevronDown,
    TbChevronsDown,
    TbChevronsUp,
    TbChevronUp,
    TbCopy,
    TbCopyPlus,
    TbNetwork,
    TbPlus,
    TbRefresh,
    TbRotate,
    TbSearch,
    TbServer2,
    TbTrash,
    TbX
} from 'react-icons/tb'

import { queryClient } from '@shared/api'
import {
    type NodeForwardingConfig,
    NodeForwardingConfigSchema,
    type NodeForwardingStatus,
    type NodeForwardingUsage,
    nodesQueryKeys,
    useGetNodeForwarding,
    useGetNodeForwardingUsage,
    useGetNodes,
    useSyncNodeForwarding,
    useUpdateNodeForwarding
} from '@shared/api/hooks'
import { DatePickerInput } from '@shared/ui/date-time-picker'
import { BaseOverlayHeader } from '@shared/ui/overlays/base-overlay-header'
import { SectionCard } from '@shared/ui/section-card'
import { prettifyBytesUtil } from '@shared/utils/bytes'
import { getDefaultDateRange } from '@shared/utils/time-utils'

import classes from './node-forwarding.module.css'
import {
    detectForwardingConflicts,
    formatForwardEndpoint,
    isLikelyHostname,
    matchesForwardingRuleFilter,
    normalizeForwardingConfig,
    pickNextListenPort,
    summarizeRuleRuntimeTraffic,
    summarizeTotalRuntimeTraffic
} from './node-forwarding.utils'

interface IProps {
    cardVariants: Variants
    motionWrapper: ForwardRefComponent<HTMLDivElement, HTMLMotionProps<'div'>>
    node?: GetNodeCommand.Response['response']
    nodeUuid: string
}

interface PanelNodeOption {
    uuid: string
    name: string
    address: string
    countryCode: string
    inbounds: InboundPortLike[]
}

const DEFAULT_CONFIG: NodeForwardingConfig = {
    enabled: false,
    listenInterface: 'auto',
    rules: []
}

const STATUS_COLORS: Record<string, string> = {
    applied: 'teal',
    disabled: 'gray',
    pending: 'yellow',
    degraded: 'orange',
    error: 'red',
    unsupported: 'gray',
    unreachable: 'red'
}

const PROTOCOL_COLORS: Record<NodeForwardingConfig['rules'][number]['protocol'], string> = {
    TCP_UDP: 'cyan',
    TCP: 'blue',
    UDP: 'grape'
}

const PROTOCOL_LABELS: Record<NodeForwardingConfig['rules'][number]['protocol'], string> = {
    TCP_UDP: 'TCP+UDP',
    TCP: 'TCP',
    UDP: 'UDP'
}

interface RuleItemProps {
    conflicts: ForwardingConflict[]
    expanded: boolean
    form: UseFormReturnType<NodeForwardingConfig>
    globalEnabled: boolean
    hasFieldError: boolean
    index: number
    nodeAddress?: string
    onDuplicate: (index: number) => void
    onMove: (from: number, to: number) => void
    onRemove: (index: number, ruleId: string) => void
    onSelectTargetNode: (index: number, target: PanelNodeOption) => void
    onToggleExpand: (ruleId: string) => void
    panelNodes: PanelNodeOption[]
    persistedRule?: NodeForwardingUsage['rules'][number]
    rule: NodeForwardingConfig['rules'][number]
    runtimeRule?: NodeForwardingStatus['rules'][number]
    statusState?: NodeForwardingStatus['state']
    totalRules: number
    wide: boolean
}

function ForwardingRuleItem({
    conflicts,
    expanded,
    form,
    globalEnabled,
    hasFieldError,
    index,
    nodeAddress,
    onDuplicate,
    onMove,
    onRemove,
    onSelectTargetNode,
    onToggleExpand,
    panelNodes,
    persistedRule,
    rule,
    runtimeRule,
    statusState,
    totalRules,
    wide
}: RuleItemProps) {
    const { t } = useTranslation()
    const runtimeTraffic = summarizeRuleRuntimeTraffic(runtimeRule)
    const persistedUpload = persistedRule?.uploadBytes ?? 0
    const persistedDownload = persistedRule?.downloadBytes ?? 0
    const persistedTotal = persistedRule?.totalBytes ?? persistedUpload + persistedDownload

    const normalizedTarget = rule.targetAddress.trim().toLowerCase()
    const matchedTargetNode = useMemo(
        () =>
            normalizedTarget
                ? panelNodes.find((item) => item.address.trim().toLowerCase() === normalizedTarget)
                : undefined,
        [normalizedTarget, panelNodes]
    )

    const targetInboundPorts = useMemo(() => {
        if (!matchedTargetNode) return []
        const seen = new Set<number>()
        return matchedTargetNode.inbounds.filter(
            (inbound): inbound is InboundPortLike & { port: number } => {
                if (
                    typeof inbound.port !== 'number' ||
                    inbound.port < 1 ||
                    seen.has(inbound.port)
                ) {
                    return false
                }
                seen.add(inbound.port)
                return true
            }
        )
    }, [matchedTargetNode])

    const resolvedIp = runtimeRule?.resolvedTargetAddress
    const showResolvedIp = Boolean(resolvedIp && resolvedIp !== rule.targetAddress.trim())
    const dnsUnresolved =
        globalEnabled &&
        rule.enabled &&
        statusState === 'degraded' &&
        isLikelyHostname(rule.targetAddress) &&
        !resolvedIp

    const hasWarning = conflicts.length > 0 || hasFieldError || dnsUnresolved
    const isActive = globalEnabled && rule.enabled
    const entryEndpoint = nodeAddress
        ? formatForwardEndpoint(nodeAddress, rule.listenPort)
        : undefined
    const targetDisplay = rule.targetAddress.trim()
        ? formatForwardEndpoint(rule.targetAddress, rule.targetPort)
        : `—:${rule.targetPort}`

    const formatConflictMessage = (conflict: ForwardingConflict) => {
        if (conflict.kind === 'rule') {
            return t('node-forwarding-card.conflict-rule', {
                protocol: PROTOCOL_LABELS[conflict.protocol],
                port: conflict.port,
                name: conflict.otherRuleName
            })
        }
        if (conflict.kind === 'inbound') {
            return t('node-forwarding-card.conflict-inbound', {
                protocol: PROTOCOL_LABELS[conflict.protocol],
                port: conflict.port,
                tag: conflict.inboundTag
            })
        }
        return t('node-forwarding-card.conflict-self', { address: conflict.address })
    }

    return (
        <Paper
            className={clsx(classes.ruleCard, {
                [classes.ruleCardConflict]: hasWarning,
                [classes.ruleCardActive]: !hasWarning && isActive,
                [classes.ruleCardInactive]: !hasWarning && !isActive
            })}
            p="sm"
            radius="md"
        >
            <Stack gap="xs">
                <Box
                    className={classes.ruleHeader}
                    onClick={() => onToggleExpand(rule.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            onToggleExpand(rule.id)
                        }
                    }}
                >
                    <Stack gap={6}>
                        <Group gap="xs" justify="space-between" wrap="nowrap">
                            <Group gap="xs" style={{ minWidth: 0, flex: 1 }} wrap="nowrap">
                                <Box onClick={(event) => event.stopPropagation()}>
                                    <Switch
                                        checked={rule.enabled}
                                        color="teal"
                                        size="sm"
                                        onChange={(event) =>
                                            form.setFieldValue(
                                                `rules.${index}.enabled`,
                                                event.currentTarget.checked
                                            )
                                        }
                                    />
                                </Box>
                                <Text
                                    c={rule.enabled ? 'white' : 'dimmed'}
                                    fw={600}
                                    size="sm"
                                    truncate
                                >
                                    {rule.name.trim() ||
                                        `${t('node-forwarding-card.rule')} #${index + 1}`}
                                </Text>
                                <Badge
                                    color={PROTOCOL_COLORS[rule.protocol]}
                                    size="xs"
                                    style={{ flexShrink: 0 }}
                                    variant="light"
                                >
                                    {PROTOCOL_LABELS[rule.protocol]}
                                </Badge>
                                {conflicts.length > 0 && (
                                    <Badge
                                        color="orange"
                                        size="xs"
                                        style={{ flexShrink: 0 }}
                                        variant="light"
                                    >
                                        {t('node-forwarding-card.port-conflict-badge')}
                                    </Badge>
                                )}
                                {dnsUnresolved && (
                                    <Badge
                                        color="orange"
                                        size="xs"
                                        style={{ flexShrink: 0 }}
                                        variant="outline"
                                    >
                                        {t('node-forwarding-card.dns-unresolved')}
                                    </Badge>
                                )}
                            </Group>

                            <Group
                                gap={2}
                                onClick={(event) => event.stopPropagation()}
                                style={{ flexShrink: 0 }}
                                wrap="nowrap"
                            >
                                {entryEndpoint && (
                                    <CopyButton timeout={1200} value={entryEndpoint}>
                                        {({ copied, copy }) => (
                                            <Tooltip
                                                label={
                                                    copied
                                                        ? t('node-forwarding-card.endpoint-copied')
                                                        : `${t('node-forwarding-card.copy-endpoint')} (${entryEndpoint})`
                                                }
                                            >
                                                <ActionIcon
                                                    color={copied ? 'teal' : 'gray'}
                                                    size="sm"
                                                    variant="subtle"
                                                    onClick={() => {
                                                        copy()
                                                        notifications.show({
                                                            color: 'teal',
                                                            title: t(
                                                                'node-forwarding-card.endpoint-copied'
                                                            ),
                                                            message: entryEndpoint
                                                        })
                                                    }}
                                                >
                                                    {copied ? (
                                                        <TbCheck size={15} />
                                                    ) : (
                                                        <TbCopy size={15} />
                                                    )}
                                                </ActionIcon>
                                            </Tooltip>
                                        )}
                                    </CopyButton>
                                )}

                                <Tooltip label={t('node-forwarding-card.duplicate-rule')}>
                                    <ActionIcon
                                        color="gray"
                                        size="sm"
                                        variant="subtle"
                                        onClick={() => onDuplicate(index)}
                                    >
                                        <TbCopyPlus size={15} />
                                    </ActionIcon>
                                </Tooltip>

                                <Tooltip label={t('node-forwarding-card.delete-rule')}>
                                    <ActionIcon
                                        color="red"
                                        size="sm"
                                        variant="subtle"
                                        onClick={() => onRemove(index, rule.id)}
                                    >
                                        <TbTrash size={15} />
                                    </ActionIcon>
                                </Tooltip>

                                <ActionIcon
                                    color="gray"
                                    size="sm"
                                    variant="subtle"
                                    onClick={() => onToggleExpand(rule.id)}
                                >
                                    {expanded ? (
                                        <TbChevronUp size={16} />
                                    ) : (
                                        <TbChevronDown size={16} />
                                    )}
                                </ActionIcon>
                            </Group>
                        </Group>

                        <Group gap="xs" justify="space-between" wrap="wrap">
                            <Group gap={6} style={{ minWidth: 0 }} wrap="wrap">
                                <Box className={classes.routeBadge}>
                                    <Text c="cyan.3" ff="monospace" fw={600} size="xs" span>
                                        :{rule.listenPort}
                                    </Text>
                                    <TbArrowRight
                                        color="var(--mantine-color-dimmed)"
                                        size={12}
                                        style={{ flexShrink: 0 }}
                                    />
                                    <Text
                                        c={rule.targetAddress.trim() ? 'gray.2' : 'orange.4'}
                                        className={classes.routeTarget}
                                        ff="monospace"
                                        size="xs"
                                        span
                                    >
                                        {targetDisplay}
                                    </Text>
                                </Box>

                                {matchedTargetNode && (
                                    <Badge color="dark" size="xs" variant="default">
                                        <Group gap={4} wrap="nowrap">
                                            {matchedTargetNode.countryCode &&
                                                matchedTargetNode.countryCode !== 'XX' && (
                                                    <ReactCountryFlag
                                                        countryCode={matchedTargetNode.countryCode}
                                                        style={{ fontSize: '1em' }}
                                                    />
                                                )}
                                            <span>{matchedTargetNode.name}</span>
                                        </Group>
                                    </Badge>
                                )}

                                {showResolvedIp && (
                                    <Tooltip
                                        label={t('node-forwarding-card.resolved-target-address', {
                                            address: resolvedIp!
                                        })}
                                    >
                                        <Badge color="teal" size="xs" variant="dot">
                                            {resolvedIp}
                                        </Badge>
                                    </Tooltip>
                                )}
                            </Group>

                            <Tooltip
                                multiline
                                label={
                                    <Stack gap={2}>
                                        <Text fw={600} size="xs">
                                            {t('node-forwarding-card.persisted-traffic')}:{' '}
                                            {prettifyBytesUtil(persistedTotal)}
                                        </Text>
                                        <Text size="xs">
                                            ↑ {prettifyBytesUtil(persistedUpload)} · ↓{' '}
                                            {prettifyBytesUtil(persistedDownload)}
                                        </Text>
                                        <Divider my={2} opacity={0.25} />
                                        <Text fw={600} size="xs">
                                            {t('node-forwarding-card.traffic-since-apply')}:{' '}
                                            {prettifyBytesUtil(runtimeTraffic.totalBytes)}
                                        </Text>
                                        <Text size="xs">
                                            TCP: ↑{' '}
                                            {prettifyBytesUtil(runtimeTraffic.tcpUploadBytes)} · ↓{' '}
                                            {prettifyBytesUtil(runtimeTraffic.tcpDownloadBytes)} (
                                            {t('node-forwarding-card.packets-short', {
                                                count: runtimeTraffic.tcpPackets
                                            })}
                                            )
                                        </Text>
                                        <Text size="xs">
                                            UDP: ↑{' '}
                                            {prettifyBytesUtil(runtimeTraffic.udpUploadBytes)} · ↓{' '}
                                            {prettifyBytesUtil(runtimeTraffic.udpDownloadBytes)} (
                                            {t('node-forwarding-card.packets-short', {
                                                count: runtimeTraffic.udpPackets
                                            })}
                                            )
                                        </Text>
                                    </Stack>
                                }
                            >
                                <Group gap={6} style={{ cursor: 'help' }} wrap="nowrap">
                                    <Text c="dimmed" size="xs">
                                        {prettifyBytesUtil(persistedTotal)}
                                    </Text>
                                    {runtimeTraffic.totalBytes > 0 && (
                                        <Badge color="cyan" size="xs" variant="light">
                                            +{prettifyBytesUtil(runtimeTraffic.totalBytes)}
                                        </Badge>
                                    )}
                                </Group>
                            </Tooltip>
                        </Group>
                    </Stack>
                </Box>

                <Collapse expanded={expanded}>
                    <Stack gap="sm" pt={4}>
                        <Divider opacity={0.25} />

                        {conflicts.length > 0 && (
                            <Alert
                                color="orange"
                                icon={<TbAlertTriangle size={16} />}
                                p="xs"
                                variant="light"
                            >
                                <Stack gap={2}>
                                    {conflicts.map((conflict, idx) => (
                                        <Text key={idx} size="xs">
                                            {formatConflictMessage(conflict)}
                                        </Text>
                                    ))}
                                </Stack>
                            </Alert>
                        )}

                        <SimpleGrid cols={wide ? { base: 1, sm: 2, md: 5 } : { base: 1, sm: 2 }}>
                            <TextInput
                                label={t('node-forwarding-card.name')}
                                size="xs"
                                {...form.getInputProps(`rules.${index}.name`)}
                            />

                            <Stack gap={4}>
                                <Text fw={500} size="xs">
                                    {t('node-forwarding-card.protocol')}
                                </Text>
                                <SegmentedControl
                                    data={[
                                        { value: 'TCP_UDP', label: 'TCP + UDP' },
                                        { value: 'TCP', label: 'TCP' },
                                        { value: 'UDP', label: 'UDP' }
                                    ]}
                                    fullWidth
                                    size="xs"
                                    value={rule.protocol}
                                    onChange={(value) =>
                                        form.setFieldValue(
                                            `rules.${index}.protocol`,
                                            value as NodeForwardingConfig['rules'][number]['protocol']
                                        )
                                    }
                                />
                            </Stack>

                            <NumberInput
                                allowDecimal={false}
                                allowNegative={false}
                                clampBehavior="strict"
                                label={t('node-forwarding-card.listen-port')}
                                max={65_535}
                                min={1}
                                size="xs"
                                {...form.getInputProps(`rules.${index}.listenPort`)}
                            />

                            <TextInput
                                description={
                                    showResolvedIp
                                        ? t('node-forwarding-card.resolved-target-address', {
                                              address: resolvedIp!
                                          })
                                        : undefined
                                }
                                inputWrapperOrder={['label', 'input', 'description', 'error']}
                                label={t('node-forwarding-card.target-address')}
                                placeholder="edge.example.com"
                                rightSection={
                                    panelNodes.length > 0 ? (
                                        <Menu position="bottom-end" shadow="md" withinPortal>
                                            <Menu.Target>
                                                <Tooltip
                                                    label={t(
                                                        'node-forwarding-card.select-target-node'
                                                    )}
                                                >
                                                    <ActionIcon
                                                        color="cyan"
                                                        size="sm"
                                                        variant="subtle"
                                                    >
                                                        <TbServer2 size={15} />
                                                    </ActionIcon>
                                                </Tooltip>
                                            </Menu.Target>
                                            <Menu.Dropdown>
                                                <Menu.Label>
                                                    {t('node-forwarding-card.select-target-node')}
                                                </Menu.Label>
                                                <ScrollArea.Autosize mah={240}>
                                                    {panelNodes.map((candidate) => (
                                                        <Menu.Item
                                                            key={candidate.uuid}
                                                            leftSection={
                                                                candidate.countryCode &&
                                                                candidate.countryCode !== 'XX' ? (
                                                                    <ReactCountryFlag
                                                                        countryCode={
                                                                            candidate.countryCode
                                                                        }
                                                                        style={{
                                                                            fontSize: '1.1em'
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <TbServer2 size={14} />
                                                                )
                                                            }
                                                            onClick={() =>
                                                                onSelectTargetNode(index, candidate)
                                                            }
                                                        >
                                                            <Stack gap={0}>
                                                                <Text fw={500} size="xs">
                                                                    {candidate.name}
                                                                </Text>
                                                                <Text
                                                                    c="dimmed"
                                                                    ff="monospace"
                                                                    size="xs"
                                                                >
                                                                    {candidate.address}
                                                                </Text>
                                                            </Stack>
                                                        </Menu.Item>
                                                    ))}
                                                </ScrollArea.Autosize>
                                            </Menu.Dropdown>
                                        </Menu>
                                    ) : undefined
                                }
                                size="xs"
                                {...form.getInputProps(`rules.${index}.targetAddress`)}
                            />

                            <NumberInput
                                allowDecimal={false}
                                allowNegative={false}
                                clampBehavior="strict"
                                label={t('node-forwarding-card.target-port')}
                                max={65_535}
                                min={1}
                                size="xs"
                                {...form.getInputProps(`rules.${index}.targetPort`)}
                            />
                        </SimpleGrid>

                        {(rule.targetPort !== rule.listenPort || targetInboundPorts.length > 0) && (
                            <Group gap={6} wrap="wrap">
                                {rule.targetPort !== rule.listenPort && (
                                    <Badge
                                        className={classes.quickChip}
                                        color="gray"
                                        size="xs"
                                        variant="light"
                                        onClick={() =>
                                            form.setFieldValue(
                                                `rules.${index}.targetPort`,
                                                rule.listenPort
                                            )
                                        }
                                    >
                                        {t('node-forwarding-card.same-as-listen', {
                                            port: rule.listenPort
                                        })}
                                    </Badge>
                                )}
                                {targetInboundPorts.length > 0 && (
                                    <>
                                        <Text c="dimmed" size="xs">
                                            {t('node-forwarding-card.target-node-inbounds')}:
                                        </Text>
                                        {targetInboundPorts.map((inbound) => (
                                            <Badge
                                                key={`${inbound.tag}-${inbound.port}`}
                                                className={classes.quickChip}
                                                color={
                                                    rule.targetPort === inbound.port
                                                        ? 'teal'
                                                        : 'cyan'
                                                }
                                                size="xs"
                                                variant={
                                                    rule.targetPort === inbound.port
                                                        ? 'filled'
                                                        : 'light'
                                                }
                                                onClick={() =>
                                                    form.setFieldValue(
                                                        `rules.${index}.targetPort`,
                                                        inbound.port
                                                    )
                                                }
                                            >
                                                {inbound.tag} :{inbound.port}
                                            </Badge>
                                        ))}
                                    </>
                                )}
                            </Group>
                        )}

                        <Paper className={classes.ruleStatsBox} p="xs" radius="sm">
                            <Group gap="xs" justify="space-between" wrap="wrap">
                                <Group gap="lg" wrap="wrap">
                                    <Stack gap={1}>
                                        <Text c="dimmed" size="xs">
                                            {t('node-forwarding-card.persisted-traffic')}
                                        </Text>
                                        <Text size="xs">
                                            <Text fw={600} span>
                                                {prettifyBytesUtil(persistedTotal)}
                                            </Text>{' '}
                                            (↑ {prettifyBytesUtil(persistedUpload)} · ↓{' '}
                                            {prettifyBytesUtil(persistedDownload)})
                                        </Text>
                                    </Stack>

                                    <Stack gap={1}>
                                        <Text c="dimmed" size="xs">
                                            {t('node-forwarding-card.traffic-since-apply')}
                                        </Text>
                                        <Text size="xs">
                                            <Text c="cyan.3" fw={600} span>
                                                {prettifyBytesUtil(runtimeTraffic.totalBytes)}
                                            </Text>{' '}
                                            (↑ {prettifyBytesUtil(runtimeTraffic.uploadBytes)} · ↓{' '}
                                            {prettifyBytesUtil(runtimeTraffic.downloadBytes)})
                                        </Text>
                                    </Stack>
                                </Group>

                                {totalRules > 1 && (
                                    <Group gap={4}>
                                        <Tooltip label={t('node-forwarding-card.move-up')}>
                                            <ActionIcon
                                                color="gray"
                                                disabled={index === 0}
                                                size="sm"
                                                variant="subtle"
                                                onClick={() => onMove(index, index - 1)}
                                            >
                                                <TbArrowUp size={14} />
                                            </ActionIcon>
                                        </Tooltip>
                                        <Tooltip label={t('node-forwarding-card.move-down')}>
                                            <ActionIcon
                                                color="gray"
                                                disabled={index === totalRules - 1}
                                                size="sm"
                                                variant="subtle"
                                                onClick={() => onMove(index, index + 1)}
                                            >
                                                <TbArrowDown size={14} />
                                            </ActionIcon>
                                        </Tooltip>
                                    </Group>
                                )}
                            </Group>
                        </Paper>
                    </Stack>
                </Collapse>
            </Stack>
        </Paper>
    )
}

interface WorkspaceProps {
    conflictsByRuleId: Map<string, ForwardingConflict[]>
    expandedIds: Record<string, boolean>
    form: UseFormReturnType<NodeForwardingConfig>
    isLoading: boolean
    isSyncing: boolean
    isUpdating: boolean
    nodeAddress?: string
    onAddRule: () => void
    onApply: () => void
    onCollapseAll: () => void
    onDiscard: () => void
    onDuplicateRule: (index: number) => void
    onExpandAll: () => void
    onMoveRule: (from: number, to: number) => void
    onRemoveRule: (index: number, ruleId: string) => void
    onSelectTargetNode: (index: number, target: PanelNodeOption) => void
    onSync: () => void
    onToggleExpand: (ruleId: string) => void
    onUsageRangeChange: (value: DatesRangeValue<string>) => void
    panelNodes: PanelNodeOption[]
    persistedUsage?: NodeForwardingUsage
    rawUsageRange: [null | string, null | string]
    searchQuery: string
    setSearchQuery: (value: string) => void
    status?: NodeForwardingStatus
    wide?: boolean
}

function ForwardingWorkspace({
    conflictsByRuleId,
    expandedIds,
    form,
    isLoading,
    isSyncing,
    isUpdating,
    nodeAddress,
    onAddRule,
    onApply,
    onCollapseAll,
    onDiscard,
    onDuplicateRule,
    onExpandAll,
    onMoveRule,
    onRemoveRule,
    onSelectTargetNode,
    onSync,
    onToggleExpand,
    onUsageRangeChange,
    panelNodes,
    persistedUsage,
    rawUsageRange,
    searchQuery,
    setSearchQuery,
    status,
    wide = false
}: WorkspaceProps) {
    const { t, i18n } = useTranslation()

    const resolvedListenInterface = status?.resolvedListenInterface
    const interfaceSuggestions = useMemo(() => {
        const items = new Set<string>(['auto'])
        if (resolvedListenInterface) {
            items.add(resolvedListenInterface)
        }
        for (const common of ['eth0', 'ens3', 'enp0s3']) {
            items.add(common)
        }
        return Array.from(items)
    }, [resolvedListenInterface])

    const runtimeTotals = useMemo(() => summarizeTotalRuntimeTraffic(status), [status])
    const persistedUpload = persistedUsage?.uploadBytes ?? 0
    const persistedDownload = persistedUsage?.downloadBytes ?? 0
    const persistedTotal = persistedUsage?.totalBytes ?? persistedUpload + persistedDownload

    const rules = form.values.rules
    const isDirty = form.isDirty()

    const visibleRuleEntries = useMemo(() => {
        return rules
            .map((rule, index) => {
                const runtimeRule = status?.rules.find((item) => item.id === rule.id)
                const normalizedTarget = rule.targetAddress.trim().toLowerCase()
                const matchedNode = normalizedTarget
                    ? panelNodes.find(
                          (candidate) => candidate.address.trim().toLowerCase() === normalizedTarget
                      )
                    : undefined
                return {
                    rule,
                    index,
                    runtimeRule,
                    matchedNode
                }
            })
            .filter(({ rule, runtimeRule, matchedNode }) =>
                matchesForwardingRuleFilter(
                    rule,
                    runtimeRule?.resolvedTargetAddress,
                    matchedNode?.name,
                    searchQuery
                )
            )
    }, [panelNodes, rules, searchQuery, status?.rules])

    const anyExpanded = useMemo(
        () => rules.some((rule) => Boolean(expandedIds[rule.id])),
        [expandedIds, rules]
    )

    const ruleHasFieldError = (index: number) =>
        Object.keys(form.errors).some((key) => key.startsWith(`rules.${index}.`))

    if (isLoading && !status) {
        return (
            <Stack gap="sm">
                <Skeleton height={58} radius="md" />
                <Skeleton height={64} radius="md" />
                <Skeleton height={56} radius="md" />
            </Stack>
        )
    }

    return (
        <Stack gap="sm">
            {status?.lastError && (
                <Alert
                    color={status.state === 'degraded' ? 'orange' : 'red'}
                    icon={<TbAlertTriangle size={16} />}
                    p="xs"
                    variant="light"
                >
                    {status.lastError}
                </Alert>
            )}

            <Paper className={classes.controlPanel} p="sm" radius="md">
                <Stack gap="xs">
                    <Group align="center" justify="space-between" wrap="wrap">
                        <Switch
                            checked={form.values.enabled}
                            color="teal"
                            label={t('node-forwarding-card.enable')}
                            size="sm"
                            onChange={(event) =>
                                form.setFieldValue('enabled', event.currentTarget.checked)
                            }
                        />

                        <Autocomplete
                            data={interfaceSuggestions}
                            leftSection={<TbNetwork size={14} />}
                            placeholder="auto"
                            size="xs"
                            w={{ base: '100%', xs: 200 }}
                            aria-label={t('node-forwarding-card.interface')}
                            {...form.getInputProps('listenInterface')}
                        />
                    </Group>

                    <Group gap={6} justify="space-between" wrap="wrap">
                        <Text c="dimmed" size="xs">
                            {status?.resolvedListenInterface
                                ? t('node-forwarding-card.resolved-interface', {
                                      interface: status.resolvedListenInterface
                                  })
                                : t('node-forwarding-card.interface-description')}
                        </Text>

                        <Group gap={6} wrap="wrap">
                            {status?.forwardingEnabled !== undefined && (
                                <Badge
                                    color={status.forwardingEnabled ? 'teal' : 'red'}
                                    size="xs"
                                    variant="light"
                                >
                                    {status.forwardingEnabled
                                        ? t('node-forwarding-card.ip-forward-on')
                                        : t('node-forwarding-card.ip-forward-off')}
                                </Badge>
                            )}
                            {status?.firewallForwardPolicy &&
                                status.firewallForwardPolicy !== 'unknown' && (
                                    <Badge
                                        color={
                                            status.firewallForwardPolicy === 'accept'
                                                ? 'teal'
                                                : 'orange'
                                        }
                                        size="xs"
                                        variant="light"
                                    >
                                        {t('node-forwarding-card.firewall-policy', {
                                            policy: status.firewallForwardPolicy.toUpperCase()
                                        })}
                                    </Badge>
                                )}
                            {status?.appliedAt && (
                                <Tooltip label={new Date(status.appliedAt).toLocaleString()}>
                                    <Badge color="gray" size="xs" variant="light">
                                        {t('node-forwarding-card.applied-at', {
                                            time: dayjs(status.appliedAt).format('MM-DD HH:mm')
                                        })}
                                    </Badge>
                                </Tooltip>
                            )}
                        </Group>
                    </Group>
                </Stack>
            </Paper>

            <Paper className={classes.trafficPanel} p="sm" radius="md">
                <Group align="flex-end" gap="sm" justify="space-between" wrap="wrap">
                    <DatePickerInput
                        allowSingleDateInRange
                        dropdownType="modal"
                        label={t('node-forwarding-card.persisted-traffic-range')}
                        leftSection={<TbCalendar size={15} />}
                        locale={i18n.language}
                        size="xs"
                        style={{ flex: '1 1 210px' }}
                        type="range"
                        value={rawUsageRange}
                        onChange={onUsageRangeChange}
                    />

                    <Group gap="xs" grow style={{ flex: '1 1 240px' }} wrap="nowrap">
                        <Box className={classes.metricBlock}>
                            <Text c="dimmed" size="xs">
                                {t('node-forwarding-card.persisted-traffic-total')}
                            </Text>
                            <Text fw={700} size="sm">
                                {prettifyBytesUtil(persistedTotal)}
                            </Text>
                            <Text c="dimmed" size="xs">
                                ↑ {prettifyBytesUtil(persistedUpload)} · ↓{' '}
                                {prettifyBytesUtil(persistedDownload)}
                            </Text>
                        </Box>

                        <Box className={classes.metricBlock}>
                            <Text c="dimmed" size="xs">
                                {t('node-forwarding-card.runtime-total')}
                            </Text>
                            <Text c="cyan.3" fw={700} size="sm">
                                {prettifyBytesUtil(runtimeTotals.totalBytes)}
                            </Text>
                            <Text c="dimmed" size="xs">
                                ↑ {prettifyBytesUtil(runtimeTotals.uploadBytes)} · ↓{' '}
                                {prettifyBytesUtil(runtimeTotals.downloadBytes)}
                            </Text>
                        </Box>
                    </Group>
                </Group>
            </Paper>

            {rules.length > 0 && (
                <Group gap="xs" justify="space-between" wrap="wrap">
                    {(rules.length >= 3 || wide || searchQuery.trim().length > 0) && (
                        <TextInput
                            leftSection={<TbSearch size={14} />}
                            placeholder={t('node-forwarding-card.search-placeholder')}
                            rightSection={
                                searchQuery ? (
                                    <ActionIcon
                                        color="gray"
                                        size="xs"
                                        variant="subtle"
                                        onClick={() => setSearchQuery('')}
                                    >
                                        <TbX size={13} />
                                    </ActionIcon>
                                ) : undefined
                            }
                            size="xs"
                            style={{ flex: '1 1 200px' }}
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.currentTarget.value)}
                        />
                    )}

                    <Group gap={4} ml="auto">
                        <Button
                            color="gray"
                            leftSection={
                                anyExpanded ? (
                                    <TbChevronsUp size={14} />
                                ) : (
                                    <TbChevronsDown size={14} />
                                )
                            }
                            size="compact-xs"
                            variant="subtle"
                            onClick={anyExpanded ? onCollapseAll : onExpandAll}
                        >
                            {anyExpanded
                                ? t('node-forwarding-card.collapse-all')
                                : t('node-forwarding-card.expand-all')}
                        </Button>
                    </Group>
                </Group>
            )}

            {rules.length === 0 ? (
                <Paper className={classes.emptyState} p="lg" radius="md">
                    <Stack align="center" gap="xs">
                        <ThemeIcon color="cyan" radius="xl" size="lg" variant="light">
                            <TbArrowsExchange size={20} />
                        </ThemeIcon>
                        <Text fw={600} size="sm" ta="center">
                            {t('node-forwarding-card.empty-title')}
                        </Text>
                        <Text c="dimmed" maw={360} size="xs" ta="center">
                            {t('node-forwarding-card.empty-description')}
                        </Text>
                        <Button
                            color="cyan"
                            leftSection={<TbPlus size={15} />}
                            mt={4}
                            size="xs"
                            variant="light"
                            onClick={onAddRule}
                        >
                            {t('node-forwarding-card.add-rule')}
                        </Button>
                    </Stack>
                </Paper>
            ) : visibleRuleEntries.length === 0 ? (
                <Paper className={classes.emptyState} p="md" radius="md">
                    <Group justify="space-between">
                        <Text c="dimmed" size="xs">
                            {t('node-forwarding-card.no-matching-rules')}
                        </Text>
                        <Button
                            size="compact-xs"
                            variant="subtle"
                            onClick={() => setSearchQuery('')}
                        >
                            {t('node-forwarding-card.clear-filter')}
                        </Button>
                    </Group>
                </Paper>
            ) : (
                <Stack gap="xs">
                    {visibleRuleEntries.map(({ rule, index, runtimeRule }) => {
                        const persistedRule = persistedUsage?.rules.find(
                            (item) => item.id === rule.id
                        )
                        return (
                            <ForwardingRuleItem
                                key={rule.id}
                                conflicts={conflictsByRuleId.get(rule.id) ?? []}
                                expanded={Boolean(expandedIds[rule.id])}
                                form={form}
                                globalEnabled={form.values.enabled}
                                hasFieldError={ruleHasFieldError(index)}
                                index={index}
                                nodeAddress={nodeAddress}
                                panelNodes={panelNodes}
                                persistedRule={persistedRule}
                                rule={rule}
                                runtimeRule={runtimeRule}
                                statusState={status?.state}
                                totalRules={rules.length}
                                wide={wide}
                                onDuplicate={onDuplicateRule}
                                onMove={onMoveRule}
                                onRemove={onRemoveRule}
                                onSelectTargetNode={onSelectTargetNode}
                                onToggleExpand={onToggleExpand}
                            />
                        )
                    })}
                </Stack>
            )}

            <Divider opacity={0.25} />

            <Group gap="xs" justify="space-between" wrap="wrap">
                <Button
                    color="cyan"
                    disabled={rules.length >= 64}
                    leftSection={<TbPlus size={15} />}
                    rightSection={
                        rules.length > 0 ? (
                            <Badge color="cyan" size="xs" variant="light">
                                {rules.length}/64
                            </Badge>
                        ) : undefined
                    }
                    size="xs"
                    variant="subtle"
                    onClick={onAddRule}
                >
                    {t('node-forwarding-card.add-rule')}
                </Button>

                <Group gap="xs" wrap="wrap">
                    {isDirty && (
                        <Button
                            color="gray"
                            leftSection={<TbRotate size={15} />}
                            size="xs"
                            variant="subtle"
                            onClick={onDiscard}
                        >
                            {t('node-forwarding-card.discard')}
                        </Button>
                    )}

                    <Tooltip disabled={!isDirty} label={t('node-forwarding-card.sync-dirty-hint')}>
                        <Box component="span">
                            <Button
                                disabled={isLoading || isDirty}
                                leftSection={<TbRefresh size={15} />}
                                loading={isSyncing}
                                size="xs"
                                variant="light"
                                onClick={onSync}
                            >
                                {t('node-forwarding-card.sync')}
                            </Button>
                        </Box>
                    </Tooltip>

                    <Button
                        color="teal"
                        disabled={!isDirty}
                        loading={isUpdating}
                        size="xs"
                        onClick={onApply}
                    >
                        {t('node-forwarding-card.apply')}
                    </Button>
                </Group>
            </Group>
        </Stack>
    )
}

export const NodeForwardingCard = ({
    cardVariants,
    motionWrapper: MotionWrapper,
    node,
    nodeUuid
}: IProps) => {
    const { t } = useTranslation()
    const initializedUuidRef = useRef<string | null>(null)
    const queryKey = nodesQueryKeys.getNodeForwarding({ uuid: nodeUuid }).queryKey

    const [expandedModalOpen, setExpandedModalOpen] = useState(false)
    const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})
    const [searchQuery, setSearchQuery] = useState('')
    const [rawUsageRange, setRawUsageRange] = useState<[null | string, null | string]>(() => {
        const range = getDefaultDateRange()
        return [range.start, range.end]
    })
    const [usageRange, setUsageRange] = useState(() => getDefaultDateRange())

    const form = useForm<NodeForwardingConfig>({
        initialValues: DEFAULT_CONFIG,
        mode: 'controlled',
        validate: schemaResolver(NodeForwardingConfigSchema)
    })

    const { data, isLoading } = useGetNodeForwarding({ route: { uuid: nodeUuid } })
    const { data: allNodes } = useGetNodes()
    const { data: persistedUsage } = useGetNodeForwardingUsage({
        route: { uuid: nodeUuid },
        query: usageRange
    })

    const { mutate: updateForwarding, isPending: isUpdating } = useUpdateNodeForwarding({
        route: { uuid: nodeUuid },
        mutationFns: {
            onSuccess: (response) => {
                queryClient.setQueryData(queryKey, response)
                form.setValues(response.config)
                form.resetDirty(response.config)
            }
        }
    })

    const { mutate: syncForwarding, isPending: isSyncing } = useSyncNodeForwarding({
        route: { uuid: nodeUuid },
        mutationFns: {
            onSuccess: (response) => {
                queryClient.setQueryData(queryKey, response)
            }
        }
    })

    useEffect(() => {
        if (data && initializedUuidRef.current !== nodeUuid) {
            initializedUuidRef.current = nodeUuid
            form.setValues(data.config)
            form.resetDirty(data.config)
        }
    }, [data, nodeUuid])

    const activeInbounds = useMemo<InboundPortLike[]>(
        () => node?.configProfile.activeInbounds ?? [],
        [node?.configProfile.activeInbounds]
    )

    const panelNodes = useMemo<PanelNodeOption[]>(() => {
        if (!allNodes) return []
        return allNodes
            .filter((candidate) => candidate.uuid !== nodeUuid)
            .map((candidate) => ({
                uuid: candidate.uuid,
                name: candidate.name,
                address: candidate.address,
                countryCode: candidate.countryCode,
                inbounds: candidate.configProfile.activeInbounds
            }))
    }, [allNodes, nodeUuid])

    const conflictsByRuleId = useMemo(
        () => detectForwardingConflicts(form.values, node?.address, activeInbounds),
        [activeInbounds, form.values, node?.address]
    )

    const toggleExpand = (ruleId: string) => {
        setExpandedIds((prev) => ({
            ...prev,
            [ruleId]: !prev[ruleId]
        }))
    }

    const expandAll = () => {
        const next: Record<string, boolean> = {}
        for (const rule of form.values.rules) {
            next[rule.id] = true
        }
        setExpandedIds(next)
    }

    const collapseAll = () => {
        setExpandedIds({})
    }

    const addRule = () => {
        const id = crypto.randomUUID()
        const nextPort = pickNextListenPort(form.values.rules, activeInbounds)
        const lastRule = form.values.rules.at(-1)
        form.insertListItem('rules', {
            id,
            name: `Forward ${form.values.rules.length + 1}`,
            enabled: true,
            protocol: lastRule?.protocol ?? 'TCP_UDP',
            listenPort: nextPort,
            targetAddress: '',
            targetPort: lastRule?.targetPort ?? 54_320
        })
        setSearchQuery('')
        setExpandedIds((prev) => ({ ...prev, [id]: true }))
    }

    const duplicateRule = (index: number) => {
        const source = form.values.rules[index]
        if (!source || form.values.rules.length >= 64) return
        const id = crypto.randomUUID()
        const nextPort = pickNextListenPort(
            form.values.rules,
            activeInbounds,
            source.listenPort + 1
        )
        const copyName = `${source.name.trim() || 'Forward'}-copy`.slice(0, 64)
        form.insertListItem(
            'rules',
            {
                ...source,
                id,
                name: copyName,
                listenPort: nextPort
            },
            index + 1
        )
        setExpandedIds((prev) => ({ ...prev, [id]: true }))
    }

    const removeRule = (index: number, ruleId: string) => {
        form.removeListItem('rules', index)
        setExpandedIds((prev) => {
            if (!prev[ruleId]) return prev
            const { [ruleId]: _removed, ...rest } = prev
            return rest
        })
    }

    const moveRule = (from: number, to: number) => {
        if (to < 0 || to >= form.values.rules.length) return
        form.reorderListItem('rules', { from, to })
    }

    const selectTargetNode = (index: number, target: PanelNodeOption) => {
        const current = form.values.rules[index]
        if (!current) return
        form.setFieldValue(`rules.${index}.targetAddress`, target.address)
        if (/^Forward\s+\d+$/i.test(current.name.trim())) {
            form.setFieldValue(`rules.${index}.name`, target.name.slice(0, 64))
        }
        const firstInboundWithPort = target.inbounds.find(
            (inbound): inbound is InboundPortLike & { port: number } =>
                typeof inbound.port === 'number' && inbound.port >= 1
        )
        if (firstInboundWithPort) {
            form.setFieldValue(`rules.${index}.targetPort`, firstInboundWithPort.port)
        }
    }

    const handleDiscard = () => {
        const baseline = data?.config ?? DEFAULT_CONFIG
        form.setValues(baseline)
        form.resetDirty(baseline)
        form.clearErrors()
    }

    const handleApply = () => {
        const normalized = normalizeForwardingConfig(form.values)
        form.setValues(normalized)
        const validation = form.validate()
        if (validation.hasErrors) {
            const toExpand: Record<string, boolean> = {}
            for (const key of Object.keys(validation.errors)) {
                const match = /^rules\.(\d+)\./.exec(key)
                if (match) {
                    const rule = normalized.rules[Number(match[1])]
                    if (rule) toExpand[rule.id] = true
                }
            }
            if (Object.keys(toExpand).length > 0) {
                setExpandedIds((prev) => ({ ...prev, ...toExpand }))
            }
            return
        }
        updateForwarding({ variables: normalized })
    }

    const handleUsageRangeChange = (value: DatesRangeValue<string>) => {
        if (value[0] === null && value[1] === null) {
            const today = getDefaultDateRange()
            setRawUsageRange([today.start, today.end])
            setUsageRange(today)
            return
        }
        setRawUsageRange(value)
        if (!value[0] || !value[1]) return
        const start = dayjs(value[0])
        const end = dayjs(value[1])
        if (!start.isValid() || !end.isValid()) return
        setUsageRange({
            start: start.format('YYYY-MM-DD'),
            end: end.format('YYYY-MM-DD')
        })
    }

    const status = data?.status
    const totalRules = form.values.rules.length
    const activeRules = form.values.rules.filter((rule) => rule.enabled).length
    const subtitle =
        totalRules === 0
            ? t('node-forwarding-card.subtitle-empty')
            : t('node-forwarding-card.subtitle-summary', {
                  active: form.values.enabled ? activeRules : 0,
                  total: totalRules
              })

    return (
        <>
            <MotionWrapper variants={cardVariants}>
                <SectionCard.Root>
                    <SectionCard.Section>
                        <Group gap="xs" justify="space-between" wrap="nowrap">
                            <BaseOverlayHeader
                                iconColor="cyan"
                                IconComponent={TbArrowsExchange}
                                iconVariant="soft"
                                subtitle={subtitle}
                                title={t('node-forwarding-card.title')}
                                titleOrder={5}
                            />
                            <Group gap={6} style={{ flexShrink: 0 }} wrap="nowrap">
                                {form.isDirty() && (
                                    <Badge color="yellow" size="xs" variant="outline">
                                        {t('node-forwarding-card.unsaved')}
                                    </Badge>
                                )}
                                <Badge
                                    color={STATUS_COLORS[status?.state ?? 'unreachable']}
                                    variant="light"
                                >
                                    {t(
                                        `node-forwarding-card.status-${status?.state ?? 'unreachable'}`
                                    )}
                                </Badge>
                                <Tooltip label={t('node-forwarding-card.expand-editor')}>
                                    <ActionIcon
                                        color="cyan"
                                        size="md"
                                        variant="light"
                                        onClick={() => setExpandedModalOpen(true)}
                                    >
                                        <TbArrowsMaximize size={16} />
                                    </ActionIcon>
                                </Tooltip>
                            </Group>
                        </Group>
                    </SectionCard.Section>

                    <SectionCard.Section>
                        <ForwardingWorkspace
                            conflictsByRuleId={conflictsByRuleId}
                            expandedIds={expandedIds}
                            form={form}
                            isLoading={isLoading}
                            isSyncing={isSyncing}
                            isUpdating={isUpdating}
                            nodeAddress={node?.address}
                            panelNodes={panelNodes}
                            persistedUsage={persistedUsage}
                            rawUsageRange={rawUsageRange}
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            status={status}
                            onAddRule={addRule}
                            onApply={handleApply}
                            onCollapseAll={collapseAll}
                            onDiscard={handleDiscard}
                            onDuplicateRule={duplicateRule}
                            onExpandAll={expandAll}
                            onMoveRule={moveRule}
                            onRemoveRule={removeRule}
                            onSelectTargetNode={selectTargetNode}
                            onSync={() => syncForwarding({})}
                            onToggleExpand={toggleExpand}
                            onUsageRangeChange={handleUsageRangeChange}
                        />
                    </SectionCard.Section>
                </SectionCard.Root>
            </MotionWrapper>

            <Modal
                centered
                opened={expandedModalOpen}
                size="1040px"
                title={
                    <BaseOverlayHeader
                        countryCode={node?.countryCode}
                        iconColor="cyan"
                        IconComponent={TbArrowsExchange}
                        iconVariant="soft"
                        subtitle={node?.address ? `${node.address} · ${subtitle}` : subtitle}
                        title={
                            node?.name
                                ? t('node-forwarding-card.modal-title', { name: node.name })
                                : t('node-forwarding-card.title')
                        }
                        titleOrder={4}
                    />
                }
                onClose={() => setExpandedModalOpen(false)}
            >
                <ForwardingWorkspace
                    conflictsByRuleId={conflictsByRuleId}
                    expandedIds={expandedIds}
                    form={form}
                    isLoading={isLoading}
                    isSyncing={isSyncing}
                    isUpdating={isUpdating}
                    nodeAddress={node?.address}
                    panelNodes={panelNodes}
                    persistedUsage={persistedUsage}
                    rawUsageRange={rawUsageRange}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    status={status}
                    wide
                    onAddRule={addRule}
                    onApply={handleApply}
                    onCollapseAll={collapseAll}
                    onDiscard={handleDiscard}
                    onDuplicateRule={duplicateRule}
                    onExpandAll={expandAll}
                    onMoveRule={moveRule}
                    onRemoveRule={removeRule}
                    onSelectTargetNode={selectTargetNode}
                    onSync={() => syncForwarding({})}
                    onToggleExpand={toggleExpand}
                    onUsageRangeChange={handleUsageRangeChange}
                />
            </Modal>
        </>
    )
}
