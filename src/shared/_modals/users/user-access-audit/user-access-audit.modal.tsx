import NiceModal, { useModal } from '@ebay/nice-modal-react'
import {
    Accordion,
    Alert,
    Badge,
    Box,
    Button,
    Group,
    Loader,
    Modal,
    NumberInput,
    Select,
    SimpleGrid,
    Stack,
    Tabs,
    Text,
    TextInput,
    ThemeIcon
} from '@mantine/core'
import { modals } from '@mantine/modals'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
    TbArrowDown,
    TbArrowLeft,
    TbArrowRight,
    TbArrowUp,
    TbCalendar,
    TbChartBar,
    TbDownload,
    TbListDetails,
    TbRefresh,
    TbSearch,
    TbShieldSearch,
    TbWorld
} from 'react-icons/tb'

import { useNiceMantineModal } from '@shared/_modals/use-nice-modal'
import { useGetNodes } from '@shared/api/hooks'
import { DatePickerInput } from '@shared/ui/date-time-picker'

import { auditAPI, type AuditFilter, formatAuditBytes } from './audit-api'
import { AuditConnections, AuditRanking } from './audit-results'
import classes from './user-access-audit.module.css'

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
    const [expiryMode, setExpiryMode] = useState<string>('keep')
    const [direction, setDirection] = useState<'total' | 'upload' | 'download'>('total')
    const policy = useQuery({
        queryKey: ['access-audit-policy', selectedUser],
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
        queryKey: ['access-audit-domains', filter, direction],
        queryFn: () => auditAPI.domains({ ...filter, direction }),
        enabled: complete,
        refetchInterval: 30000
    })
    const rangeSummary = useQuery({
        queryKey: ['access-audit-summary', filter],
        queryFn: () => auditAPI.summary(filter),
        enabled: complete,
        refetchInterval: 30000
    })
    const exportCsv = useMutation({
        mutationFn: () => auditAPI.export(filter),
        onSuccess: (blob) => {
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `access-audit-${filter.start}-${filter.end}.csv`
            link.click()
            setTimeout(() => URL.revokeObjectURL(url), 1000)
        }
    })
    const save = useMutation({
        mutationFn: (input: {
            userId: number
            enabled: boolean
            retentionDays: number
            enabledUntil?: string | null
        }) => auditAPI.set(input.userId, input.enabled, input.retentionDays, input.enabledUntil),
        onSuccess: (p, input) => {
            cache.setQueryData(['access-audit-policy', input.userId], p)
            void cache.invalidateQueries({ queryKey: ['access-audit-records'] })
            void cache.invalidateQueries({ queryKey: ['access-audit-summary'] })
            void cache.invalidateQueries({ queryKey: ['access-audit-domains'] })
            setExpiryMode('keep')
            setRetention(null)
        }
    })
    const savePolicy = (enabled: boolean) => {
        if (!selectedUser) return
        save.mutate({
            userId: selectedUser,
            enabled,
            retentionDays: retention ?? policy.data?.retentionDays ?? 7,
            ...(expiryMode === 'keep'
                ? {}
                : {
                      enabledUntil:
                          expiryMode === 'none'
                              ? null
                              : new Date(Date.now() + Number(expiryMode) * 60000).toISOString()
                  })
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
    const capturing = (n: (typeof selectedNodes)[number]) =>
        Boolean(
            policy.data?.enabled &&
            n.connected &&
            n.status.expiresAt &&
            new Date(n.status.expiresAt) > new Date() &&
            n.status.capturing &&
            !n.lastError &&
            !n.status.lastError
        )
    const capturingCount = activeNodes.filter(capturing).length
    const summary = useMemo(() => {
        const page = records.data?.records ?? []
        return {
            count: page.length,
            targets: new Set(page.map((r) => r.domain || r.destinationIp).filter(Boolean)).size,
            upload: page.reduce((total, r) => total + BigInt(r.upload), 0n).toString(),
            download: page.reduce((total, r) => total + BigInt(r.download), 0n).toString()
        }
    }, [records.data])
    const minDate = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10)
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
    const empty = (loading: boolean, failed: boolean, ranking = false) => (
        <Stack className={classes.empty} align="center" gap="sm" role="status">
            {loading ? (
                <Loader size="sm" />
            ) : (
                <ThemeIcon color="gray" variant="light" radius="xl" size={44}>
                    <TbShieldSearch size={22} />
                </ThemeIcon>
            )}
            <Text size="sm" fw={500}>
                {!complete
                    ? s('请选择完整的日期范围', 'Select a complete date range')
                    : loading
                      ? s('正在加载审计记录…', 'Loading audit records…')
                      : failed
                        ? s('暂时无法加载，请重试', 'Unable to load; please retry')
                        : ranking
                          ? s('暂无目标用量', 'No target usage yet')
                          : s('暂无匹配的连接记录', 'No matching connections')}
            </Text>
            {complete && !loading && !failed && (
                <Text size="xs" c="dimmed">
                    {s(
                        '仅开启后才开始保存；可以调整日期、域名或节点筛选。',
                        'Collection starts only after opt-in. Try adjusting dates, domain or node filters.'
                    )}
                </Text>
            )}
        </Stack>
    )

    return (
        <Modal
            {...modalProps}
            size="min(1240px, 96vw)"
            classNames={{ body: classes.body, header: classes.header }}
            title={
                <Group gap="sm" wrap="nowrap">
                    <ThemeIcon color="indigo" variant="light" size="lg">
                        <TbShieldSearch size={20} />
                    </ThemeIcon>
                    <Text component="h2" size="lg" fw={600}>
                        {selectedUser ? `${title} #${selectedUser}` : title}
                    </Text>
                </Group>
            }
        >
            <Stack gap="md">
                <Alert color="indigo" icon={<TbShieldSearch size={18} />} radius="lg">
                    <Text size="xs">
                        {s(
                            '仅显式开启的用户会保存记录。只记录连接目标，不是完整浏览历史；HTTPS 路径/内容及无法识别的域名不可见。流量为连接级参考值，不用于扣费，也不是所选日期内的精确流量。',
                            'Only opted-in users are recorded. These are connection targets, not complete browsing history; HTTPS paths/content and unknown domains are not visible. Bytes are connection-level reference values, not billing or exact traffic within the selected dates.'
                        )}
                    </Text>
                </Alert>
                {selectedUser && (
                    <Box className={classes.section}>
                        <Box className={classes.policyHeader}>
                            <Stack gap={5}>
                                <Group gap="xs">
                                    <Text size="sm" fw={600}>
                                        {s('审计设置', 'Audit settings')}
                                    </Text>
                                    <Badge
                                        color={policy.data?.enabled ? 'teal' : 'gray'}
                                        variant="light"
                                    >
                                        {policy.isPending
                                            ? s('加载中', 'Loading')
                                            : policy.error
                                              ? s('状态不可用', 'Unavailable')
                                              : policy.data?.enabled
                                                ? s('已开启', 'Enabled')
                                                : s('默认关闭', 'Disabled')}
                                    </Badge>
                                </Group>
                                <Text size="xs" c="dimmed">
                                    {s(
                                        `仅作用于用户 #${selectedUser}，不会开启其他用户的审计。`,
                                        `Applies only to user #${selectedUser}; other users are not opted in.`
                                    )}
                                </Text>
                            </Stack>
                            <Box className={classes.policyControls}>
                                <NumberInput
                                    label={s('保存天数', 'Retention days')}
                                    min={1}
                                    max={30}
                                    value={retention ?? policy.data?.retentionDays ?? 7}
                                    allowDecimal={false}
                                    onChange={(v) => setRetention(typeof v === 'number' ? v : 7)}
                                    className={classes.retention}
                                />
                                <Button
                                    variant="default"
                                    loading={save.isPending}
                                    disabled={!policy.data}
                                    onClick={() => savePolicy(policy.data!.enabled)}
                                >
                                    {s('保存天数', 'Save retention')}
                                </Button>
                                <Select
                                    label={s('自动停止', 'Auto-stop')}
                                    value={expiryMode}
                                    onChange={(value) => setExpiryMode(value ?? 'keep')}
                                    data={[
                                        {
                                            value: 'keep',
                                            label: s('保留当前设置', 'Keep current setting')
                                        },
                                        {
                                            value: 'none',
                                            label: s('不自动停止', 'No automatic stop')
                                        },
                                        { value: '60', label: s('1 小时后', 'After 1 hour') },
                                        { value: '1440', label: s('24 小时后', 'After 24 hours') },
                                        { value: '10080', label: s('7 天后', 'After 7 days') }
                                    ]}
                                />
                                <Button
                                    color={policy.data?.enabled ? 'red' : 'teal'}
                                    variant={policy.data?.enabled ? 'light' : 'filled'}
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
                            </Box>
                        </Box>
                        {policy.data?.enabledUntil && (
                            <Text size="xs" c="dimmed" mt="xs">
                                {s('自动停止时间：', 'Auto-stop at: ')}
                                {new Date(policy.data.enabledUntil).toLocaleString(i18n.language)}
                                {' · '}
                                {s(
                                    '停止后历史仍按保存天数保留。',
                                    'History remains available until retention expiry.'
                                )}
                            </Text>
                        )}
                        {policy.data && activeNodes.length === 0 && (
                            <Alert color="yellow" mt="md" radius="md">
                                {s(
                                    '还没有支持审计的在线核心节点，需要升级 Agent。纯转发节点不能关联用户和网站。',
                                    'No active core nodes support audit yet; upgrade the Agent. Forwarding-only nodes cannot identify users or sites.'
                                )}
                            </Alert>
                        )}
                        {activeNodes.length > 0 && (
                            <Accordion variant="default" mt="sm">
                                <Accordion.Item value="nodes">
                                    <Accordion.Control>
                                        <Group gap="sm">
                                            <Text size="xs" fw={500}>
                                                {s('节点采集状态', 'Node collection status')}
                                            </Text>
                                            <Badge
                                                size="sm"
                                                variant="light"
                                                color={
                                                    !policy.data?.enabled
                                                        ? 'gray'
                                                        : capturingCount === activeNodes.length
                                                          ? 'teal'
                                                          : 'yellow'
                                                }
                                            >
                                                {policy.data?.enabled
                                                    ? `${capturingCount} / ${activeNodes.length} ${s('采集中', 'capturing')}`
                                                    : s('未启用', 'Disabled')}
                                            </Badge>
                                        </Group>
                                    </Accordion.Control>
                                    <Accordion.Panel>
                                        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="xs">
                                            {activeNodes.map((n) => (
                                                <Box key={n.uuid} className={classes.nodeCard}>
                                                    <Text
                                                        size="xs"
                                                        fw={500}
                                                        className={classes.wrap}
                                                    >
                                                        {n.name}
                                                    </Text>
                                                    <Text
                                                        size="xs"
                                                        c={
                                                            capturing(n)
                                                                ? 'teal'
                                                                : policy.data?.enabled
                                                                  ? 'yellow'
                                                                  : 'dimmed'
                                                        }
                                                        mt={4}
                                                    >
                                                        {capturing(n)
                                                            ? s('采集中', 'Capturing')
                                                            : policy.data?.enabled
                                                              ? s(
                                                                    '等待同步 / 有缺口',
                                                                    'Pending / gaps'
                                                                )
                                                              : s('未启用', 'Disabled')}
                                                        {n.status.dropped
                                                            ? ` · ${s('丢弃', 'Dropped')} ${n.status.dropped}`
                                                            : ''}
                                                    </Text>
                                                </Box>
                                            ))}
                                        </SimpleGrid>
                                    </Accordion.Panel>
                                </Accordion.Item>
                            </Accordion>
                        )}
                    </Box>
                )}
                {(policy.error ||
                    save.error ||
                    records.error ||
                    domains.error ||
                    rangeSummary.error ||
                    exportCsv.error) && (
                    <Alert color="red" radius="lg" title={s('请求失败', 'Request failed')}>
                        <Text size="xs" className={classes.wrap}>
                            {errorText(
                                policy.error ||
                                    save.error ||
                                    records.error ||
                                    domains.error ||
                                    rangeSummary.error ||
                                    exportCsv.error
                            )}
                        </Text>
                    </Alert>
                )}
                <Box className={classes.section}>
                    <Group gap="xs" mb="sm">
                        <TbSearch size={16} aria-hidden />
                        <Text size="sm" fw={600}>
                            {s('筛选范围', 'Filter records')}
                        </Text>
                        {!selectedUser && (
                            <Badge color="gray" variant="light" size="sm">
                                {s('全部已采集用户', 'All recorded users')}
                            </Badge>
                        )}
                    </Group>
                    <Box className={classes.filters} data-global={!userId || undefined}>
                        {!userId && (
                            <NumberInput
                                label={s('用户 ID', 'User ID')}
                                placeholder={s('全部已采集用户', 'All recorded users')}
                                value={selectedUser ?? ''}
                                min={1}
                                max={Number.MAX_SAFE_INTEGER}
                                allowDecimal={false}
                                onChange={(v) => {
                                    setSelectedUser(typeof v === 'number' ? v : undefined)
                                    setRetention(null)
                                    setExpiryMode('keep')
                                    resetPage()
                                }}
                            />
                        )}
                        <DatePickerInput
                            className={classes.dateFilter}
                            type="range"
                            label={s('观察日期（UTC）', 'Observed dates (UTC)')}
                            leftSection={<TbCalendar size={16} />}
                            minDate={minDate}
                            value={dates}
                            onChange={(v) => {
                                setDates(v)
                                resetPage()
                            }}
                        />
                        <TextInput
                            label={s('域名包含', 'Domain contains')}
                            placeholder="example.com"
                            leftSection={<TbWorld size={16} />}
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
                            data={(allNodes.data ?? []).map((n) => ({
                                value: n.uuid,
                                label: n.name
                            }))}
                            onChange={(v) => {
                                setNode(v)
                                resetPage()
                            }}
                        />
                    </Box>
                </Box>
                {complete && (
                    <Box className={classes.section} data-testid="audit-range-summary">
                        <Group justify="space-between" mb="sm">
                            <Text size="sm" fw={600}>
                                {s('整个筛选范围', 'Complete filtered range')}
                            </Text>
                            <Button
                                size="compact-sm"
                                variant="light"
                                leftSection={<TbDownload size={15} />}
                                loading={exportCsv.isPending}
                                data-testid="audit-export"
                                onClick={() =>
                                    modals.openConfirmModal({
                                        title: s('导出访问审计？', 'Export access audit?'),
                                        children: (
                                            <Text size="sm">
                                                {s(
                                                    '最多 5000 条，超限需要缩小筛选。文件包含敏感访问记录，请妥善保管。',
                                                    'Up to 5000 records; narrow the filters if exceeded. The file contains sensitive access records; store it securely.'
                                                )}
                                            </Text>
                                        ),
                                        labels: {
                                            confirm: s('导出 CSV', 'Export CSV'),
                                            cancel: s('取消', 'Cancel')
                                        },
                                        onConfirm: () => exportCsv.mutate()
                                    })
                                }
                            >
                                {s('导出 CSV', 'Export CSV')}
                            </Button>
                        </Group>
                        <SimpleGrid cols={{ base: 2, sm: 4 }}>
                            {[
                                [s('连接数', 'Connections'), rangeSummary.data?.connections],
                                [s('目标数', 'Targets'), rangeSummary.data?.targets],
                                [
                                    s('区间参考上传', 'Range reference upload'),
                                    rangeSummary.data?.upload &&
                                        formatAuditBytes(rangeSummary.data.upload)
                                ],
                                [
                                    s('区间参考下载', 'Range reference download'),
                                    rangeSummary.data?.download &&
                                        formatAuditBytes(rangeSummary.data.download)
                                ]
                            ].map(([label, value]) => (
                                <Box key={label}>
                                    <Text size="xs" c="dimmed">
                                        {label}
                                    </Text>
                                    <Text fw={600}>
                                        {rangeSummary.isPending || rangeSummary.isError
                                            ? '—'
                                            : value}
                                    </Text>
                                </Box>
                            ))}
                        </SimpleGrid>
                        <Text size="xs" c="dimmed" mt="xs">
                            {s(
                                '不受分页和 Top 20 截断影响；仍为连接累计参考字节，非日期内精确计费用量。',
                                'Independent of pagination and Top 20; cumulative reference bytes, not exact billed usage within the dates.'
                            )}
                        </Text>
                    </Box>
                )}
                <Tabs
                    defaultValue="records"
                    color="indigo"
                    keepMounted={false}
                    classNames={{ tab: classes.tab }}
                >
                    <Tabs.List>
                        <Tabs.Tab value="records" leftSection={<TbListDetails size={16} />}>
                            {s('连接记录', 'Connections')}
                        </Tabs.Tab>
                        <Tabs.Tab value="domains" leftSection={<TbChartBar size={16} />}>
                            {s('目标用量排行', 'Target ranking')}
                        </Tabs.Tab>
                    </Tabs.List>
                    <Tabs.Panel value="records" pt="md">
                        <Stack gap="md">
                            {complete && (
                                <Box className={classes.summary} data-testid="audit-page-summary">
                                    {[
                                        {
                                            label: s('本页连接', 'Connections on this page'),
                                            value: summary.count,
                                            Icon: TbListDetails,
                                            color: 'indigo'
                                        },
                                        {
                                            label: s('本页目标', 'Targets on this page'),
                                            value: summary.targets,
                                            Icon: TbWorld,
                                            color: 'indigo'
                                        },
                                        {
                                            label: s('本页参考上传', 'Page reference upload'),
                                            value: formatAuditBytes(summary.upload),
                                            Icon: TbArrowUp,
                                            color: 'violet'
                                        },
                                        {
                                            label: s('本页参考下载', 'Page reference download'),
                                            value: formatAuditBytes(summary.download),
                                            Icon: TbArrowDown,
                                            color: 'cyan'
                                        }
                                    ].map(({ label, value, Icon, color }) => (
                                        <Box key={label} className={classes.summaryCard}>
                                            <Group
                                                justify="space-between"
                                                gap={4}
                                                mb={8}
                                                wrap="nowrap"
                                            >
                                                <Text size="xs" c="dimmed">
                                                    {label}
                                                </Text>
                                                <ThemeIcon size={24} color={color} variant="light">
                                                    <Icon size={14} />
                                                </ThemeIcon>
                                            </Group>
                                            <Text className={classes.summaryValue}>
                                                {records.isPending || records.isError ? '—' : value}
                                            </Text>
                                        </Box>
                                    ))}
                                </Box>
                            )}
                            <Group justify="space-between" gap="xs">
                                <Text size="xs" c="dimmed">
                                    {s(
                                        '连接累计参考字节，非日期内精确用量。',
                                        'Cumulative reference bytes per connection, not exact usage within the dates.'
                                    )}
                                </Text>
                                <Button
                                    variant="subtle"
                                    size="compact-sm"
                                    leftSection={<TbRefresh size={15} />}
                                    loading={records.isFetching}
                                    disabled={!complete}
                                    onClick={() => void records.refetch()}
                                >
                                    {s('刷新', 'Refresh')}
                                </Button>
                            </Group>
                            {complete && records.data?.records.length ? (
                                <AuditConnections
                                    records={records.data.records}
                                    language={i18n.language}
                                    s={s}
                                />
                            ) : (
                                empty(records.isPending && complete, records.isError)
                            )}
                            <Box className={classes.pagination}>
                                <Button
                                    variant="default"
                                    size="sm"
                                    leftSection={<TbArrowLeft size={15} />}
                                    disabled={!pages.length || !complete || records.isFetching}
                                    onClick={() => {
                                        setCursor(pages.at(-1))
                                        setPages(pages.slice(0, -1))
                                    }}
                                >
                                    {s('上一页', 'Previous')}
                                </Button>
                                <Text size="xs" c="dimmed" className={classes.numeric}>
                                    {s(`第 ${pages.length + 1} 页`, `Page ${pages.length + 1}`)}
                                </Text>
                                <Button
                                    variant="default"
                                    size="sm"
                                    rightSection={<TbArrowRight size={15} />}
                                    disabled={
                                        !records.data?.nextCursor || !complete || records.isFetching
                                    }
                                    onClick={() => {
                                        setPages([...pages, cursor])
                                        setCursor(records.data!.nextCursor!)
                                    }}
                                >
                                    {s('下一页', 'Next')}
                                </Button>
                            </Box>
                        </Stack>
                    </Tabs.Panel>
                    <Tabs.Panel value="domains" pt="md">
                        <Stack gap="md">
                            <Group justify="space-between" gap="xs">
                                <Text size="xs" c="dimmed">
                                    {s(
                                        '目标 Top 20 · 连接累计参考流量',
                                        'Top 20 targets · cumulative reference traffic'
                                    )}
                                </Text>
                                <Select
                                    aria-label={s('排行方向', 'Ranking direction')}
                                    value={direction}
                                    onChange={(value) =>
                                        setDirection((value ?? 'total') as typeof direction)
                                    }
                                    data={[
                                        { value: 'total', label: s('按总量', 'Total') },
                                        { value: 'upload', label: s('按上传', 'Upload') },
                                        { value: 'download', label: s('按下载', 'Download') }
                                    ]}
                                />
                                <Button
                                    variant="subtle"
                                    size="compact-sm"
                                    leftSection={<TbRefresh size={15} />}
                                    loading={domains.isFetching}
                                    disabled={!complete}
                                    onClick={() => void domains.refetch()}
                                >
                                    {s('刷新', 'Refresh')}
                                </Button>
                            </Group>
                            {complete && domains.data?.length ? (
                                <AuditRanking domains={domains.data} s={s} />
                            ) : (
                                empty(domains.isPending && complete, domains.isError, true)
                            )}
                        </Stack>
                    </Tabs.Panel>
                </Tabs>
            </Stack>
        </Modal>
    )
})
