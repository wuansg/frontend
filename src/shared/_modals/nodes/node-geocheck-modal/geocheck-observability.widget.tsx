import {
    Accordion,
    Alert,
    Badge,
    Box,
    Button,
    Divider,
    Group,
    NumberInput,
    SegmentedControl,
    Select,
    SimpleGrid,
    Stack,
    Switch,
    Text,
    TextInput,
    ThemeIcon
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
    TbActivityHeartbeat,
    TbAlertTriangle,
    TbCheck,
    TbClock,
    TbHistory,
    TbNetwork
} from 'react-icons/tb'

import { instance } from '@shared/api'
import surfaceClasses from '@shared/ui/node-panel-surface.module.css'

interface NetworkInterface {
    name: string
    index: number
    mtu: number
    flags: string[]
    addresses: Array<{ address: string; prefix: number; family: 'IPv4' | 'IPv6' }>
    defaultRoute: boolean
}

interface DriftEvent {
    id: string
    kind: string
    previousValue: null | string
    currentValue: null | string
    acknowledgedAt: null | string
    createdAt: string
}

interface GeocheckHistory {
    id: string
    success: boolean
    snapshot?: Record<string, null | string>
    changes?: Array<Record<string, unknown>>
    message?: null | string
    createdAt: string
}

interface Observability {
    schedule: {
        intervalMinutes: null | number
        cooldownMinutes: number
        source: null | { type: 'DEFAULT' | 'INTERFACE' | 'IP'; value?: string }
        lastScheduledAt: null | string
    }
    network: null | { interfaces: NetworkInterface[]; reportedAt: string }
    plugin: null | Record<string, unknown>
    history: GeocheckHistory[]
    driftEvents: DriftEvent[]
}

interface ScheduleDraft {
    enabled?: boolean
    interval?: number | string
    cooldown?: number | string
    sourceType?: 'DEFAULT' | 'INTERFACE' | 'IP'
    sourceValue?: string
}

