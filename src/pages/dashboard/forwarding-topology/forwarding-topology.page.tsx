import type { ForwardingTopology, TopologyUsage } from './topology.schema'

import {
    Accordion,
    Alert,
    Badge,
    Box,
    Button,
    Card,
    Group,
    Loader,
    Paper,
    ScrollArea,
    Select,
    SimpleGrid,
    Stack,
    Text,
    Tooltip
} from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TbAlertTriangle, TbCalendar, TbRefresh, TbRoute, TbServer2, TbWorld } from 'react-icons/tb'

import { Page, PageHeaderShared } from '@shared/ui'
import { DatePickerInput } from '@shared/ui/date-time-picker'
import { getDefaultDateRange } from '@shared/utils/time-utils'

import classes from './forwarding-topology.module.css'
import { topologyAPI } from './topology-api'
import { endpointLabel, topologyBytes, traceTopology, type TopologyPath } from './topology-paths'

type Node = ForwardingTopology['nodes'][number]
type Rule = ForwardingTopology['rules'][number]
const useCopy = () => {
    const { i18n } = useTranslation()
    const zh = i18n.language.startsWith('zh')
    return (cn: string, en: string) => (zh ? cn : en)
}
function timestamp(value: string | null) {
    return value
        ? new Date(value).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })
        : '—'
}
function Usage({ value, label }: { value: TopologyUsage; label: string }) {
    const s = useCopy()
    const missing = BigInt(value.total) - BigInt(value.upload) - BigInt(value.download)
    return (
        <Stack gap={3} className={classes.metric}>
            <Text c="dimmed" size="xs">
                {label}
            </Text>
            <Text fw={650}>{topologyBytes(value.total)}</Text>
            <Text size="xs">
                ↑ {topologyBytes(value.upload)} · ↓ {topologyBytes(value.download)}
            </Text>
            {missing > 0n && (
                <Text c="orange" size="xs">
                    {s('历史未拆分', 'Legacy unsplit')}: {topologyBytes(String(missing))}
                </Text>
            )}
            {value.shared && (
                <Badge color="orange" size="xs" variant="light">
                    {s(
                        '共享入站归因，不代表独占用量',
                        'Shared inbound attribution, not exclusive usage'
                    )}
                </Badge>
            )}
            {!value.lastRecordedAt && (
                <Text c="dimmed" size="xs">
                    {s('此区间没有用量记录', 'No usage recorded in this range')}
                </Text>
            )}
        </Stack>
    )
}
function NodeState({ node }: { node: Node }) {
    const s = useCopy()
    return (
        <Group gap={5}>
            <Badge
                color={node.disabled ? 'gray' : node.connected && !node.stale ? 'teal' : 'orange'}
                size="xs"
            >
                {node.disabled
                    ? s('已禁用', 'Disabled')
                    : !node.connected
                      ? s('离线', 'Offline')
                      : node.stale
                        ? s('观测过期', 'Stale')
                        : s('Agent 在线', 'Agent online')}
            </Badge>
            {(node.configPending || node.configBlocked) && (
                <Badge color="orange" size="xs">
                    {node.configBlocked
                        ? s('配置阻塞', 'Config blocked')
                        : s('配置待同步', 'Config pending')}
                </Badge>
            )}
            {!node.configValid && (
                <Badge color="red" size="xs">
                    {s('转发配置无效', 'Invalid forwarding config')}
                </Badge>
            )}
        </Group>
    )
}
const ruleColor = (r: Rule) =>
    r.state === 'APPLIED' ? 'teal' : r.state === 'DISABLED' ? 'gray' : 'orange'
