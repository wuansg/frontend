import NiceModal, { useModal } from '@ebay/nice-modal-react'
import {
    Alert,
    Badge,
    Button,
    Group,
    Modal,
    NumberInput,
    Select,
    Stack,
    Table,
    Tabs,
    Text,
    TextInput
} from '@mantine/core'
import { modals } from '@mantine/modals'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TbShieldSearch } from 'react-icons/tb'

import { useNiceMantineModal } from '@shared/_modals/use-nice-modal'
import { useGetNodes } from '@shared/api/hooks'
import { DatePickerInput } from '@shared/ui/date-time-picker'
import { BaseOverlayHeader } from '@shared/ui/overlays/base-overlay-header'

import { auditAPI, type AuditFilter, formatAuditBytes } from './audit-api'

type Props = { userId?: number }
const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e))

export const UserAccessAuditModal = NiceModal.create(({ userId }: Props) => {
    const { i18n } = useTranslation()
    const zh = i18n.language.startsWith('zh')
    const s = (cn: string, en: string) => (zh ? cn : en)
    const modal = useModal()
    const { modalProps } = useNiceMantineModal({ modal })
    const cache = useQueryClient()
    const allNodes = useGetNodes()
    const [selectedUser, setSelectedUser] = useState<number | undefined>(userId)
    const today = new Date().toISOString().slice(0, 10)
    const [dates, setDates] = useState<[string | null, string | null]>([today, today])
    const [domain, setDomain] = useState('')
    const [node, setNode] = useState<string | null>(null)
    const [cursor, setCursor] = useState<string | undefined>()
    const [pages, setPages] = useState<(string | undefined)[]>([])
    const [retention, setRetention] = useState<number | null>(null)
    const policyKey = ['access-audit-policy', selectedUser]
    const policy = useQuery({
        queryKey: policyKey,
        queryFn: () => auditAPI.policy(selectedUser!),
        enabled: Boolean(selectedUser),
        refetchInterval: 15000
    })
    const filter: AuditFilter = {
        userId: selectedUser,
        start: dates[0] ?? today,
        end: dates[1] ?? today,
        domain: domain || undefined,
        nodeUuid: node ?? undefined
    }
    const complete = Boolean(dates[0] && dates[1])
    const records = useQuery({
        queryKey: ['access-audit-records', filter, cursor],
        queryFn: () => auditAPI.records({ ...filter, cursor }),
        enabled: complete,
        refetchInterval: cursor ? false : 15000
    })
    const domains = useQuery({
        queryKey: ['access-audit-domains', filter],
        queryFn: () => auditAPI.domains(filter),
        enabled: complete,
        refetchInterval: 30000
    })
    const save = useMutation({
        mutationFn: (input: { userId: number; enabled: boolean; retentionDays: number }) =>
            auditAPI.set(input.userId, input.enabled, input.retentionDays),
        onSuccess: (p, input) => {
            cache.setQueryData(['access-audit-policy', input.userId], p)
            void cache.invalidateQueries({ queryKey: ['access-audit-records'] })
        }
    })
    const savePolicy = (enabled: boolean) => {
        if (!selectedUser) return
        save.mutate({
            userId: selectedUser,
            enabled,
            retentionDays: retention ?? policy.data?.retentionDays ?? 7
        })
    }
    const resetPage = () => {
        setCursor(undefined)
        setPages([])
    }
    const selectedNodes = policy.data?.nodes ?? []
    const activeNodes = selectedNodes.filter(
        (n) => n.supported && n.connected && n.mode === 'CORE_ACTIVE'
    )
    const minDate = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10)
    const time = (v: string) => new Date(v).toLocaleString(i18n.language, { hour12: false })
    const title = s('访问审计', 'Access audit')
    const confirmEnable = () =>
        modals.openConfirmModal({
            title: s('开启此用户的访问审计？', 'Enable access audit for this user?'),
            children: (
                <Text>
                    {s(
                        `仅为用户 ID ${selectedUser} 保存目标域名/IP、节点、连接时间和上传/下载字节。默认不会补采历史，也不会记录页面内容。`,
                        `Only user ${selectedUser} is opted in. Store target domains/IPs, nodes, connection times and reference bytes, without browsing content or historical backfill.`
                    )}
                </Text>
            ),
            labels: {
                confirm: s('仅开启此用户', 'Enable this user only'),
                cancel: s('取消', 'Cancel')
            },
            onConfirm: () => savePolicy(true)
        })
    return (
        <Modal
            {...modalProps}
            size="min(1100px, 95vw)"
            title={
                <BaseOverlayHeader
                    IconComponent={TbShieldSearch}
                    iconColor="indigo"
                    iconVariant="soft"
                    title={selectedUser ? `${title} #${selectedUser}` : title}
                />
            }
        >
            <Stack>
                <Alert color="blue">
                    {s(
                        '仅显式开启的用户会保存记录。只记录连接目标，不是完整浏览历史；HTTPS 路径/内容及无法识别的域名不可见。连接流量是参考值，不用于扣费，也不是所选日期内的精确流量。',
                        'Only explicitly opted-in users are recorded. These are connection targets, not complete browsing history. HTTPS paths/content and unknown domains are not visible. Bytes are connection-level reference values, not billing or exact traffic within the selected dates.'
                    )}
                </Alert>
                {!userId && (
                    <NumberInput
                        label={s(
                            '用户 ID（留空查询全部已采集记录）',
                            'User ID (empty = all recorded users)'
                        )}
                        value={selectedUser ?? ''}
                        min={1}
                        max={Number.MAX_SAFE_INTEGER}
                        allowDecimal={false}
                        onChange={(v) => {
                            setSelectedUser(typeof v === 'number' ? v : undefined)
                            setRetention(null)
                            resetPage()
                        }}
                    />
                )}
                {selectedUser && (
                    <>
                        <Group justify="space-between" align="end">
                            <Text>
                                {s('审计状态', 'Audit policy')}:{' '}
                                <Badge color={policy.data?.enabled ? 'teal' : 'gray'}>
                                    {policy.data?.enabled
                                        ? s('已开启', 'Enabled')
                                        : s('默认关闭', 'Disabled')}
                                </Badge>
                            </Text>
                            <NumberInput
                                label={s('保存天数', 'Retention days')}
                                min={1}
                                max={30}
                                value={retention ?? policy.data?.retentionDays ?? 7}
                                allowDecimal={false}
                                onChange={(v) => setRetention(typeof v === 'number' ? v : 7)}
                                w={120}
                            />
                            <Button
                                loading={save.isPending}
                                disabled={!policy.data}
                                onClick={() => savePolicy(policy.data!.enabled)}
                            >
                                {s('保存天数', 'Save retention')}
                            </Button>
                            <Button
                                color={policy.data?.enabled ? 'red' : 'teal'}
                                loading={save.isPending}
                                disabled={!policy.data}
                                onClick={() =>
                                    policy.data?.enabled ? savePolicy(false) : confirmEnable()
                                }
                            >
                                {policy.data?.enabled
                                    ? s('停止审计', 'Stop audit')
                                    : s('开启此用户', 'Enable this user')}
                            </Button>
                        </Group>
                        {activeNodes.length === 0 && (
                            <Alert color="yellow">
                                {s(
                                    '还没有支持审计的在线核心节点，需要升级 Agent。纯转发节点不能关联用户和网站。',
                                    'No active core nodes support audit yet; upgrade the Agent. Forwarding-only nodes cannot identify users or sites.'
                                )}
                            </Alert>
                        )}
                        {activeNodes.length > 0 && (
                            <Group gap="xs">
                                {activeNodes.map((n) => {
                                    const fresh =
                                        n.status.expiresAt &&
                                        new Date(n.status.expiresAt) > new Date()
                                    const ok =
                                        policy.data?.enabled &&
                                        n.connected &&
                                        fresh &&
                                        n.status.capturing &&
                                        !n.lastError &&
                                        !n.status.lastError
                                    return (
                                        <Badge key={n.uuid} color={ok ? 'teal' : 'yellow'}>
                                            {n.name}:{' '}
                                            {ok
                                                ? s('采集中', 'Capturing')
                                                : policy.data?.enabled
                                                  ? s('等待同步 / 有缺口', 'Pending / gaps')
                                                  : s('未启用', 'Disabled')}
                                            {n.status.dropped
                                                ? ` · ${s('丢弃', 'Dropped')} ${n.status.dropped}`
                                                : ''}
                                        </Badge>
                                    )
                                })}
                            </Group>
                        )}
                    </>
                )}
                {(policy.error || save.error || records.error || domains.error) && (
                    <Alert color="red">
                        {errorText(policy.error || save.error || records.error || domains.error)}
                    </Alert>
                )}
                <Group align="end" grow>
                    <DatePickerInput
                        type="range"
                        label={s('观察日期（UTC）', 'Observed dates (UTC)')}
                        minDate={minDate}
                        value={dates}
                        onChange={(v) => {
                            setDates(v)
                            resetPage()
                        }}
                    />
                    <TextInput
                        label={s('域名包含', 'Domain contains')}
                        value={domain}
                        maxLength={253}
                        onChange={(e) => {
                            setDomain(e.currentTarget.value)
                            resetPage()
                        }}
                    />
                    <Select
                        label={s('节点', 'Node')}
                        placeholder={s('全部节点', 'All nodes')}
                        clearable
                        searchable
                        value={node}
                        data={(allNodes.data ?? []).map((n) => ({ value: n.uuid, label: n.name }))}
                        onChange={(v) => {
                            setNode(v)
                            resetPage()
                        }}
                    />
                </Group>
                <Tabs defaultValue="records">
                    <Tabs.List>
                        <Tabs.Tab value="records">{s('连接记录', 'Connections')}</Tabs.Tab>
                        <Tabs.Tab value="domains">{s('目标用量排行', 'Target ranking')}</Tabs.Tab>
                    </Tabs.List>
                    <Tabs.Panel value="records" pt="md">
                        <Table.ScrollContainer minWidth={850}>
                            <Table striped highlightOnHover>
                                <Table.Thead>
                                    <Table.Tr>
                                        {[
                                            s('用户 / 节点', 'User / node'),
                                            s('网站 / 目标', 'Domain / target'),
                                            s('时间', 'Time'),
                                            s('协议 / 入站', 'Protocol / inbound'),
                                            s('上传', 'Upload'),
                                            s('下载', 'Download'),
                                            s('状态', 'State')
                                        ].map((h) => (
                                            <Table.Th key={h}>{h}</Table.Th>
                                        ))}
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {(records.data?.records ?? []).map((r) => (
                                        <Table.Tr key={r.id}>
                                            <Table.Td>
                                                <Text size="sm">
                                                    {r.username} (#{r.userId})
                                                </Text>
                                                <Text size="xs" c="dimmed">
                                                    {r.nodeName}
                                                </Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text
                                                    size="sm"
                                                    style={{ overflowWrap: 'anywhere' }}
                                                >
                                                    {r.domain || r.destinationIp || '—'}
                                                </Text>
                                                <Text size="xs" c="dimmed">
                                                    {r.destinationIp ||
                                                        s('域名连接', 'Domain connection')}
                                                    :{r.destinationPort}
                                                </Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="xs">{time(r.startedAt)}</Text>
                                                <Text size="xs" c="dimmed">
                                                    {s('最后观察', 'Last observed')}:{' '}
                                                    {time(r.observedAt)}
                                                </Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="sm">{r.protocol || r.network}</Text>
                                                <Text size="xs" c="dimmed">
                                                    {r.inbound}
                                                </Text>
                                            </Table.Td>
                                            <Table.Td>{formatAuditBytes(r.upload)}</Table.Td>
                                            <Table.Td>{formatAuditBytes(r.download)}</Table.Td>
                                            <Table.Td>
                                                <Badge color={r.closedAt ? 'gray' : 'blue'}>
                                                    {r.closedAt
                                                        ? s('已关闭', 'Closed')
                                                        : s('最后观察为活跃', 'Last seen active')}
                                                </Badge>
                                                {r.partial && (
                                                    <Text size="xs" c="yellow">
                                                        {s(
                                                            '部分记录 / 可能不完整',
                                                            'Partial / may be incomplete'
                                                        )}
                                                    </Text>
                                                )}
                                            </Table.Td>
                                        </Table.Tr>
                                    ))}
                                </Table.Tbody>
                            </Table>
                        </Table.ScrollContainer>
                        {!records.data?.records.length && (
                            <Text ta="center" c="dimmed" py="md">
                                {records.isFetching
                                    ? s('加载中…', 'Loading…')
                                    : s(
                                          '暂无记录；仅开启后才开始保存',
                                          'No records; collection begins only after opt-in'
                                      )}
                            </Text>
                        )}
                        <Group justify="space-between" mt="sm">
                            <Button
                                variant="light"
                                disabled={!pages.length}
                                onClick={() => {
                                    setCursor(pages.at(-1))
                                    setPages(pages.slice(0, -1))
                                }}
                            >
                                {s('上一页', 'Previous')}
                            </Button>
                            <Button
                                variant="light"
                                loading={records.isFetching}
                                onClick={() => void records.refetch()}
                            >
                                {s('刷新', 'Refresh')}
                            </Button>
                            <Button
                                variant="light"
                                disabled={!records.data?.nextCursor}
                                onClick={() => {
                                    setPages([...pages, cursor])
                                    setCursor(records.data!.nextCursor!)
                                }}
                            >
                                {s('下一页', 'Next')}
                            </Button>
                        </Group>
                    </Tabs.Panel>
                    <Tabs.Panel value="domains" pt="md">
                        <Table.ScrollContainer minWidth={500}>
                            <Table striped>
                                <Table.Thead>
                                    <Table.Tr>
                                        {[
                                            s('目标', 'Target'),
                                            s('连接数', 'Connections'),
                                            s('上传', 'Upload'),
                                            s('下载', 'Download'),
                                            s('总量', 'Total')
                                        ].map((h) => (
                                            <Table.Th key={h}>{h}</Table.Th>
                                        ))}
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {(domains.data ?? []).map((r, i) => (
                                        <Table.Tr key={`${r.domain}-${r.destinationIp}`}>
                                            <Table.Td>
                                                {i + 1}. {r.domain || r.destinationIp || '—'}
                                            </Table.Td>
                                            <Table.Td>{r.connections}</Table.Td>
                                            <Table.Td>{formatAuditBytes(r.upload)}</Table.Td>
                                            <Table.Td>{formatAuditBytes(r.download)}</Table.Td>
                                            <Table.Td>
                                                {formatAuditBytes(
                                                    (
                                                        BigInt(r.upload) + BigInt(r.download)
                                                    ).toString()
                                                )}
                                            </Table.Td>
                                        </Table.Tr>
                                    ))}
                                </Table.Tbody>
                            </Table>
                        </Table.ScrollContainer>
                    </Tabs.Panel>
                </Tabs>
            </Stack>
        </Modal>
    )
})
