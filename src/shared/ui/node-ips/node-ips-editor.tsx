import { RestrictToVerticalAxis } from '@dnd-kit/abstract/modifiers'
import { move } from '@dnd-kit/helpers'
import { DragDropProvider, DragEndEvent } from '@dnd-kit/react'
import {
    ActionIcon,
    Alert,
    Badge,
    Button,
    Group,
    MantineSize,
    Paper,
    ScrollArea,
    Stack,
    Text,
    ThemeIcon,
    Tooltip
} from '@mantine/core'
import { UseFormReturnType } from '@mantine/form'
import {
    CreateNodeCommand,
    TNodeIps,
    TNodeIpStatus,
    UpdateNodeCommand
} from '@remnawave/backend-contract'
import { ReactNode, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TbNetwork, TbPlus } from 'react-icons/tb'

import surface from '@shared/ui/node-panel-surface.module.css'
import { BaseOverlayHeader } from '@shared/ui/overlays/base-overlay-header'
import { SectionCard } from '@shared/ui/section-card'

import { NodeIpRow } from './node-ip-row'
import { isValidNodeIp, MAX_NODE_IPS } from './validate-node-ips'

interface IEditableNodeIp {
    id: string
    ip: string
    status: TNodeIpStatus
}

interface IProps<T extends CreateNodeCommand.RequestBody | UpdateNodeCommand.RequestBody> {
    form: UseFormReturnType<T>
    size?: MantineSize
}

const VISIBLE_ROWS = 4
const ROW_GAP = 8
const ROW_HEIGHT: Record<string, number> = { xs: 30, sm: 34, md: 42 }
const DEFAULT_ROW_HEIGHT = 34

let rowIdCounter = 0
const nextRowId = () => {
    rowIdCounter += 1
    return `node-ip-${rowIdCounter}`
}

const toEditableIps = (ips: null | TNodeIps | undefined): IEditableNodeIp[] =>
    (ips ?? []).map((entry) => ({ id: nextRowId(), ip: entry.ip, status: entry.status }))

export const NodeIpsEditor = <
    T extends CreateNodeCommand.RequestBody | UpdateNodeCommand.RequestBody
>(
    props: IProps<T>
) => {
    const { form, size = 'xs' } = props

    const { t } = useTranslation()

    const [items, setItems] = useState<IEditableNodeIp[]>(() => toEditableIps(form.getValues().ips))
    const [addedRowId, setAddedRowId] = useState<null | string>(null)

    const commit = useCallback(
        (nextItems: IEditableNodeIp[]) => {
            setItems(nextItems)

            const nextIps: TNodeIps = nextItems.map((item) => ({
                ip: item.ip.trim(),
                status: item.status
            }))

            form.setFieldValue('ips', nextIps as never, { forceUpdate: false })
            form.setTouched({ ips: true } as never)
            form.setDirty({ ips: true } as never)
        },
        [form]
    )

    const handleAdd = () => {
        if (items.length >= MAX_NODE_IPS) return

        const id = nextRowId()
        setAddedRowId(id)
        commit([...items, { id, ip: '', status: 'UNKNOWN' }])
    }

    const handleRemove = (id: string) => {
        commit(items.filter((item) => item.id !== id))
    }

    const handleChangeIp = (id: string, ip: string) => {
        commit(items.map((item) => (item.id === id ? { ...item, ip } : item)))
    }

    const handleChangeStatus = (id: string, status: TNodeIpStatus) => {
        commit(items.map((item) => (item.id === id ? { ...item, status } : item)))
    }

    const handleDragEnd = (event: DragEndEvent) => {
        if (event.canceled) return

        commit(move(items, event))
    }

    const resolveRowError = (item: IEditableNodeIp, index: number): ReactNode => {
        if (!form.errors[`ips.${index}.ip`]) {
            return undefined
        }

        const ip = item.ip.trim()

        if (!ip) return t('node-ips.ip-is-required')
        if (!isValidNodeIp(ip)) return t('node-ips.invalid-ip')

        return undefined
    }

    const isFull = items.length >= MAX_NODE_IPS
    const subtitle =
        items.length > 0
            ? t('node-ips.subtitle-count', { count: items.length })
            : t('node-ips.subtitle-empty')

    return (
        <SectionCard.Root>
            <SectionCard.Section>
                <Group gap="xs" justify="space-between" wrap="nowrap">
                    <BaseOverlayHeader
                        iconColor="cyan"
                        IconComponent={TbNetwork}
                        iconVariant="soft"
                        subtitle={subtitle}
                        title={t('node-ips.title')}
                        titleOrder={5}
                    />

                    <Group gap={6} style={{ flexShrink: 0 }} wrap="nowrap">
                        {items.length > 0 && (
                            <Badge color="cyan" size="xs" variant="light">
                                {items.length}/{MAX_NODE_IPS}
                            </Badge>
                        )}
                        <Tooltip
                            label={
                                isFull
                                    ? t('node-ips.max-ips-reached', { max: MAX_NODE_IPS })
                                    : t('node-ips.add-ip')
                            }
                        >
                            <ActionIcon
                                color="cyan"
                                disabled={isFull}
                                size="md"
                                variant="light"
                                onClick={handleAdd}
                            >
                                <TbPlus size={16} />
                            </ActionIcon>
                        </Tooltip>
                    </Group>
                </Group>
            </SectionCard.Section>

            <SectionCard.Section>
                <Stack gap="sm">
                    {items.length === 0 ? (
                        <Paper className={surface.emptyState} p="md" radius="md">
                            <Stack align="center" gap="xs">
                                <ThemeIcon color="cyan" radius="xl" size="lg" variant="light">
                                    <TbNetwork size={20} />
                                </ThemeIcon>
                                <Text c="dimmed" fw={500} size="xs" ta="center">
                                    {t('node-ips.no-ips-yet')}
                                </Text>
                                <Button
                                    color="cyan"
                                    leftSection={<TbPlus size={14} />}
                                    size="xs"
                                    variant="light"
                                    onClick={handleAdd}
                                >
                                    {t('node-ips.add-ip')}
                                </Button>
                            </Stack>
                        </Paper>
                    ) : (
                        <DragDropProvider
                            modifiers={[RestrictToVerticalAxis]}
                            onDragEnd={handleDragEnd}
                        >
                            <ScrollArea.Autosize
                                mah={
                                    VISIBLE_ROWS * (ROW_HEIGHT[size] ?? DEFAULT_ROW_HEIGHT) +
                                    (VISIBLE_ROWS - 1) * ROW_GAP
                                }
                                scrollbarSize={6}
                                type="auto"
                            >
                                <Stack gap="xs" px={4}>
                                    {items.map((item, index) => (
                                        <NodeIpRow
                                            key={item.id}
                                            autoFocus={item.id === addedRowId}
                                            error={resolveRowError(item, index)}
                                            id={item.id}
                                            index={index}
                                            ip={item.ip}
                                            size={size}
                                            status={item.status}
                                            onChangeIp={(ip) => handleChangeIp(item.id, ip)}
                                            onChangeStatus={(status) =>
                                                handleChangeStatus(item.id, status)
                                            }
                                            onRemove={() => handleRemove(item.id)}
                                        />
                                    ))}
                                </Stack>
                            </ScrollArea.Autosize>
                        </DragDropProvider>
                    )}

                    {typeof form.errors.ips === 'string' && (
                        <Alert color="red" p="xs" radius="md">
                            {form.errors.ips}
                        </Alert>
                    )}
                </Stack>
            </SectionCard.Section>
        </SectionCard.Root>
    )
}
