import {
    Accordion,
    Alert,
    Badge,
    Button,
    Code,
    Group,
    NumberInput,
    SegmentedControl,
    Select,
    SimpleGrid,
    Stack,
    Switch,
    Text,
    TextInput
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { TbActivityHeartbeat, TbCheck, TbNetwork } from 'react-icons/tb'

import { instance } from '@shared/api'

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

export function GeocheckObservabilityWidget({ nodeUuid }: { nodeUuid: string }) {
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
    const [enabled, setEnabled] = useState(false)
    const [interval, setInterval] = useState<number | string>(60)
    const [cooldown, setCooldown] = useState<number | string>(60)
    const [sourceType, setSourceType] = useState<'DEFAULT' | 'INTERFACE' | 'IP'>('DEFAULT')
    const [sourceValue, setSourceValue] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!query.data) return
        const { schedule } = query.data
        setEnabled(schedule.intervalMinutes !== null)
        setInterval(schedule.intervalMinutes ?? 60)
        setCooldown(schedule.cooldownMinutes)
        setSourceType(schedule.source?.type ?? 'DEFAULT')
        setSourceValue(schedule.source?.value ?? '')
    }, [query.data])

    const interfaces = query.data?.network?.interfaces ?? []
    const interfaceOptions = useMemo(
        () =>
            interfaces.map((item) => ({
                value: item.name,
                label: `${item.name}${item.defaultRoute ? ' (default)' : ''}`
            })),
        [interfaces]
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
            notifications.show({ color: 'teal', message: 'Geocheck schedule updated' })
        } catch (error) {
            notifications.show({
                color: 'red',
                message: error instanceof Error ? error.message : 'Unable to update schedule'
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
        <Accordion variant="contained">
            <Accordion.Item value="observability">
                <Accordion.Control icon={<TbActivityHeartbeat size={18} />}>
                    Network inventory, history and drift
                </Accordion.Control>
                <Accordion.Panel>
                    <Stack gap="md">
                        {query.isError && (
                            <Alert color="red">Unable to load node observability data.</Alert>
                        )}

                        <Group justify="space-between">
                            <Stack gap={0}>
                                <Text fw={600} size="sm">
                                    Scheduled Geocheck
                                </Text>
                                <Text c="dimmed" size="xs">
                                    Agent-reported addresses are suggestions and are never saved
                                    automatically.
                                </Text>
                            </Stack>
                            <Switch
                                checked={enabled}
                                onChange={(event) => setEnabled(event.currentTarget.checked)}
                            />
                        </Group>

                        <SimpleGrid cols={{ base: 1, sm: 2 }}>
                            <NumberInput
                                disabled={!enabled}
                                label="Interval (minutes)"
                                max={10_080}
                                min={5}
                                onChange={setInterval}
                                value={interval}
                            />
                            <NumberInput
                                label="Drift cooldown (minutes)"
                                max={10_080}
                                min={1}
                                onChange={setCooldown}
                                value={cooldown}
                            />
                        </SimpleGrid>

                        <SegmentedControl
                            data={[
                                { label: 'Default', value: 'DEFAULT' },
                                { label: 'IP', value: 'IP' },
                                { label: 'Interface', value: 'INTERFACE' }
                            ]}
                            fullWidth
                            onChange={(value) => setSourceType(value as typeof sourceType)}
                            value={sourceType}
                        />
                        {sourceType === 'IP' && (
                            <Select
                                data={ipOptions}
                                label="Source IP"
                                onChange={(value) => setSourceValue(value ?? '')}
                                searchable
                                value={sourceValue || null}
                            />
                        )}
                        {sourceType === 'INTERFACE' && (
                            <Select
                                data={interfaceOptions}
                                label="Source interface"
                                onChange={(value) => setSourceValue(value ?? '')}
                                searchable
                                value={sourceValue || null}
                            />
                        )}
                        {sourceType === 'DEFAULT' && (
                            <TextInput disabled label="Source" value="System default route" />
                        )}
                        <Button
                            disabled={
                                (enabled && Number(interval) < 5) ||
                                Number(cooldown) < 1 ||
                                (sourceType !== 'DEFAULT' && !sourceValue.trim())
                            }
                            loading={saving}
                            onClick={saveSchedule}
                        >
                            Save schedule
                        </Button>

                        <Text fw={600} size="sm">
                            Agent network inventory
                        </Text>
                        {interfaces.length === 0 && (
                            <Text c="dimmed" size="sm">
                                No inventory reported yet. It will appear after the next health
                                check.
                            </Text>
                        )}
                        {interfaces.map((item) => (
                            <Group gap="xs" key={item.name} wrap="wrap">
                                <TbNetwork size={16} />
                                <Code>{item.name}</Code>
                                {item.defaultRoute && <Badge color="teal">default route</Badge>}
                                <Badge variant="outline">MTU {item.mtu}</Badge>
                                {item.addresses.map((address) => (
                                    <Badge key={`${item.name}-${address.address}`} variant="light">
                                        {address.address}/{address.prefix} · {address.family}
                                    </Badge>
                                ))}
                            </Group>
                        ))}

                        <Text fw={600} size="sm">
                            Unacknowledged drift
                        </Text>
                        {query.data?.driftEvents.filter((event) => !event.acknowledgedAt).length ===
                            0 && (
                            <Text c="dimmed" size="sm">
                                No unacknowledged drift.
                            </Text>
                        )}
                        {query.data?.driftEvents
                            .filter((event) => !event.acknowledgedAt)
                            .map((event) => (
                                <Group justify="space-between" key={event.id} wrap="nowrap">
                                    <Stack gap={0}>
                                        <Text fw={600} size="sm">
                                            {event.kind}: {event.previousValue ?? '—'} →{' '}
                                            {event.currentValue ?? '—'}
                                        </Text>
                                        <Text c="dimmed" size="xs">
                                            {new Date(event.createdAt).toLocaleString()}
                                        </Text>
                                    </Stack>
                                    <Button
                                        leftSection={<TbCheck size={14} />}
                                        onClick={() => void acknowledge(event.id)}
                                        size="xs"
                                        variant="light"
                                    >
                                        Acknowledge
                                    </Button>
                                </Group>
                            ))}

                        <Text fw={600} size="sm">
                            Recent checks ({query.data?.history.length ?? 0}/50)
                        </Text>
                        {query.data?.history.slice(0, 8).map((entry) => (
                            <Group justify="space-between" key={entry.id} wrap="nowrap">
                                <Group gap="xs">
                                    <Badge color={entry.success ? 'teal' : 'red'} variant="light">
                                        {entry.success ? 'OK' : 'FAILED'}
                                    </Badge>
                                    <Text size="xs">
                                        {entry.snapshot
                                            ? Object.values(entry.snapshot)
                                                  .filter(Boolean)
                                                  .join(' · ')
                                            : (entry.message ?? 'No snapshot')}
                                    </Text>
                                </Group>
                                <Text c="dimmed" size="xs">
                                    {new Date(entry.createdAt).toLocaleString()}
                                </Text>
                            </Group>
                        ))}
                    </Stack>
                </Accordion.Panel>
            </Accordion.Item>
        </Accordion>
    )
}