export function GeocheckObservabilityWidget({ nodeUuid }: { nodeUuid: string }) {
    const { i18n } = useTranslation()
    const zh = i18n.language.startsWith('zh')
    const s = (cn: string, en: string) => (zh ? cn : en)

    const query = useQuery({
        queryKey: ['node-observability', nodeUuid],
        queryFn: async () => {
            const response = await instance.get<{ response: Observability }>(
                `/api/nodes/${nodeUuid}/observability`
            )
            return response.data.response
        },
        refetchInterval: 30_000
    })

    const [draft, setDraft] = useState<ScheduleDraft>({})
    const [saving, setSaving] = useState(false)

    const serverSchedule = query.data?.schedule
    const enabled =
        draft.enabled ?? (serverSchedule ? serverSchedule.intervalMinutes !== null : false)
    const interval = draft.interval ?? serverSchedule?.intervalMinutes ?? 60
    const cooldown = draft.cooldown ?? serverSchedule?.cooldownMinutes ?? 60
    const sourceType = draft.sourceType ?? serverSchedule?.source?.type ?? 'DEFAULT'
    const sourceValue = draft.sourceValue ?? serverSchedule?.source?.value ?? ''

    const interfaces = useMemo(() => query.data?.network?.interfaces ?? [], [query.data?.network])
    const interfaceOptions = useMemo(
        () =>
            interfaces.map((item) => ({
                value: item.name,
                label: `${item.name}${item.defaultRoute ? s('（默认路由）', ' (default)') : ''}`
            })),
        [interfaces, zh]
    )
    const ipOptions = useMemo(
        () =>
            interfaces.flatMap((item) =>
                item.addresses.map((address) => ({
                    value: address.address,
                    label: `${address.address}/${address.prefix} · ${item.name}`
                }))
            ),
        [interfaces]
    )

    const unackedDrifts = useMemo(
        () => (query.data?.driftEvents ?? []).filter((event) => !event.acknowledgedAt),
        [query.data?.driftEvents]
    )

    const saveSchedule = async () => {
        setSaving(true)
        try {
            const resolvedInterval = Number(interval)
            const resolvedCooldown = Number(cooldown)
            await instance.patch(`/api/nodes/${nodeUuid}/observability/geocheck`, {
                intervalMinutes: enabled ? resolvedInterval : null,
                cooldownMinutes: resolvedCooldown,
                source:
                    sourceType === 'DEFAULT'
                        ? { type: 'DEFAULT' }
                        : { type: sourceType, value: sourceValue.trim() }
            })
            await query.refetch()
            setDraft({})
            notifications.show({
                color: 'teal',
                message: s('已保存定时地理巡检配置', 'Geocheck schedule updated')
            })
        } catch (error) {
            notifications.show({
                color: 'red',
                message:
                    error instanceof Error
                        ? error.message
                        : s('保存巡检配置失败', 'Unable to update schedule')
            })
        } finally {
            setSaving(false)
        }
    }

    const acknowledge = async (eventId: string) => {
        await instance.post(`/api/nodes/${nodeUuid}/observability/geocheck/drift/${eventId}/ack`)
        await query.refetch()
    }

    return (
        <Accordion radius="md" variant="contained">
            <Accordion.Item value="observability">
                <Accordion.Control icon={<TbActivityHeartbeat size={18} />}>
                    <Group gap="xs" wrap="wrap">
                        <Text fw={600} size="sm">
                            {s(
                                '网卡清单、定时巡检与出口漂移',
                                'Network inventory, schedule & drift'
                            )}
                        </Text>
                        {serverSchedule && (
                            <Badge
                                className={surfaceClasses.tabular}
                                color={serverSchedule.intervalMinutes !== null ? 'teal' : 'gray'}
                                size="xs"
                                variant="light"
                            >
                                {serverSchedule.intervalMinutes !== null
                                    ? s(
                                          `每 ${serverSchedule.intervalMinutes} 分钟`,
                                          `Every ${serverSchedule.intervalMinutes}m`
                                      )
                                    : s('定时未启用', 'Not scheduled')}
                            </Badge>
                        )}
                        {unackedDrifts.length > 0 && (
                            <Badge
                                className={surfaceClasses.tabular}
                                color="orange"
                                size="xs"
                                variant="light"
                            >
                                {s(
                                    `${unackedDrifts.length} 项漂移待确认`,
                                    `${unackedDrifts.length} unacknowledged`
                                )}
                            </Badge>
                        )}
                    </Group>
                </Accordion.Control>
                <Accordion.Panel>
                    <Stack gap="md">
                        {query.isError && (
                            <Alert color="red" radius="md">
                                {s(
                                    '无法加载节点网络可观测性数据。',
                                    'Unable to load node observability data.'
                                )}
                            </Alert>
                        )}

                        <Box
                            className={clsx(surfaceClasses.subPanel, surfaceClasses.accentCyan)}
                            p="md"
                        >
                            <Stack gap="sm">
                                <Group justify="space-between" wrap="nowrap">
                                    <Group gap="xs" wrap="nowrap">
                                        <ThemeIcon
                                            color="cyan"
                                            radius="md"
                                            size="sm"
                                            variant="light"
                                        >
                                            <TbClock size={14} />
                                        </ThemeIcon>
                                        <Stack gap={1}>
                                            <Text fw={600} size="sm">
                                                {s('定时地理巡检', 'Scheduled GeoCheck')}
                                            </Text>
                                            <Text c="dimmed" size="xs">
                                                {s(
                                                    'Agent 上报的地址仅作为候选参考，不会自动覆盖节点主地址。',
                                                    'Agent-reported addresses are suggestions and are never saved automatically.'
                                                )}
                                            </Text>
                                        </Stack>
                                    </Group>
                                    <Switch
                                        checked={enabled}
                                        color="teal"
                                        onChange={(event) =>
                                            setDraft((prev) => ({
                                                ...prev,
                                                enabled: event.currentTarget.checked
                                            }))
                                        }
                                    />
                                </Group>

                                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                                    <NumberInput
                                        disabled={!enabled}
                                        label={s('巡检间隔（分钟）', 'Interval (minutes)')}
                                        max={10_080}
                                        min={5}
                                        onChange={(val) =>
                                            setDraft((prev) => ({ ...prev, interval: val }))
                                        }
                                        value={interval}
                                    />
                                    <NumberInput
                                        label={s(
                                            '漂移告警冷却（分钟）',
                                            'Drift cooldown (minutes)'
                                        )}
                                        max={10_080}
                                        min={1}
                                        onChange={(val) =>
                                            setDraft((prev) => ({ ...prev, cooldown: val }))
                                        }
                                        value={cooldown}
                                    />
                                </SimpleGrid>

                                <SegmentedControl
                                    data={[
                                        { label: s('默认出口', 'Default'), value: 'DEFAULT' },
                                        { label: s('指定 IP', 'IP'), value: 'IP' },
                                        { label: s('指定网卡', 'Interface'), value: 'INTERFACE' }
                                    ]}
                                    fullWidth
                                    onChange={(val) =>
                                        setDraft((prev) => ({
                                            ...prev,
                                            sourceType: val as typeof sourceType,
                                            sourceValue: ''
                                        }))
                                    }
                                    size="xs"
                                    value={sourceType}
                                />

                                {sourceType === 'IP' && (
                                    <Select
                                        data={ipOptions}
                                        label={s('巡检源 IP', 'Source IP')}
                                        onChange={(val) =>
                                            setDraft((prev) => ({
                                                ...prev,
                                                sourceValue: val ?? ''
                                            }))
                                        }
                                        searchable
                                        value={sourceValue || null}
                                    />
                                )}
                                {sourceType === 'INTERFACE' && (
                                    <Select
                                        data={interfaceOptions}
                                        label={s('巡检源网卡', 'Source interface')}
                                        onChange={(val) =>
                                            setDraft((prev) => ({
                                                ...prev,
                                                sourceValue: val ?? ''
                                            }))
                                        }
                                        searchable
                                        value={sourceValue || null}
                                    />
                                )}
                                {sourceType === 'DEFAULT' && (
                                    <TextInput
                                        disabled
                                        label={s('出口路由', 'Source')}
                                        value={s('系统默认出站路由', 'System default route')}
                                    />
                                )}

                                <Group justify="flex-end">
                                    <Button
                                        color="teal"
                                        disabled={
                                            (enabled && Number(interval) < 5) ||
                                            Number(cooldown) < 1 ||
                                            (sourceType !== 'DEFAULT' && !sourceValue.trim())
                                        }
                                        loading={saving}
                                        onClick={() => void saveSchedule()}
                                        size="xs"
                                        variant="light"
                                    >
                                        {s('保存巡检设置', 'Save schedule')}
                                    </Button>
                                </Group>
                            </Stack>
                        </Box>

                        <Box className={surfaceClasses.subPanel} p="md">
                            <Stack gap="xs">
                                <Group gap="xs">
                                    <ThemeIcon color="teal" radius="md" size="sm" variant="light">
                                        <TbNetwork size={14} />
                                    </ThemeIcon>
                                    <Text fw={600} size="sm">
                                        {s('节点网卡与地址清单', 'Agent network inventory')}
                                    </Text>
                                    <Badge
                                        className={surfaceClasses.tabular}
                                        color="gray"
                                        size="xs"
                                        variant="light"
                                    >
                                        {interfaces.length}
                                    </Badge>
                                </Group>

                                {interfaces.length === 0 ? (
                                    <Text c="dimmed" size="xs">
                                        {s(
                                            '暂未上报网卡清单，将在下次节点心跳后自动同步。',
                                            'No inventory reported yet. It will appear after the next health check.'
                                        )}
                                    </Text>
                                ) : (
                                    <Stack gap="xs">
                                        {interfaces.map((item) => (
                                            <Box
                                                className={surfaceClasses.metricBlock}
                                                key={item.name}
                                            >
                                                <Group gap="xs" wrap="wrap">
                                                    <Text
                                                        className={surfaceClasses.tabular}
                                                        fw={650}
                                                        size="xs"
                                                    >
                                                        {item.name}
                                                    </Text>
                                                    {item.defaultRoute && (
                                                        <Badge
                                                            color="teal"
                                                            size="xs"
                                                            variant="light"
                                                        >
                                                            {s('默认路由', 'default route')}
                                                        </Badge>
                                                    )}
                                                    <Badge
                                                        className={surfaceClasses.tabular}
                                                        color="gray"
                                                        size="xs"
                                                        variant="outline"
                                                    >
                                                        MTU {item.mtu}
                                                    </Badge>
                                                    {item.addresses.map((address) => (
                                                        <Badge
                                                            className={surfaceClasses.tabular}
                                                            color={
                                                                address.family === 'IPv4'
                                                                    ? 'cyan'
                                                                    : 'violet'
                                                            }
                                                            key={`${item.name}-${address.address}`}
                                                            size="xs"
                                                            variant="light"
                                                        >
                                                            {address.address}/{address.prefix} ·{' '}
                                                            {address.family}
                                                        </Badge>
                                                    ))}
                                                </Group>
                                            </Box>
                                        ))}
                                    </Stack>
                                )}
                            </Stack>
                        </Box>

                        <SimpleGrid
                            cols={unackedDrifts.length > 0 ? 1 : { base: 1, md: 2 }}
                            spacing="sm"
                        >
                            <Box
                                className={clsx(
                                    surfaceClasses.subPanel,
                                    unackedDrifts.length > 0 && surfaceClasses.accentOrange
                                )}
                                p="md"
                            >
                                <Stack gap="xs">
                                    <Group gap="xs">
                                        <ThemeIcon
                                            color={unackedDrifts.length > 0 ? 'orange' : 'gray'}
                                            radius="md"
                                            size="sm"
                                            variant="light"
                                        >
                                            <TbAlertTriangle size={14} />
                                        </ThemeIcon>
                                        <Text fw={600} size="sm">
                                            {s('未确认的出口漂移', 'Unacknowledged drift')}
                                        </Text>
                                    </Group>

                                    {unackedDrifts.length === 0 ? (
                                        <Text c="dimmed" size="xs">
                                            {s(
                                                '当前无未确认的出口漂移记录。',
                                                'No unacknowledged drift.'
                                            )}
                                        </Text>
                                    ) : (
                                        <Stack gap="xs">
                                            {unackedDrifts.map((event) => (
                                                <Group
                                                    className={surfaceClasses.metricBlock}
                                                    justify="space-between"
                                                    key={event.id}
                                                    wrap="nowrap"
                                                >
                                                    <Stack gap={2} style={{ minWidth: 0 }}>
                                                        <Text
                                                            className={surfaceClasses.tabular}
                                                            fw={600}
                                                            size="xs"
                                                            style={{ overflowWrap: 'anywhere' }}
                                                        >
                                                            {event.kind}:{' '}
                                                            {event.previousValue ?? '—'} →{' '}
                                                            {event.currentValue ?? '—'}
                                                        </Text>
                                                        <Text
                                                            c="dimmed"
                                                            className={surfaceClasses.tabular}
                                                            size="11px"
                                                        >
                                                            {new Date(
                                                                event.createdAt
                                                            ).toLocaleString(i18n.language)}
                                                        </Text>
                                                    </Stack>
                                                    <Button
                                                        color="teal"
                                                        leftSection={<TbCheck size={14} />}
                                                        onClick={() => void acknowledge(event.id)}
                                                        size="compact-xs"
                                                        style={{ flexShrink: 0 }}
                                                        variant="light"
                                                    >
                                                        {s('确认', 'Acknowledge')}
                                                    </Button>
                                                </Group>
                                            ))}
                                        </Stack>
                                    )}
                                </Stack>
                            </Box>

                            <Box className={surfaceClasses.subPanel} p="md">
                                <Stack gap="xs">
                                    <Group gap="xs" justify="space-between">
                                        <Group gap="xs">
                                            <ThemeIcon
                                                color="violet"
                                                radius="md"
                                                size="sm"
                                                variant="light"
                                            >
                                                <TbHistory size={14} />
                                            </ThemeIcon>
                                            <Text fw={600} size="sm">
                                                {s('最近巡检历史', 'Recent checks')}
                                            </Text>
                                        </Group>
                                        <Badge
                                            className={surfaceClasses.tabular}
                                            color="gray"
                                            size="xs"
                                            variant="light"
                                        >
                                            {query.data?.history.length ?? 0} / 50
                                        </Badge>
                                    </Group>

                                    {(query.data?.history.length ?? 0) === 0 ? (
                                        <Text c="dimmed" size="xs">
                                            {s('暂无历史巡检记录。', 'No recent checks recorded.')}
                                        </Text>
                                    ) : (
                                        <Stack gap={6}>
                                            {query.data?.history.slice(0, 8).map((entry, idx) => (
                                                <Box key={entry.id}>
                                                    {idx > 0 && <Divider mb={6} opacity={0.35} />}
                                                    <Group justify="space-between" wrap="nowrap">
                                                        <Group
                                                            gap="xs"
                                                            style={{ minWidth: 0 }}
                                                            wrap="nowrap"
                                                        >
                                                            <Badge
                                                                color={
                                                                    entry.success ? 'teal' : 'red'
                                                                }
                                                                size="xs"
                                                                variant="light"
                                                            >
                                                                {entry.success
                                                                    ? s('正常', 'OK')
                                                                    : s('失败', 'FAILED')}
                                                            </Badge>
                                                            <Text
                                                                className={surfaceClasses.tabular}
                                                                size="xs"
                                                                truncate
                                                            >
                                                                {entry.snapshot
                                                                    ? Object.values(entry.snapshot)
                                                                          .filter(Boolean)
                                                                          .join(' · ')
                                                                    : (entry.message ??
                                                                      s('无快照', 'No snapshot'))}
                                                            </Text>
                                                        </Group>
                                                        <Text
                                                            c="dimmed"
                                                            className={surfaceClasses.tabular}
                                                            size="11px"
                                                            style={{ flexShrink: 0 }}
                                                        >
                                                            {new Date(
                                                                entry.createdAt
                                                            ).toLocaleString(i18n.language)}
                                                        </Text>
                                                    </Group>
                                                </Box>
                                            ))}
                                        </Stack>
                                    )}
                                </Stack>
                            </Box>
                        </SimpleGrid>
                    </Stack>
                </Accordion.Panel>
            </Accordion.Item>
        </Accordion>
    )
}