function RuleState({ rule }: { rule: Rule }) {
    const s = useCopy()
    const label = {
        APPLIED: s('规则已应用', 'Rules applied'),
        DISABLED: s('已禁用', 'Disabled'),
        PENDING: s('等待下发', 'Pending apply'),
        STALE: s('观测过期', 'Stale'),
        DEGRADED: s('降级 / DNS 异常', 'Degraded / DNS issue'),
        ERROR: s('应用异常', 'Apply error'),
        OFFLINE: s('节点离线', 'Node offline'),
        UNREPORTED: s('无运行观测', 'Not reported')
    }
    return (
        <Badge color={ruleColor(rule)} size="xs" variant="light">
            {label[rule.state]}
        </Badge>
    )
}
function Quota({ node }: { node: Node }) {
    const s = useCopy()
    return (
        <Text
            c="dimmed"
            size="xs"
            title={s(
                '计费周期累计，可能包含倍率；与所选日期区间独立。',
                'Billing-cycle total may include multipliers; independent of the selected date range.'
            )}
        >
            {s('供应商周期配额', 'Provider-cycle quota')}: {topologyBytes(node.quota.used)} /{' '}
            {node.quota.tracking && BigInt(node.quota.limit) > 0n
                ? topologyBytes(node.quota.limit)
                : node.quota.tracking
                  ? s('未设上限', 'No limit')
                  : s('未启用配额监控', 'Quota tracking disabled')}
            {node.quota.tracking && node.quota.resetDay !== null
                ? ` · ${s('重置日', 'Reset day')} ${node.quota.resetDay}`
                : ''}
        </Text>
    )
}
function Arrow({ label, warning = false }: { label: string; warning?: boolean }) {
    return (
        <Box className={classes.arrow} aria-label={label}>
            <svg aria-hidden="true" width="40" height="22" viewBox="0 0 40 22">
                <path
                    d="M2 11h33m-8-7 8 7-8 7"
                    fill="none"
                    stroke={warning ? 'var(--mantine-color-orange-6)' : 'currentColor'}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
            <Text size="xs" c={warning ? 'orange' : 'dimmed'} ta="center">
                {label}
            </Text>
        </Box>
    )
}
function HopCard({
    node,
    rule,
    port,
    inboundTag
}: {
    node: Node
    rule?: Rule
    port: number
    inboundTag: string | null
}) {
    const s = useCopy()
    return (
        <Paper p="sm" radius="md" withBorder className={classes.hop} data-testid="topology-hop">
            <Stack gap="xs">
                <Group gap="xs" wrap="nowrap">
                    <TbServer2 size={18} />
                    <Text fw={650}>{node.name}</Text>
                </Group>
                <NodeState node={node} />
                <Text className={classes.endpoint} size="xs">
                    {endpointLabel(node.address, port)}
                </Text>
                <Text c="dimmed" size="xs">
                    {node.countryCode} · {node.provider ?? s('供应商未填写', 'Provider not set')}
                </Text>
                {rule ? (
                    <>
                        <Group gap={5}>
                            <RuleState rule={rule} />
                            <Badge size="xs" variant="outline">
                                {rule.protocol}
                            </Badge>
                        </Group>
                        <Text fw={600} size="sm">
                            {rule.name}
                        </Text>
                        <Text className={classes.endpoint} size="xs">
                            → {endpointLabel(rule.targetAddress, rule.targetPort)}
                        </Text>
                        <Text
                            c={
                                rule.resolution === 'STALE' || rule.resolution === 'MISSING'
                                    ? 'orange'
                                    : 'dimmed'
                            }
                            size="xs"
                        >
                            {rule.resolution === 'LITERAL'
                                ? s('目标为 IP', 'IP target')
                                : rule.resolvedTargetAddress
                                  ? `${s('DNS 观测', 'Observed DNS')}: ${rule.resolvedTargetAddress}${rule.resolution === 'STALE' ? s('（过期）', ' (stale)') : ''}`
                                  : s(
                                        '尚无匹配此配置的 DNS 观测',
                                        'No DNS observation for this configuration'
                                    )}
                        </Text>
                        {rule.resolution !== 'LITERAL' && (
                            <Text c="dimmed" size="xs">
                                {s('DNS 最后解析', 'Last DNS resolution')}:{' '}
                                {timestamp(node.dnsReportedAt)} (UTC+8)
                            </Text>
                        )}
                        <Usage
                            value={rule.usage}
                            label={s(
                                '本规则区间用量（原始字节）',
                                'Rule usage in range (raw bytes)'
                            )}
                        />
                        {rule.protocols.length > 1 && (
                            <Text size="xs" c="dimmed">
                                {rule.protocols
                                    .map((p) => `${p.protocol} ${topologyBytes(p.usage.total)}`)
                                    .join(' · ')}
                            </Text>
                        )}
                    </>
                ) : (
                    <>
                        <Badge size="xs" variant="light">
                            {s('核心入站（配置）', 'Core inbound (configured)')}
                        </Badge>
                        <Text size="sm">{inboundTag ?? '—'}</Text>
                        <Text
                            size="xs"
                            c={node.coreOnline && !node.stale && node.connected ? 'teal' : 'orange'}
                        >
                            {node.coreOnline && !node.stale && node.connected
                                ? s('核心在线观测', 'Core observed online')
                                : s('核心状态未确认', 'Core status unconfirmed')}
                        </Text>
                        <Usage
                            value={node.coreUsage}
                            label={s('该节点全部核心区间用量', 'All core usage on this node')}
                        />
                    </>
                )}
                <Quota node={node} />
            </Stack>
        </Paper>
    )
}
function PathGraph({
    data,
    path,
    host
}: {
    data: ForwardingTopology
    path: TopologyPath
    host?: ForwardingTopology['hosts'][number]
}) {
    const s = useCopy()
    const nodes = new Map(data.nodes.map((n) => [n.uuid, n]))
    const rules = new Map(data.rules.map((r) => [r.key, r]))
    const outcome = {
        CORE: s('关联至配置核心入站', 'Linked to configured core inbound'),
        UNRESOLVED_ENTRY: s(
            '入口节点未确认；不会用 Host 逻辑绑定替代实际入口',
            'Entry unconfirmed; Host bindings do not prove an entry route'
        ),
        UNKNOWN_TARGET: s(
            '目标不在已知节点地址中，可能是外部目标或尚未识别的别名',
            'Unknown or external target / unrecognized alias'
        ),
        NO_LISTENER: s(
            '目标端口没有匹配的配置入站或转发规则',
            'No configured listener or forwarding rule at the destination port'
        ),
        LOOP: s('发现转发循环', 'Forwarding loop detected'),
        LIMIT: s(
            '分支或深度达到安全上限，仅展示部分链路',
            'Branch/depth safety limit reached; partial topology shown'
        ),
        DISABLED: s('此入口、节点或规则已禁用', 'Entry, node or rule is disabled'),
        UNEXPECTED_INBOUND: s(
            '终点与 Host 绑定的节点或入站不一致',
            'Terminal node/inbound does not match the Host binding'
        ),
        TRANSPORT_MISMATCH: s(
            '端口存在，但 TCP/UDP 传输不匹配',
            'Port exists but TCP/UDP transport does not match'
        )
    }
    const terminal = path.hops.length ? nodes.get(path.hops.at(-1)!.nodeUuid) : null
    const exit = path.outcome === 'CORE' ? terminal?.exitObservation : null
    return (
        <Paper
            p="md"
            withBorder
            radius="md"
            className={`${classes.graph} ${path.outcome !== 'CORE' || path.ambiguous ? classes.warning : ''}`}
            data-testid="topology-path"
        >
            <Group mb="sm" gap="xs">
                <Badge color={path.outcome === 'CORE' ? 'blue' : 'orange'} variant="light">
                    {outcome[path.outcome]}
                </Badge>
                {path.ambiguous && (
                    <Badge color="orange" variant="outline">
                        {s(
                            '存在多条候选，不代表同时经过',
                            'Multiple candidates, not simultaneous hops'
                        )}
                    </Badge>
                )}
            </Group>
            <ScrollArea type="auto" offsetScrollbars>
                <Box className={classes.lane}>
                    {host && (
                        <Paper p="sm" radius="md" withBorder className={classes.hop}>
                            <Stack gap="xs">
                                <Group gap="xs">
                                    <TbWorld size={18} />
                                    <Text fw={650}>{host.remark}</Text>
                                </Group>
                                <Badge size="xs" color={host.disabled ? 'gray' : 'blue'}>
                                    {s('Host 入口', 'Host entry')} ·{' '}
                                    {host.protocol ?? s('未知协议', 'Unknown protocol')}
                                </Badge>
                                <Text size="xs" className={classes.endpoint}>
                                    {endpointLabel(host.address, host.port)}
                                </Text>
                                <Usage
                                    value={host.usage}
                                    label={s(
                                        'Host 入站归因（非多跳合计）',
                                        'Host inbound attribution (not a multi-hop total)'
                                    )}
                                />
                            </Stack>
                        </Paper>
                    )}
                    {path.hops.map((hop, index) => {
                        const node = nodes.get(hop.nodeUuid)
                        if (!node) return null
                        const previous = index
                            ? rules.get(path.hops[index - 1].ruleKey ?? '')
                            : null
                        const match = previous?.targetMatch ?? host?.entryMatch ?? 'ADDRESS'
                        return (
                            <Box key={`${hop.nodeUuid}:${index}`} style={{ display: 'contents' }}>
                                {(index > 0 || host) && (
                                    <Arrow
                                        label={
                                            match === 'DNS'
                                                ? s('DNS 观测关联', 'Observed DNS link')
                                                : match === 'AMBIGUOUS'
                                                  ? s('多个候选', 'Multiple candidates')
                                                  : s('地址 / IP 关联', 'Address / IP link')
                                        }
                                        warning={
                                            match === 'AMBIGUOUS' ||
                                            previous?.resolution === 'STALE'
                                        }
                                    />
                                )}
                                <HopCard
                                    node={node}
                                    rule={rules.get(hop.ruleKey ?? '')}
                                    port={hop.port}
                                    inboundTag={hop.inboundTag}
                                />
                            </Box>
                        )
                    })}
                    {path.outcome !== 'CORE' && path.outcome !== 'LIMIT' && (
                        <>
                            <Arrow label={s('待确认', 'Unconfirmed')} warning />
                            <Paper p="sm" radius="md" withBorder className={classes.hop}>
                                <Stack gap="xs">
                                    <TbAlertTriangle size={22} />
                                    <Text fw={600}>{outcome[path.outcome]}</Text>
                                    <Text size="xs" className={classes.endpoint}>
                                        {endpointLabel(path.address, path.port)}
                                    </Text>
                                </Stack>
                            </Paper>
                        </>
                    )}
                    {path.outcome === 'CORE' && (
                        <>
                            <Arrow
                                label={s(
                                    '节点出口观测，非 Host 实测',
                                    'Node egress observation, not a Host test'
                                )}
                            />
                            <Paper p="sm" radius="md" withBorder className={classes.hop}>
                                <Stack gap="xs">
                                    <TbWorld size={22} />
                                    <Text fw={600}>
                                        {s('最近出口观测', 'Last observed egress')}
                                    </Text>
                                    <Text size="sm" className={classes.endpoint}>
                                        {exit?.ip ?? s('暂无出口观测', 'No egress observation')}
                                    </Text>
                                    {exit && (
                                        <>
                                            <Text size="xs">
                                                {exit.country ?? '—'} · {exit.asn ?? '—'}
                                            </Text>
                                            <Text size="xs" c="dimmed">
                                                {timestamp(exit.observedAt)} (UTC+8) ·{' '}
                                                {exit.sourceType}
                                            </Text>
                                        </>
                                    )}
                                    <Text size="xs" c="dimmed">
                                        {s(
                                            '具体用户的出站策略可能不同，不将此观测当作该 Host 的实际出口。',
                                            'Per-user outbound routing may differ; this is not proof of the Host’s actual egress.'
                                        )}
                                    </Text>
                                </Stack>
                            </Paper>
                        </>
                    )}
                </Box>
            </ScrollArea>
        </Paper>
    )
}

