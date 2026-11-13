import NiceModal, { useModal } from '@ebay/nice-modal-react'
import {
    Accordion,
    Alert,
    Badge,
    Box,
    Button,
    Checkbox,
    Divider,
    Group,
    Modal,
    MultiSelect,
    NumberInput,
    Progress,
    Select,
    SimpleGrid,
    Stack,
    Table,
    Text,
    TextInput,
    ThemeIcon
} from '@mantine/core'
import {
    BenchmarkJobSchema,
    BenchmarkTargetSchema,
    BENCHMARK_CITIES,
    CancelNodeBenchmarkCommand,
    CreateNodeBenchmarkCommand,
    GetBenchmarkTargetsCommand,
    GetNodeBenchmarksCommand,
    GetNodeCommand,
    UpdateBenchmarkTargetCommand
} from '@remnawave/backend-contract'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { githubDarkTheme, JsonEditor } from 'json-edit-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
    TbAdjustments,
    TbChartBar,
    TbCpu,
    TbDatabase,
    TbDeviceFloppy,
    TbHistory,
    TbNetwork,
    TbPlayerPlay,
    TbPlayerStop,
    TbSettings
} from 'react-icons/tb'
import { z } from 'zod'

import { useNiceMantineModal } from '@shared/_modals/use-nice-modal'
import { instance } from '@shared/api/axios'
import surfaceClasses from '@shared/ui/node-panel-surface.module.css'
import { BaseOverlayHeader } from '@shared/ui/overlays/base-overlay-header'

import classes from './node-benchmark.module.css'

type Job = z.infer<typeof BenchmarkJobSchema>
type Target = z.infer<typeof BenchmarkTargetSchema>
type Props = { node: GetNodeCommand.Response['response']; kind: 'HARDWARE' | 'NETWORK' }

const active = (j: Job) => ['QUEUED', 'RUNNING', 'CANCEL_REQUESTED'].includes(j.status)

const cities: Record<string, string> = {
    'hong-kong': '香港',
    singapore: '新加坡',
    tokyo: '东京',
    osaka: '大阪',
    'los-angeles': '洛杉矶',
    seattle: '西雅图',
    dallas: '达拉斯',
    'new-york': '纽约',
    london: '伦敦',
    frankfurt: '法兰克福',
    amsterdam: '阿姆斯特丹',
    paris: '巴黎'
}

const record = (v: unknown): Record<string, unknown> =>
    v && typeof v === 'object' ? (v as Record<string, unknown>) : {}

const errorText = (e: unknown) => {
    const data = record(record(record(e).response).data)
    return typeof data.message === 'string'
        ? data.message
        : e instanceof Error
          ? e.message
          : String(e)
}

const value = (v: unknown, digits = 2) => (typeof v === 'number' ? v.toFixed(digits) : '—')

function formatStatus(status: string, s: (cn: string, en: string) => string) {
    switch (status) {
        case 'QUEUED':
            return { label: s('排队中', 'Queued'), color: 'blue' }
        case 'RUNNING':
            return { label: s('测试中', 'Running'), color: 'cyan' }
        case 'CANCEL_REQUESTED':
            return { label: s('正在取消', 'Cancelling'), color: 'orange' }
        case 'COMPLETED':
        case 'OK':
            return { label: s('已完成', 'Completed'), color: 'teal' }
        case 'PARTIAL':
            return { label: s('部分完成', 'Partial'), color: 'yellow' }
        case 'CANCELLED':
            return { label: s('已取消', 'Cancelled'), color: 'gray' }
        case 'UNSUPPORTED':
            return { label: s('不支持', 'Unsupported'), color: 'gray' }
        case 'FAILED':
            return { label: s('失败', 'Failed'), color: 'red' }
        default:
            return { label: status, color: 'gray' }
    }
}

function formatDiskMode(mode: string, s: (cn: string, en: string) => string) {
    switch (mode) {
        case 'write':
            return s('顺序写入', 'Seq write')
        case 'read':
            return s('顺序读取', 'Seq read')
        case 'randwrite':
            return s('随机写入', 'Rand write')
        case 'randread':
            return s('随机读取', 'Rand read')
        default:
            return mode
    }
}

