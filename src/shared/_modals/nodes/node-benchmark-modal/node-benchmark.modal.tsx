import NiceModal, { useModal } from '@ebay/nice-modal-react'
import {
    Accordion,
    Alert,
    Badge,
    Button,
    Checkbox,
    Code,
    Group,
    Modal,
    MultiSelect,
    NumberInput,
    Progress,
    Select,
    Stack,
    Table,
    Text,
    TextInput
} from '@mantine/core'
import {
    BenchmarkJobSchema,
    BenchmarkTargetSchema,
    BENCHMARK_CITIES,
    GetNodeCommand,
    CreateNodeBenchmarkCommand,
    GetNodeBenchmarksCommand,
    CancelNodeBenchmarkCommand,
    GetBenchmarkTargetsCommand,
    UpdateBenchmarkTargetCommand
} from '@remnawave/backend-contract'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TbCpu, TbNetwork } from 'react-icons/tb'
import { z } from 'zod'

import { useNiceMantineModal } from '@shared/_modals/use-nice-modal'
import { instance } from '@shared/api/axios'
import { BaseOverlayHeader } from '@shared/ui/overlays/base-overlay-header'

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
    const cityOptions = (targets.data || []).map((t) => ({
        value: t.id,
        label: `${zh ? cities[t.id] : t.city} · ${t.provider}${!t.uploadUrl ? s('（仅下载）', ' (download only)') : ''}`
    }))
    const title =
        kind === 'HARDWARE'
            ? s('硬件性能测试', 'Hardware benchmark')
            : s('网络测速', 'Network benchmark')
    const requestError =
        start.error || cancel.error || history.error || targets.error || update.error
    return (
        <Modal
            {...modalProps}
            size="min(1100px, 95vw)"
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
                <Text size="sm" c="dimmed">
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
                {requestError && <Alert color="red">{errorText(requestError)}</Alert>}
                <MultiSelect
                    label={s('测试项目', 'Test items')}
                    value={items}
                    onChange={setItems}
                    disabled={!!busy}
                    data={
                        kind === 'HARDWARE'
                            ? [
                                  { value: 'cpu', label: 'CPU' },
                                  { value: 'memory', label: s('内存吞吐', 'Memory throughput') },
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
                        <Group grow>
                            <Select
                                label={s('地址族', 'Address family')}
                                value={family}
                                onChange={(v) => setFamily(v || 'IPv4')}
                                data={['IPv4', 'IPv6']}
                                disabled={!!busy}
                            />
                            <NumberInput
                                label={s('每方向流量上限（MiB）', 'Limit per direction (MiB)')}
                                value={mib}
                                min={1}
                                max={256}
                                allowDecimal={false}
                                onChange={(v) => setMib(Number(v))}
                                disabled={!!busy}
                            />
                        </Group>
                        <Group grow>
                            <TextInput
                                label={s('源 IP（留空自动）', 'Source IP (optional)')}
                                value={sourceIp}
                                onChange={(e) => setSourceIp(e.currentTarget.value)}
                                disabled={!!busy || !!iface}
                            />
                            <TextInput
                                label={s('网卡（留空自动）', 'Interface (optional)')}
                                value={iface}
                                onChange={(e) => setIface(e.currentTarget.value)}
                                disabled={!!busy || !!sourceIp}
                            />
                        </Group>
                        <Text size="sm">
                            {s('本轮应用层流量最多', 'Maximum payload this run')}:{' '}
                            {selectedCities.length *
                                mib *
                                (Number(items.includes('download')) +
                                    Number(items.includes('upload')))}{' '}
                            MiB{' '}
                            {s(
                                '（另有握手和重传；短样本不代表峰值带宽）',
                                '(plus handshakes/retransmissions; short samples are not peak bandwidth)'
                            )}
                        </Text>
                    </>
                )}
                <Group grow>
                    <NumberInput
                        label={s('每阶段时长上限（秒）', 'Maximum duration per phase (seconds)')}
                        value={seconds}
                        min={1}
                        max={15}
                        allowDecimal={false}
                        onChange={(v) => setSeconds(Number(v))}
                        disabled={!!busy}
                    />
                    {kind === 'HARDWARE' && (
                        <NumberInput
                            label={s('CPU / 内存线程', 'CPU / memory threads')}
                            value={threads}
                            min={1}
                            max={8}
                            allowDecimal={false}
                            onChange={(v) => setThreads(Number(v))}
                            disabled={!!busy}
                        />
                    )}
                </Group>
                <Checkbox
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.currentTarget.checked)}
                    disabled={!!busy}
                    label={s(
                        '我已确认以上资源和流量上限，手动执行本次测试',
                        'I accept the resource and traffic limits for this manual test'
                    )}
                />
                <Group>
                    <Button
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
                            loading={cancel.isPending}
                            onClick={() => cancel.mutate(busy.id)}
                        >
                            {s('取消当前测试', 'Cancel active test')}
                        </Button>
                    )}
                </Group>
                {selected && (
                    <>
                        <Group>
                            <Badge
                                color={
                                    active(selected)
                                        ? 'blue'
                                        : selected.status === 'COMPLETED'
                                          ? 'green'
                                          : 'orange'
                                }
                            >
                                {selected.status}
                            </Badge>
                            <Text size="sm">{selected.phase}</Text>
                            <Text size="sm" c="dimmed">
                                {new Date(selected.createdAt).toLocaleString(i18n.language)}
                            </Text>
                        </Group>
                        <Progress value={selected.progress} animated={active(selected)} />
                        {selected.message && <Alert color="orange">{selected.message}</Alert>}
                        {kind === 'NETWORK' ? (
                            <Table.ScrollContainer minWidth={700}>
                                <Table striped>
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>{s('城市', 'City')}</Table.Th>
                                            <Table.Th>TCP p50 / p95 ms</Table.Th>
                                            <Table.Th>
                                                {s('连接失败率', 'TCP failure rate')}
                                            </Table.Th>
                                            <Table.Th>{s('下载 Mbps', 'Download Mbps')}</Table.Th>
                                            <Table.Th>{s('上传 Mbps', 'Upload Mbps')}</Table.Th>
                                            <Table.Th>{s('状态', 'Status')}</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {selected.results.map((r, idx) => {
                                            const latency = record(r.metrics.latency),
                                                dl = record(r.metrics.download),
                                                ul = record(r.metrics.upload)
                                            return (
                                                <Table.Tr key={idx}>
                                                    <Table.Td>{r.name}</Table.Td>
                                                    <Table.Td>
                                                        {value(latency.p50Ms)} /{' '}
                                                        {value(latency.p95Ms)}
                                                    </Table.Td>
                                                    <Table.Td>
                                                        {typeof latency.tcpFailurePercent ===
                                                        'number'
                                                            ? `${value(latency.tcpFailurePercent, 0)}%`
                                                            : '—'}
                                                    </Table.Td>
                                                    <Table.Td>{value(dl.mbps)}</Table.Td>
                                                    <Table.Td>
                                                        {ul.status === 'UNSUPPORTED'
                                                            ? s('不支持', 'Unsupported')
                                                            : value(ul.mbps)}
                                                    </Table.Td>
                                                    <Table.Td>
                                                        {r.status}
                                                        {Object.entries(r.metrics).map(
                                                            ([phase, metric]) => {
                                                                const detail = record(metric)
                                                                return detail.status === 'FAILED' &&
                                                                    typeof detail.message ===
                                                                        'string' ? (
                                                                    <Text
                                                                        key={phase}
                                                                        size="xs"
                                                                        c="red"
                                                                    >
                                                                        {phase}: {detail.message}
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
                        ) : (
                            <Table>
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>{s('项目', 'Item')}</Table.Th>
                                        <Table.Th>{s('结果', 'Result')}</Table.Th>
                                        <Table.Th>{s('状态', 'Status')}</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {selected.results.map((r) => (
                                        <Table.Tr key={r.name}>
                                            <Table.Td>{r.name}</Table.Td>
                                            <Table.Td>
                                                {r.name === 'cpu'
                                                    ? `${value(r.metrics.eventsPerSecond)} events/s`
                                                    : r.name === 'memory'
                                                      ? `${value(r.metrics.mibPerSecond)} MiB/s`
                                                      : [
                                                            'write',
                                                            'read',
                                                            'randwrite',
                                                            'randread'
                                                        ].map((k) => {
                                                            const m = record(r.metrics[k])
                                                            return (
                                                                <Text size="sm" key={k}>
                                                                    {k}:{' '}
                                                                    {typeof m.bytesPerSecond ===
                                                                    'number'
                                                                        ? value(
                                                                              m.bytesPerSecond /
                                                                                  1048576
                                                                          )
                                                                        : '—'}{' '}
                                                                    MiB/s · {value(m.iops)} IOPS
                                                                </Text>
                                                            )
                                                        })}
                                                {r.message && (
                                                    <Text c="red" size="sm">
                                                        {r.message}
                                                    </Text>
                                                )}
                                            </Table.Td>
                                            <Table.Td>{r.status}</Table.Td>
                                        </Table.Tr>
                                    ))}
                                </Table.Tbody>
                            </Table>
                        )}
                        <Accordion>
                            <Accordion.Item value="details">
                                <Accordion.Control>
                                    {s('详细结果和测试参数', 'Detailed results and parameters')}
                                </Accordion.Control>
                                <Accordion.Panel>
                                    <Code block>
                                        {JSON.stringify(
                                            {
                                                request: selected.request,
                                                results: selected.results
                                            },
                                            null,
                                            2
                                        )}
                                    </Code>
                                </Accordion.Panel>
                            </Accordion.Item>
                            {lastComparable && (
                                <Accordion.Item value="comparison">
                                    <Accordion.Control>
                                        {s(
                                            '上次相同参数结果',
                                            'Previous result with the same settings'
                                        )}
                                    </Accordion.Control>
                                    <Accordion.Panel>
                                        <Text>
                                            {new Date(lastComparable.createdAt).toLocaleString(
                                                i18n.language
                                            )}
                                        </Text>
                                        <Code block>
                                            {JSON.stringify(lastComparable.results, null, 2)}
                                        </Code>
                                    </Accordion.Panel>
                                </Accordion.Item>
                            )}
                        </Accordion>
                    </>
                )}
                <Select
                    label={s('历史记录', 'History')}
                    placeholder={s('暂无测试', 'No tests yet')}
                    data={sameKind.map((j) => ({
                        value: j.id,
                        label: `${new Date(j.createdAt).toLocaleString(i18n.language)} · ${j.status}`
                    }))}
                    value={selected?.id || null}
                    onChange={setSelectedId}
                />
                {kind === 'NETWORK' && (
                    <Accordion>
                        <Accordion.Item value="targets">
                            <Accordion.Control>
                                {s('管理城市测速端点', 'Manage city endpoints')}
                            </Accordion.Control>
                            <Accordion.Panel>
                                <Stack>
                                    <Text size="sm">
                                        {s(
                                            '填写对应城市运营方明确提供的 HTTP(S) 测速接口，优先 HTTPS；上传接口可留空。不使用就近 CDN 冒充目标城市。',
                                            'Use operator-provided HTTP(S) test endpoints in the selected city, preferably HTTPS. Upload is optional. Do not substitute a nearby CDN for the target city.'
                                        )}
                                    </Text>
                                    <Select
                                        label={s('城市', 'City')}
                                        value={draft?.id || null}
                                        data={cityOptions}
                                        onChange={(id) => {
                                            const t = targets.data?.find((t) => t.id === id)
                                            setDraft(t ? { ...t } : null)
                                        }}
                                    />
                                    {draft && (
                                        <>
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
                                            <Button
                                                loading={update.isPending}
                                                onClick={() => update.mutate(draft)}
                                            >
                                                {s('保存端点', 'Save endpoint')}
                                            </Button>
                                        </>
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