export function ForwardingTopologyContent() {
    const s = useCopy()
    const [dates, setDates] = useState<[string | null, string | null]>(() => {
        const t = getDefaultDateRange()
        return [t.start, t.end]
    })
    const [scope, setScope] = useState<string | null>('host')
    const [sourceId, setSourceId] = useState<string | null>(null)
    const [nodeId, setNodeId] = useState<string | null>(null)
    const valid =
        !!dates[0] &&
        !!dates[1] &&
        dates[0] <= dates[1] &&
        Date.parse(dates[1]) - Date.parse(dates[0]) <= 365 * 86400000
    const query = useQuery({
        queryKey: ['forwarding-topology', ...dates],
        queryFn: ({ signal }) => topologyAPI.get({ start: dates[0]!, end: dates[1]! }, signal),
        enabled: valid,
        refetchInterval: 30000,
        staleTime: 15000,
        retry: false
    })
    const data = query.data
    const sourceOptions = useMemo(() => {
        if (!data) return []
        const names = new Map(data.nodes.map((n) => [n.uuid, n.name]))
        return scope === 'host'
            ? data.hosts
                  .filter(
                      (h) =>
                          !nodeId ||
                          h.entryNodeUuids.includes(nodeId) ||
                          h.boundNodeUuids.includes(nodeId)
                  )
                  .map((h) => ({
                      value: h.uuid,
                      label: `${h.disabled ? '⏸ ' : ''}${h.remark} · ${endpointLabel(h.address, h.port)}`
                  }))
            : data.rules
                  .filter((r) => !nodeId || r.nodeUuid === nodeId)
                  .map((r) => ({
                      value: r.key,
                      label: `${names.get(r.nodeUuid)} · ${r.name} · ${r.listenPort} → ${endpointLabel(r.targetAddress, r.targetPort)}`
                  }))
    }, [data, nodeId, scope])
    const selected = sourceOptions.some((o) => o.value === sourceId)
        ? sourceId
        : (sourceOptions[0]?.value ?? null)
    const host = scope === 'host' ? data?.hosts.find((h) => h.uuid === selected) : undefined
    const rule = scope === 'rule' ? data?.rules.find((r) => r.key === selected) : undefined
    const paths = useMemo(
        () =>
            data && (host || rule) ? traceTopology(data, host ? { host } : { rule: rule! }) : [],
        [data, host, rule]
    )
    return (
        <Stack gap="md" className={classes.content}>
            <Alert color="blue" variant="light" icon={<TbRoute size={20} />}>
                {s(
                    '根据已保存配置和运行观测推导关联，不是抓包或端到端探活。节点配额、转发字节、核心流量与 Host 归因各自独立；不提供跨跳相加的“总流量”。',
                    'Links are inferred from saved configuration and observations, not packet traces or end-to-end probes. Provider quotas, forwarding bytes, core usage and Host attribution are independent; there is no cross-hop traffic total.'
                )}
            </Alert>
            <SimpleGrid className={classes.filters} cols={{ base: 1, sm: 2, lg: 4 }}>
                <DatePickerInput
                    type="range"
                    label={s('用量日期（UTC）', 'Usage dates (UTC)')}
                    value={dates}
                    onChange={setDates}
                    clearable={false}
                    maxDate={getDefaultDateRange().end}
                    presetDirection="past"
                    leftSection={<TbCalendar size={16} />}
                    leftSectionPointerEvents="none"
                />
                <Select
                    label={s('范围', 'View')}
                    data={[
                        { value: 'host', label: s('Host 链路', 'Host paths') },
                        { value: 'rule', label: s('转发规则链路', 'Forwarding rule paths') }
                    ]}
                    value={scope}
                    allowDeselect={false}
                    onChange={(v) => {
                        setScope(v)
                        setSourceId(null)
                    }}
                />
                <Select
                    searchable
                    clearable
                    label={s('筛选节点', 'Filter node')}
                    placeholder={s('所有节点', 'All nodes')}
                    data={data?.nodes.map((n) => ({ value: n.uuid, label: n.name })) ?? []}
                    value={nodeId}
                    onChange={setNodeId}
                />
                <Button
                    variant="light"
                    leftSection={<TbRefresh size={16} />}
                    loading={query.isFetching}
                    onClick={() => void query.refetch()}
                    disabled={!valid}
                >
                    {s('刷新', 'Refresh')}
                </Button>
            </SimpleGrid>
            {!valid ? (
                <Alert color="orange">
                    {s(
                        '请选择完整且有序的日期范围，最多 366 天。',
                        'Choose an ordered date range of up to 366 days.'
                    )}
                </Alert>
            ) : query.isLoading ? (
                <Group justify="center" mih={180}>
                    <Loader />
                    <Text>{s('读取拓扑与历史流量…', 'Loading topology and persisted usage…')}</Text>
                </Group>
            ) : query.isError ? (
                <Alert color="red" title={s('无法读取拓扑', 'Cannot load topology')}>
                    {s(
                        '请确认后端已支持此功能且账号有读取权限，然后重试。',
                        'Check backend support and read permissions, then retry.'
                    )}
                </Alert>
            ) : (
                data && (
                    <>
                        <SimpleGrid cols={{ base: 2, sm: 4 }}>
                            {[
                                [
                                    s('在线 / 总节点', 'Online / total nodes'),
                                    `${data.nodes.filter((n) => n.connected && !n.disabled && !n.stale).length} / ${data.nodes.length}`
                                ],
                                [
                                    s('启用转发规则', 'Enabled forwarding rules'),
                                    String(data.rules.filter((r) => r.enabled).length)
                                ],
                                [
                                    s('未确认入口的 Host', 'Hosts with unconfirmed entries'),
                                    String(
                                        data.hosts.filter((h) => h.entryNodeUuids.length !== 1)
                                            .length
                                    )
                                ],
                                [
                                    s('规则需关注', 'Rules requiring attention'),
                                    String(
                                        data.rules.filter((r) => r.enabled && r.state !== 'APPLIED')
                                            .length
                                    )
                                ]
                            ].map(([label, value]) => (
                                <Paper withBorder p="sm" radius="md" key={label}>
                                    <Text size="xs" c="dimmed">
                                        {label}
                                    </Text>
                                    <Text size="xl" fw={700}>
                                        {value}
                                    </Text>
                                </Paper>
                            ))}
                        </SimpleGrid>
                        <Select
                            className={classes.source}
                            label={s('选择入口 / 转发规则', 'Select Host / forwarding rule')}
                            searchable
                            nothingFoundMessage={s('没有匹配项', 'No matches')}
                            data={sourceOptions}
                            value={selected}
                            onChange={setSourceId}
                            allowDeselect={false}
                            data-testid="topology-source"
                        />
                        {!sourceOptions.length && (
                            <Alert color="gray">
                                {s(
                                    '当前范围没有 Host 或转发规则。仍可在下方查看节点与历史用量。',
                                    'No Hosts or rules in this view. Node inventory and historical usage remain available below.'
                                )}
                            </Alert>
                        )}
                        {host && (
                            <Text size="xs" c="dimmed" data-testid="topology-binding">
                                {s(
                                    'Host 面板绑定（逻辑关联，不代表入口直达）',
                                    'Host panel bindings (logical, not proof of a direct route)'
                                )}
                                :{' '}
                                {host.boundNodeUuids
                                    .map((id) => data.nodes.find((n) => n.uuid === id)?.name ?? id)
                                    .join(' · ') || '—'}
                            </Text>
                        )}
                        {paths.map((path, i) => (
                            <PathGraph
                                key={`${selected}:${i}`}
                                data={data}
                                path={path}
                                host={host}
                            />
                        ))}
                        <Accordion variant="separated" radius="md">
                            <Accordion.Item value="inventory">
                                <Accordion.Control icon={<TbServer2 size={18} />}>
                                    {s('节点与规则明细', 'Node and rule details')} (
                                    {data.nodes.length})
                                </Accordion.Control>
                                <Accordion.Panel>
                                    <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }}>
                                        {data.nodes
                                            .filter((n) => !nodeId || n.uuid === nodeId)
                                            .map((n) => (
                                                <Card
                                                    withBorder
                                                    radius="md"
                                                    className={classes.nodeCard}
                                                    key={n.uuid}
                                                >
                                                    <Stack gap="xs">
                                                        <Group justify="space-between">
                                                            <Text fw={650}>{n.name}</Text>
                                                            <Badge size="xs" variant="outline">
                                                                {n.mode}
                                                            </Badge>
                                                        </Group>
                                                        <NodeState node={n} />
                                                        <Text
                                                            className={classes.endpoint}
                                                            size="xs"
                                                        >
                                                            {n.address}
                                                        </Text>
                                                        <Quota node={n} />
                                                        <Usage
                                                            value={n.coreUsage}
                                                            label={s(
                                                                '节点核心区间用量（原始字节）',
                                                                'Node core usage in range (raw bytes)'
                                                            )}
                                                        />
                                                        <Text c="dimmed" size="xs">
                                                            {s('运行观测', 'Runtime observation')}:{' '}
                                                            {timestamp(n.reportedAt)} (UTC+8)
                                                        </Text>
                                                        <Text
                                                            size="xs"
                                                            c={
                                                                !n.snapshot ||
                                                                n.snapshot.error ||
                                                                n.snapshot.gap !== '0' ||
                                                                n.snapshot.pending !== '0'
                                                                    ? 'orange'
                                                                    : 'dimmed'
                                                            }
                                                        >
                                                            {s('用量同步', 'Usage sync')}:{' '}
                                                            {timestamp(
                                                                n.snapshot?.lastSuccessAt ?? null
                                                            )}{' '}
                                                            · pending {n.snapshot?.pending ?? '—'} /
                                                            gap {n.snapshot?.gap ?? '—'}
                                                        </Text>
                                                        {data.rules
                                                            .filter((r) => r.nodeUuid === n.uuid)
                                                            .map((r) => (
                                                                <Paper
                                                                    key={r.key}
                                                                    withBorder
                                                                    p="xs"
                                                                    radius="sm"
                                                                >
                                                                    <Stack gap={5}>
                                                                        <Group justify="space-between">
                                                                            <Text
                                                                                size="sm"
                                                                                fw={600}
                                                                            >
                                                                                {r.name}
                                                                            </Text>
                                                                            <RuleState rule={r} />
                                                                        </Group>
                                                                        <Text
                                                                            size="xs"
                                                                            className={
                                                                                classes.endpoint
                                                                            }
                                                                        >
                                                                            {r.protocol} :
                                                                            {r.listenPort} →{' '}
                                                                            {endpointLabel(
                                                                                r.targetAddress,
                                                                                r.targetPort
                                                                            )}
                                                                        </Text>
                                                                        <Text c="dimmed" size="xs">
                                                                            {r.resolvedTargetAddress ??
                                                                                s(
                                                                                    '无 DNS 观测',
                                                                                    'No observed DNS'
                                                                                )}{' '}
                                                                            · {r.resolution}
                                                                        </Text>
                                                                        <Usage
                                                                            value={r.usage}
                                                                            label={s(
                                                                                '规则区间用量',
                                                                                'Rule usage in range'
                                                                            )}
                                                                        />
                                                                        <Button
                                                                            size="compact-xs"
                                                                            variant="subtle"
                                                                            onClick={() => {
                                                                                setScope('rule')
                                                                                setSourceId(r.key)
                                                                            }}
                                                                        >
                                                                            {s(
                                                                                '查看此链路',
                                                                                'Show path'
                                                                            )}
                                                                        </Button>
                                                                    </Stack>
                                                                </Paper>
                                                            ))}
                                                    </Stack>
                                                </Card>
                                            ))}
                                    </SimpleGrid>
                                </Accordion.Panel>
                            </Accordion.Item>
                        </Accordion>
                        {data.orphanUsage.some((r) => !nodeId || r.nodeUuid === nodeId) && (
                            <Alert
                                color="orange"
                                title={s(
                                    '已删除 / 无法解析规则的历史用量',
                                    'Usage for deleted / unreadable rules'
                                )}
                            >
                                <Stack gap="xs">
                                    {data.orphanUsage
                                        .filter((r) => !nodeId || r.nodeUuid === nodeId)
                                        .map((r) => (
                                            <Box key={`${r.nodeUuid}:${r.ruleId}`}>
                                                <Text size="xs" className={classes.endpoint}>
                                                    {data.nodes.find((n) => n.uuid === r.nodeUuid)
                                                        ?.name ?? r.nodeUuid}{' '}
                                                    · {r.ruleId}
                                                </Text>
                                                <Usage
                                                    value={r.usage}
                                                    label={s(
                                                        '保留的规则历史（不推测旧目标）',
                                                        'Retained history (old target not inferred)'
                                                    )}
                                                />
                                            </Box>
                                        ))}
                                </Stack>
                            </Alert>
                        )}
                        <Tooltip
                            label={s(
                                'DNS 只使用 Agent 已上报结果；打开页面不会执行测试或解析域名。',
                                'DNS comes only from Agent observations. Opening this page runs no probes or DNS lookups.'
                            )}
                        >
                            <Text size="xs" c="dimmed">
                                {s('数据读取时间', 'Snapshot read at')}:{' '}
                                {timestamp(data.generatedAt)} (UTC+8) ·{' '}
                                {s(
                                    '用量为 UTC 日期范围；观测时间为北京时间。',
                                    'Usage uses UTC dates; observation times use UTC+8.'
                                )}
                            </Text>
                        </Tooltip>
                    </>
                )
            )}
        </Stack>
    )
}

export function ForwardingTopologyPage() {
    const s = useCopy()
    return (
        <Page title={s('转发拓扑', 'Forwarding topology')}>
            <PageHeaderShared
                icon={<TbRoute size={24} />}
                title={s('转发拓扑', 'Forwarding topology')}
            />
            <ForwardingTopologyContent />
        </Page>
    )
}