function formatHardwareItem(name: string, s: (cn: string, en: string) => string) {
    if (name === 'cpu') return s('CPU 计算吞吐', 'CPU compute')
    if (name === 'memory') return s('内存顺序吞吐', 'Memory throughput')
    if (name === 'disk') return s('磁盘读写与 IOPS', 'Disk I/O & IOPS')
    return name
}

export const NodeBenchmarkModal = NiceModal.create(({ node, kind }: Props) => {
    const { i18n } = useTranslation()
    const zh = i18n.language.startsWith('zh')
    const s = (cn: string, en: string) => (zh ? cn : en)
    const modal = useModal()
    const { modalProps } = useNiceMantineModal({ modal })
    const cache = useQueryClient()
    const key = ['node-benchmarks', node.uuid]

    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [items, setItems] = useState<string[]>(
        kind === 'HARDWARE' ? ['cpu', 'memory'] : ['latency', 'download', 'upload']
    )
    const [selectedCities, setCities] = useState<string[]>([...BENCHMARK_CITIES])
    const [family, setFamily] = useState('IPv4')
    const [seconds, setSeconds] = useState(10)
    const [mib, setMib] = useState(32)
    const [threads, setThreads] = useState(1)
    const [sourceIp, setSourceIp] = useState('')
    const [iface, setIface] = useState('')
    const [draft, setDraft] = useState<Target | null>(null)
    const [confirmed, setConfirmed] = useState(false)

    const history = useQuery({
        queryKey: key,
        queryFn: async () =>
            (await instance.get<{ response: Job[] }>(GetNodeBenchmarksCommand.url(node.uuid))).data
                .response,
        refetchInterval: (q) => (q.state.data?.some(active) ? 2000 : false)
    })

    const targets = useQuery({
        queryKey: ['benchmark-targets'],
        queryFn: async () =>
            (await instance.get<{ response: Target[] }>(GetBenchmarkTargetsCommand.url)).data
                .response,
        enabled: kind === 'NETWORK'
    })

    const start = useMutation({
        mutationFn: async () =>
            (
                await instance.post<{ response: Job }>(CreateNodeBenchmarkCommand.url(node.uuid), {
                    kind,
                    items,
                    cities: kind === 'NETWORK' ? selectedCities : [],
                    family,
                    seconds,
                    bytesPerDirection: mib * 1048576,
                    threads,
                    sourceIp,
                    interface: iface
                })
            ).data.response,
        onSuccess: (j) => {
            setSelectedId(j.id)
            setConfirmed(false)
            void cache.invalidateQueries({ queryKey: key })
        }
    })

    const cancel = useMutation({
        mutationFn: async (id: string) =>
            instance.post(CancelNodeBenchmarkCommand.url(node.uuid, id)),
        onSuccess: () => {
            void cache.invalidateQueries({ queryKey: key })
        }
    })

    const update = useMutation({
        mutationFn: async (target: Target) =>
            instance.put(
                UpdateBenchmarkTargetCommand.url(target.id),
                BenchmarkTargetSchema.parse(target)
            ),
        onSuccess: () => {
            setDraft(null)
            void cache.invalidateQueries({ queryKey: ['benchmark-targets'] })
        }
    })

    const all = history.data || []
    const sameKind = all.filter((j) => j.kind === kind)
    const selected = sameKind.find((j) => j.id === selectedId) || sameKind[0]
    const busy = all.find(active)

    const lastComparable =
        selected &&
        sameKind.find(
            (j) =>
                j.id !== selected.id &&
                !active(j) &&
                new Date(j.createdAt) < new Date(selected.createdAt) &&
                JSON.stringify({ ...record(j.request), id: undefined }) ===
                    JSON.stringify({ ...record(selected.request), id: undefined })
        )

    const cityOptions = useMemo(() => {
        const list = (targets.data || []).map((t) => ({
            value: t.id,
            label: `${zh ? (cities[t.id] ?? t.city) : t.city} · ${t.provider}${!t.uploadUrl ? s('（仅下载）', ' (download only)') : ''}`
        }))
        const seen = new Set(list.map((o) => o.value))
        for (const id of BENCHMARK_CITIES) {
            if (!seen.has(id)) {
                list.push({ value: id, label: zh ? (cities[id] ?? id) : id })
            }
        }
        return list
    }, [s, targets.data, zh])

    const maxMbps = useMemo(() => {
        if (!selected || kind !== 'NETWORK') return 1
        let peak = 1
        for (const r of selected.results) {
            const dl = record(r.metrics.download).mbps
            const ul = record(r.metrics.upload).mbps
            if (typeof dl === 'number' && dl > peak) peak = dl
            if (typeof ul === 'number' && ul > peak) peak = ul
        }
        return peak
    }, [kind, selected])

    const title =
        kind === 'HARDWARE'
            ? s('硬件性能测试', 'Hardware benchmark')
            : s('网络测速', 'Network benchmark')

    const requestError =
        start.error || cancel.error || history.error || targets.error || update.error

    const maxPayloadMib =
        selectedCities.length *
        mib *
        (Number(items.includes('download')) + Number(items.includes('upload')))

    return (
        <Modal
            {...modalProps}
            size="min(1080px, 95vw)"
            title={
                <BaseOverlayHeader
                    iconColor={kind === 'HARDWARE' ? 'orange' : 'cyan'}
                    IconComponent={kind === 'HARDWARE' ? TbCpu : TbNetwork}
                    iconVariant="soft"
                    title={title}
                    subtitle={node.name}
                />
            }
        >
            <Stack gap="md">
                {requestError && (
                    <Alert color="red" radius="md">
                        {errorText(requestError)}
                    </Alert>
                )}

                <Box
                    className={clsx(
                        surfaceClasses.subPanel,
                        kind === 'HARDWARE'
                            ? surfaceClasses.accentOrange
                            : surfaceClasses.accentCyan
                    )}
                    p="md"
                >
                    <Stack gap="sm">
                        <Group justify="space-between" wrap="wrap">
                            <Group gap="xs">
                                <ThemeIcon
                                    color={kind === 'HARDWARE' ? 'orange' : 'cyan'}
                                    radius="md"
                                    size="sm"
                                    variant="light"
                                >
                                    <TbAdjustments size={14} />
                                </ThemeIcon>
                                <Text fw={600} size="sm">
                                    {s('测试范围与资源限额', 'Test scope & resource limits')}
                                </Text>
                            </Group>
                            <Badge
                                color={!node.isConnected || node.isDisabled ? 'orange' : 'teal'}
                                size="xs"
                                variant="light"
                            >
                                {!node.isConnected
                                    ? s('节点离线', 'Node offline')
                                    : node.isDisabled
                                      ? s('节点已禁用', 'Node disabled')
                                      : s('节点就绪', 'Node ready')}
                            </Badge>
                        </Group>

                        <Text size="xs" c="dimmed">
                            {kind === 'NETWORK'
                                ? s(
                                      '测试节点自身的直连网络；上传和下载分阶段执行。测速流量计入主机和供应商流量，不计入用户 Usage。',
                                      'Tests the node network directly. Upload and download run separately. Traffic counts towards host/provider usage, not user usage.'
                                  )
                                : s(
                                      '短时测试会占用资源。磁盘测试在 Agent 持久卷创建临时文件，最多写入 128 MiB，至少预留 1 GiB 空间。',
                                      'Short tests consume resources. Disk testing uses a temporary file in the Agent volume, writes at most 128 MiB, and requires 1 GiB free.'
                                  )}
                        </Text>

                        <MultiSelect
                            label={s('测试项目', 'Test items')}
                            value={items}
                            onChange={setItems}
                            disabled={!!busy}
                            data={
                                kind === 'HARDWARE'
                                    ? [
                                          { value: 'cpu', label: 'CPU' },
                                          {
                                              value: 'memory',
                                              label: s('内存吞吐', 'Memory throughput')
                                          },
                                          {
                                              value: 'disk',
                                              label: s('磁盘读写 / IOPS', 'Disk read/write / IOPS')
                                          }
                                      ]
                                    : [
                                          {
                                              value: 'latency',
                                              label: s(
                                                  'TCP 延迟 / 连接失败率',
                                                  'TCP latency / connection failure rate'
                                              )
                                          },
                                          { value: 'download', label: s('下载', 'Download') },
                                          { value: 'upload', label: s('上传', 'Upload') }
                                      ]
                            }
                        />

                        {kind === 'NETWORK' && (
                            <>
                                <MultiSelect
                                    label={s('目标城市', 'Target cities')}
                                    searchable
                                    value={selectedCities}
                                    onChange={setCities}
                                    data={cityOptions}
                                    disabled={!!busy || targets.isLoading}
                                />
                                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
                                    <Select
                                        label={s('地址族', 'Address family')}
                                        value={family}
                                        onChange={(v) => setFamily(v || 'IPv4')}
                                        data={['IPv4', 'IPv6']}
                                        disabled={!!busy}
                                    />
                                    <NumberInput
                                        label={s(
                                            '每方向流量上限（MiB）',
                                            'Limit per direction (MiB)'
                                        )}
                                        value={mib}
                                        min={1}
                                        max={256}
                                        allowDecimal={false}
                                        onChange={(v) => setMib(Number(v))}
                                        disabled={!!busy}
                                    />
                                    <NumberInput
                                        label={s(
                                            '每阶段时长上限（秒）',
                                            'Maximum duration per phase (seconds)'
                                        )}
                                        value={seconds}
                                        min={1}
                                        max={15}
                                        allowDecimal={false}
                                        onChange={(v) => setSeconds(Number(v))}
                                        disabled={!!busy}
                                    />
                                </SimpleGrid>
                                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                                    <TextInput
                                        label={s('源 IP（留空自动）', 'Source IP (optional)')}
                                        placeholder="1.2.3.4"
                                        value={sourceIp}
                                        onChange={(e) => setSourceIp(e.currentTarget.value)}
                                        disabled={!!busy || !!iface}
                                    />
                                    <TextInput
                                        label={s('网卡（留空自动）', 'Interface (optional)')}
                                        placeholder="eth0"
                                        value={iface}
                                        onChange={(e) => setIface(e.currentTarget.value)}
                                        disabled={!!busy || !!sourceIp}
                                    />
                                </SimpleGrid>
                                <Box className={classes.budgetBanner}>
                                    <Group gap="xs">
                                        <Badge
                                            className={classes.tabular}
                                            color="cyan"
                                            size="sm"
                                            variant="light"
                                        >
                                            ≤ {maxPayloadMib} MiB
                                        </Badge>
                                        <Text size="xs">
                                            {s(
                                                '本轮应用层流量上限（另有握手和重传；短样本不代表峰值带宽）',
                                                'Max payload this run (plus handshakes/retransmissions; short samples are not peak bandwidth)'
                                            )}
                                        </Text>
                                    </Group>
                                </Box>
                            </>
                        )}

                        {kind === 'HARDWARE' && (
                            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                                <NumberInput
                                    label={s(
                                        '每阶段时长上限（秒）',
                                        'Maximum duration per phase (seconds)'
                                    )}
                                    value={seconds}
                                    min={1}
                                    max={15}
                                    allowDecimal={false}
                                    onChange={(v) => setSeconds(Number(v))}
                                    disabled={!!busy}
                                />
                                <NumberInput
                                    label={s('CPU / 内存线程', 'CPU / memory threads')}
                                    value={threads}
                                    min={1}
                                    max={8}
                                    allowDecimal={false}
                                    onChange={(v) => setThreads(Number(v))}
                                    disabled={!!busy}
                                />
                            </SimpleGrid>
                        )}

                        <Divider opacity={0.4} />

                        <Checkbox
                            checked={confirmed}
                            onChange={(e) => setConfirmed(e.currentTarget.checked)}
                            disabled={!!busy}
                            label={s(
                                '我已确认以上资源和流量上限，手动执行本次测试',
                                'I accept the resource and traffic limits for this manual test'
                            )}
                        />

                        <Box className={classes.actionRow}>
                            <Group gap="xs">
                                <Button
                                    color={kind === 'HARDWARE' ? 'orange' : 'cyan'}
                                    leftSection={<TbPlayerPlay size={16} />}
                                    loading={start.isPending}
                                    disabled={
                                        !!busy ||
                                        !confirmed ||
                                        !node.isConnected ||
                                        node.isDisabled ||
                                        !items.length ||
                                        (kind === 'NETWORK' && !selectedCities.length)
                                    }
                                    onClick={() => start.mutate()}
                                >
                                    {s('开始测试', 'Start test')}
                                </Button>
                                {busy && (
                                    <Button
                                        color="red"
                                        variant="light"
                                        leftSection={<TbPlayerStop size={16} />}
                                        loading={cancel.isPending}
                                        onClick={() => cancel.mutate(busy.id)}
                                    >
                                        {s('取消当前测试', 'Cancel active test')}
                                    </Button>
                                )}
                            </Group>

                            <Select
                                className={classes.historySelect}
                                leftSection={<TbHistory size={16} />}
                                label={s('历史记录', 'History')}
                                placeholder={s('暂无测试记录', 'No tests yet')}
                                data={sameKind.map((j) => ({
                                    value: j.id,
                                    label: `${new Date(j.createdAt).toLocaleString(i18n.language)} · ${formatStatus(j.status, s).label}`
                                }))}
                                value={selected?.id || null}
                                onChange={setSelectedId}
                            />
                        </Box>
                    </Stack>
                </Box>

                {selected && (
                    <Box
                        className={clsx(surfaceClasses.subPanel, surfaceClasses.accentTeal)}
                        p="md"
                    >
                        <Stack gap="sm">
                            <Group justify="space-between" wrap="wrap">
                                <Group gap="xs">
                                    <ThemeIcon color="teal" radius="md" size="sm" variant="light">
                                        <TbChartBar size={14} />
                                    </ThemeIcon>
                                    <Text fw={600} size="sm">
                                        {s('测试结果', 'Benchmark results')}
                                    </Text>
                                    <Badge
                                        color={formatStatus(selected.status, s).color}
                                        size="sm"
                                        variant="light"
                                    >
                                        {formatStatus(selected.status, s).label}
                                    </Badge>
                                    {selected.phase && (
                                        <Badge color="gray" size="xs" variant="outline">
                                            {selected.phase}
                                        </Badge>
                                    )}
                                </Group>
                                <Text size="xs" c="dimmed" className={classes.tabular}>
                                    {new Date(selected.createdAt).toLocaleString(i18n.language)}
                                </Text>
                            </Group>

                            {active(selected) && (
                                <Progress
                                    color={kind === 'HARDWARE' ? 'orange' : 'cyan'}
                                    value={selected.progress}
                                    animated
                                    size="sm"
                                    radius="xl"
                                />
                            )}

                            {selected.message && (
                                <Alert color="orange" radius="md">
                                    {selected.message}
                                </Alert>
                            )}

                            {kind === 'NETWORK' ? (
                                <Box className={classes.tableFrame}>
                                    <Table.ScrollContainer minWidth={720}>
                                        <Table
                                            className={classes.table}
                                            highlightOnHover
                                            verticalSpacing="sm"
                                            horizontalSpacing="md"
                                        >
                                            <Table.Thead>
                                                <Table.Tr>
                                                    <Table.Th>{s('目标城市', 'City')}</Table.Th>
                                                    <Table.Th ta="right">
                                                        TCP p50 / p95 (ms)
                                                    </Table.Th>
                                                    <Table.Th ta="right">
                                                        {s('连接失败率', 'TCP failure')}
                                                    </Table.Th>
                                                    <Table.Th className={classes.speedCell}>
                                                        {s('下载速率', 'Download')}
                                                    </Table.Th>
                                                    <Table.Th className={classes.speedCell}>
                                                        {s('上传速率', 'Upload')}
                                                    </Table.Th>
                                                    <Table.Th>{s('状态', 'Status')}</Table.Th>
                                                </Table.Tr>
                                            </Table.Thead>
                                            <Table.Tbody>
                                                {selected.results.map((r, idx) => {
                                                    const latency = record(r.metrics.latency)
                                                    const dl = record(r.metrics.download)
                                                    const ul = record(r.metrics.upload)
                                                    const dlMbps =
                                                        typeof dl.mbps === 'number' ? dl.mbps : null
                                                    const ulMbps =
                                                        typeof ul.mbps === 'number' ? ul.mbps : null
                                                    const rowStatus = formatStatus(r.status, s)
                                                    const failPct =
                                                        typeof latency.tcpFailurePercent ===
                                                        'number'
                                                            ? latency.tcpFailurePercent
                                                            : null

                                                    return (
                                                        <Table.Tr key={idx}>
                                                            <Table.Td>
                                                                <Text fw={550} size="sm">
                                                                    {zh
                                                                        ? (cities[r.name] ?? r.name)
                                                                        : r.name}
                                                                </Text>
                                                            </Table.Td>
                                                            <Table.Td
                                                                className={classes.tabular}
                                                                ta="right"
                                                            >
                                                                <Text size="sm">
                                                                    {value(latency.p50Ms)} /{' '}
                                                                    <Text c="dimmed" span>
                                                                        {value(latency.p95Ms)}
                                                                    </Text>
                                                                </Text>
                                                            </Table.Td>
                                                            <Table.Td
                                                                className={classes.tabular}
                                                                ta="right"
                                                            >
                                                                {failPct !== null ? (
                                                                    <Badge
                                                                        color={
                                                                            failPct > 0
                                                                                ? 'orange'
                                                                                : 'gray'
                                                                        }
                                                                        size="xs"
                                                                        variant="light"
                                                                    >
                                                                        {value(failPct, 0)}%
                                                                    </Badge>
                                                                ) : (
                                                                    '—'
                                                                )}
                                                            </Table.Td>
                                                            <Table.Td className={classes.speedCell}>
                                                                <Text
                                                                    className={classes.tabular}
                                                                    fw={600}
                                                                    size="sm"
                                                                >
                                                                    {dlMbps !== null
                                                                        ? `${value(dlMbps)} Mbps`
                                                                        : '—'}
                                                                </Text>
                                                                {dlMbps !== null && (
                                                                    <Box
                                                                        className={
                                                                            classes.speedBarTrack
                                                                        }
                                                                    >
                                                                        <Box
                                                                            className={
                                                                                classes.speedBarFill
                                                                            }
                                                                            style={{
                                                                                width: `${Math.min(100, (dlMbps / maxMbps) * 100)}%`,
                                                                                backgroundColor:
                                                                                    'var(--mantine-color-cyan-5)'
                                                                            }}
                                                                        />
                                                                    </Box>
                                                                )}
                                                            </Table.Td>
                                                            <Table.Td className={classes.speedCell}>
                                                                <Text
                                                                    c={
                                                                        ul.status === 'UNSUPPORTED'
                                                                            ? 'dimmed'
                                                                            : undefined
                                                                    }
                                                                    className={classes.tabular}
                                                                    fw={
                                                                        ul.status === 'UNSUPPORTED'
                                                                            ? 400
                                                                            : 600
                                                                    }
                                                                    size="sm"
                                                                >
                                                                    {ul.status === 'UNSUPPORTED'
                                                                        ? s('不支持', 'Unsupported')
                                                                        : ulMbps !== null
                                                                          ? `${value(ulMbps)} Mbps`
                                                                          : '—'}
                                                                </Text>
                                                                {ulMbps !== null &&
                                                                    ul.status !== 'UNSUPPORTED' && (
                                                                        <Box
                                                                            className={
                                                                                classes.speedBarTrack
                                                                            }
                                                                        >
                                                                            <Box
                                                                                className={
                                                                                    classes.speedBarFill
                                                                                }
                                                                                style={{
                                                                                    width: `${Math.min(100, (ulMbps / maxMbps) * 100)}%`,
                                                                                    backgroundColor:
                                                                                        'var(--mantine-color-teal-5)'
                                                                                }}
                                                                            />
                                                                        </Box>
                                                                    )}
                                                            </Table.Td>
                                                            <Table.Td>
                                                                <Badge
                                                                    color={rowStatus.color}
                                                                    size="xs"
                                                                    variant="light"
                                                                >
                                                                    {rowStatus.label}
                                                                </Badge>
                                                                {Object.entries(r.metrics).map(
                                                                    ([phase, metric]) => {
                                                                        const detail =
                                                                            record(metric)
                                                                        return detail.status ===
                                                                            'FAILED' &&
                                                                            typeof detail.message ===
                                                                                'string' ? (
                                                                            <Text
                                                                                key={phase}
                                                                                mt={2}
                                                                                size="xs"
                                                                                c="red"
                                                                            >
                                                                                {phase}:{' '}
                                                                                {detail.message}
                                                                            </Text>
                                                                        ) : null
                                                                    }
                                                                )}
                                                            </Table.Td>
                                                        </Table.Tr>
                                                    )
                                                })}
                                            </Table.Tbody>
                                        </Table>
                                    </Table.ScrollContainer>
                                </Box>
                            ) : (
                                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                                    {selected.results.map((r) => {
                                        const itemStatus = formatStatus(r.status, s)
                                        const isDisk = r.name !== 'cpu' && r.name !== 'memory'
                                        return (
                                            <Box
                                                className={surfaceClasses.metricBlock}
                                                key={r.name}
                                                style={
                                                    isDisk ? { gridColumn: '1 / -1' } : undefined
                                                }
                                            >
                                                <Stack gap="xs">
                                                    <Group justify="space-between" wrap="nowrap">
                                                        <Group gap={6}>
                                                            <ThemeIcon
                                                                color={
                                                                    r.name === 'cpu'
                                                                        ? 'orange'
                                                                        : r.name === 'memory'
                                                                          ? 'cyan'
                                                                          : 'violet'
                                                                }
                                                                radius="sm"
                                                                size="xs"
                                                                variant="light"
                                                            >
                                                                {isDisk ? (
                                                                    <TbDatabase size={12} />
                                                                ) : (
                                                                    <TbCpu size={12} />
                                                                )}
                                                            </ThemeIcon>
                                                            <Text fw={600} size="xs">
                                                                {formatHardwareItem(r.name, s)}
                                                            </Text>
                                                        </Group>
                                                        <Badge
                                                            color={itemStatus.color}
                                                            size="xs"
                                                            variant="light"
                                                        >
                                                            {itemStatus.label}
                                                        </Badge>
                                                    </Group>

                                                    {r.name === 'cpu' ? (
                                                        <Text className={classes.metricValue}>
                                                            {value(r.metrics.eventsPerSecond)}{' '}
                                                            <Text
                                                                c="dimmed"
                                                                fw={500}
                                                                size="xs"
                                                                span
                                                            >
                                                                events/s
                                                            </Text>
                                                        </Text>
                                                    ) : r.name === 'memory' ? (
                                                        <Text className={classes.metricValue}>
                                                            {value(r.metrics.mibPerSecond)}{' '}
                                                            <Text
                                                                c="dimmed"
                                                                fw={500}
                                                                size="xs"
                                                                span
                                                            >
                                                                MiB/s
                                                            </Text>
                                                        </Text>
                                                    ) : (
                                                        <SimpleGrid
                                                            cols={{ base: 2, sm: 4 }}
                                                            spacing="xs"
                                                        >
                                                            {[
                                                                'write',
                                                                'read',
                                                                'randwrite',
                                                                'randread'
                                                            ].map((k) => {
                                                                const m = record(r.metrics[k])
                                                                return (
                                                                    <Box
                                                                        className={
                                                                            surfaceClasses.subPanel
                                                                        }
                                                                        key={k}
                                                                        p="xs"
                                                                    >
                                                                        <Text
                                                                            c="dimmed"
                                                                            size="11px"
                                                                        >
                                                                            {formatDiskMode(k, s)}
                                                                        </Text>
                                                                        <Text
                                                                            className={
                                                                                classes.tabular
                                                                            }
                                                                            fw={650}
                                                                            size="sm"
                                                                        >
                                                                            {typeof m.bytesPerSecond ===
                                                                            'number'
                                                                                ? value(
                                                                                      m.bytesPerSecond /
                                                                                          1048576
                                                                                  )
                                                                                : '—'}{' '}
                                                                            MiB/s
                                                                        </Text>
                                                                        <Text
                                                                            c="dimmed"
                                                                            className={
                                                                                classes.tabular
                                                                            }
                                                                            size="11px"
                                                                        >
                                                                            {value(m.iops, 0)} IOPS
                                                                        </Text>
                                                                    </Box>
                                                                )
                                                            })}
                                                        </SimpleGrid>
                                                    )}

                                                    {r.message && (
                                                        <Text c="red" size="xs">
                                                            {r.message}
                                                        </Text>
                                                    )}
                                                </Stack>
                                            </Box>
                                        )
                                    })}
                                </SimpleGrid>
                            )}

                            <Accordion radius="md" variant="contained">
                                <Accordion.Item value="details">
                                    <Accordion.Control>
                                        <Text fw={500} size="xs">
                                            {s(
                                                '详细结果和测试参数',
                                                'Detailed results and parameters'
                                            )}
                                        </Text>
                                    </Accordion.Control>
                                    <Accordion.Panel>
                                        <JsonEditor
                                            collapse={2}
                                            data={{
                                                request: selected.request,
                                                results: selected.results
                                            }}
                                            indent={2}
                                            maxWidth="100%"
                                            rootName=""
                                            theme={githubDarkTheme}
                                            viewOnly
                                        />
                                    </Accordion.Panel>
                                </Accordion.Item>
                                {lastComparable && (
                                    <Accordion.Item value="comparison">
                                        <Accordion.Control>
                                            <Group gap="xs">
                                                <Text fw={500} size="xs">
                                                    {s(
                                                        '上次相同参数结果',
                                                        'Previous result with the same settings'
                                                    )}
                                                </Text>
                                                <Text
                                                    c="dimmed"
                                                    className={classes.tabular}
                                                    size="xs"
                                                >
                                                    {new Date(
                                                        lastComparable.createdAt
                                                    ).toLocaleString(i18n.language)}
                                                </Text>
                                            </Group>
                                        </Accordion.Control>
                                        <Accordion.Panel>
                                            <JsonEditor
                                                collapse={2}
                                                data={lastComparable.results}
                                                indent={2}
                                                maxWidth="100%"
                                                rootName=""
                                                theme={githubDarkTheme}
                                                viewOnly
                                            />
                                        </Accordion.Panel>
                                    </Accordion.Item>
                                )}
                            </Accordion>
                        </Stack>
                    </Box>
                )}

                {kind === 'NETWORK' && (
                    <Accordion radius="md" variant="contained">
                        <Accordion.Item value="targets">
                            <Accordion.Control icon={<TbSettings size={16} />}>
                                <Text fw={600} size="sm">
                                    {s('管理城市测速端点', 'Manage city endpoints')}
                                </Text>
                            </Accordion.Control>
                            <Accordion.Panel>
                                <Stack gap="sm">
                                    <Text c="dimmed" size="xs">
                                        {s(
                                            '填写对应城市运营方明确提供的 HTTP(S) 测速接口，优先 HTTPS；上传接口可留空。不使用就近 CDN 冒充目标城市。',
                                            'Use operator-provided HTTP(S) test endpoints in the selected city, preferably HTTPS. Upload is optional. Do not substitute a nearby CDN for the target city.'
                                        )}
                                    </Text>
                                    <Select
                                        label={s('选择城市端点', 'City')}
                                        value={draft?.id || null}
                                        data={cityOptions}
                                        onChange={(id) => {
                                            const target = targets.data?.find(
                                                (item) => item.id === id
                                            )
                                            setDraft(target ? { ...target } : null)
                                        }}
                                    />
                                    {draft && (
                                        <Box className={surfaceClasses.subPanel} p="sm">
                                            <Stack gap="xs">
                                                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                                                    <TextInput
                                                        label={s('运营方', 'Operator')}
                                                        value={draft.provider}
                                                        onChange={(e) =>
                                                            setDraft({
                                                                ...draft,
                                                                provider: e.currentTarget.value
                                                            })
                                                        }
                                                    />
                                                    <TextInput
                                                        label={s(
                                                            '测速说明 / 政策 URL',
                                                            'Operator test / policy URL'
                                                        )}
                                                        value={draft.policyUrl}
                                                        onChange={(e) =>
                                                            setDraft({
                                                                ...draft,
                                                                policyUrl: e.currentTarget.value
                                                            })
                                                        }
                                                    />
                                                </SimpleGrid>
                                                <TextInput
                                                    label={s('下载 URL', 'Download URL')}
                                                    value={draft.downloadUrl}
                                                    onChange={(e) =>
                                                        setDraft({
                                                            ...draft,
                                                            downloadUrl: e.currentTarget.value
                                                        })
                                                    }
                                                />
                                                <TextInput
                                                    label={s(
                                                        '上传 URL（可选）',
                                                        'Upload URL (optional)'
                                                    )}
                                                    value={draft.uploadUrl}
                                                    onChange={(e) =>
                                                        setDraft({
                                                            ...draft,
                                                            uploadUrl: e.currentTarget.value
                                                        })
                                                    }
                                                />
                                                <Group justify="flex-end">
                                                    <Button
                                                        color="teal"
                                                        leftSection={<TbDeviceFloppy size={16} />}
                                                        loading={update.isPending}
                                                        onClick={() => update.mutate(draft)}
                                                        size="xs"
                                                        variant="light"
                                                    >
                                                        {s('保存端点', 'Save endpoint')}
                                                    </Button>
                                                </Group>
                                            </Stack>
                                        </Box>
                                    )}
                                </Stack>
                            </Accordion.Panel>
                        </Accordion.Item>
                    </Accordion>
                )}
            </Stack>
        </Modal>
    )
})
