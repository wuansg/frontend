import {
    ActionIcon,
    Alert,
    Badge,
    Button,
    Group,
    NumberInput,
    Paper,
    Select,
    SimpleGrid,
    Stack,
    Switch,
    Text,
    TextInput
} from '@mantine/core'
import { schemaResolver, useForm } from '@mantine/form'
import { ForwardRefComponent, HTMLMotionProps, Variants } from 'motion/react'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { TbArrowsExchange, TbPlus, TbRefresh, TbTrash } from 'react-icons/tb'

import { queryClient } from '@shared/api'
import {
    NodeForwardingConfig,
    NodeForwardingConfigSchema,
    nodesQueryKeys,
    useGetNodeForwarding,
    useSyncNodeForwarding,
    useUpdateNodeForwarding
} from '@shared/api/hooks'
import { BaseOverlayHeader } from '@shared/ui/overlays/base-overlay-header'
import { SectionCard } from '@shared/ui/section-card'
import { prettifyBytesUtil } from '@shared/utils/bytes'

interface IProps {
    cardVariants: Variants
    motionWrapper: ForwardRefComponent<HTMLDivElement, HTMLMotionProps<'div'>>
    nodeUuid: string
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

export const NodeForwardingCard = ({ cardVariants, motionWrapper, nodeUuid }: IProps) => {
    const { t } = useTranslation()
    const initialized = useRef(false)
    const MotionWrapper = motionWrapper
    const queryKey = nodesQueryKeys.getNodeForwarding({ uuid: nodeUuid }).queryKey

    const form = useForm<NodeForwardingConfig>({
        initialValues: DEFAULT_CONFIG,
        mode: 'controlled',
        validate: schemaResolver(NodeForwardingConfigSchema)
    })

    const { data, isLoading } = useGetNodeForwarding({ route: { uuid: nodeUuid } })
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
            onSuccess: (response) => queryClient.setQueryData(queryKey, response)
        }
    })

    useEffect(() => {
        if (data && !initialized.current) {
            initialized.current = true
            form.setValues(data.config)
            form.resetDirty(data.config)
        }
    }, [data])

    const addRule = () => {
        form.insertListItem('rules', {
            id: crypto.randomUUID(),
            name: `Forward ${form.values.rules.length + 1}`,
            enabled: true,
            protocol: 'TCP_UDP',
            listenPort: 55331,
            targetAddress: '',
            targetPort: 54320
        })
    }

    const status = data?.status

    return (
        <MotionWrapper variants={cardVariants}>
            <SectionCard.Root>
                <SectionCard.Section>
                    <Group justify="space-between">
                        <BaseOverlayHeader
                            iconColor="cyan"
                            IconComponent={TbArrowsExchange}
                            iconVariant="soft"
                            title={t('node-forwarding-card.title')}
                            titleOrder={5}
                        />
                        <Badge
                            color={STATUS_COLORS[status?.state ?? 'unreachable']}
                            variant="light"
                        >
                            {t(`node-forwarding-card.status-${status?.state ?? 'unreachable'}`)}
                        </Badge>
                    </Group>
                </SectionCard.Section>

                <SectionCard.Section>
                    <Stack gap="md">
                        {status?.lastError && (
                            <Alert color={status.state === 'degraded' ? 'orange' : 'red'}>
                                {status.lastError}
                            </Alert>
                        )}

                        <Switch
                            checked={form.values.enabled}
                            label={t('node-forwarding-card.enable')}
                            onChange={(event) =>
                                form.setFieldValue('enabled', event.currentTarget.checked)
                            }
                        />
                        <TextInput
                            description={
                                status?.resolvedListenInterface
                                    ? t('node-forwarding-card.resolved-interface', {
                                          interface: status.resolvedListenInterface
                                      })
                                    : t('node-forwarding-card.interface-description')
                            }
                            label={t('node-forwarding-card.interface')}
                            placeholder="auto"
                            {...form.getInputProps('listenInterface')}
                        />

                        {form.values.rules.map((rule, index) => {
                            const counters = status?.rules.find((item) => item.id === rule.id)
                            const upload =
                                (counters?.tcp?.upload.bytes ?? 0) +
                                (counters?.udp?.upload.bytes ?? 0)
                            const download =
                                (counters?.tcp?.download.bytes ?? 0) +
                                (counters?.udp?.download.bytes ?? 0)
                            return (
                                <Paper key={rule.id} p="sm" radius="md" withBorder>
                                    <Stack gap="sm">
                                        <Group justify="space-between">
                                            <Switch
                                                checked={rule.enabled}
                                                label={rule.name || t('node-forwarding-card.rule')}
                                                onChange={(event) =>
                                                    form.setFieldValue(
                                                        `rules.${index}.enabled`,
                                                        event.currentTarget.checked
                                                    )
                                                }
                                            />
                                            <ActionIcon
                                                color="red"
                                                onClick={() => form.removeListItem('rules', index)}
                                                variant="subtle"
                                            >
                                                <TbTrash size={16} />
                                            </ActionIcon>
                                        </Group>
                                        <SimpleGrid cols={{ base: 1, sm: 2 }}>
                                            <TextInput
                                                label={t('node-forwarding-card.name')}
                                                {...form.getInputProps(`rules.${index}.name`)}
                                            />
                                            <Select
                                                allowDeselect={false}
                                                data={[
                                                    { value: 'TCP_UDP', label: 'TCP + UDP' },
                                                    { value: 'TCP', label: 'TCP' },
                                                    { value: 'UDP', label: 'UDP' }
                                                ]}
                                                label={t('node-forwarding-card.protocol')}
                                                {...form.getInputProps(`rules.${index}.protocol`)}
                                            />
                                            <NumberInput
                                                allowDecimal={false}
                                                allowNegative={false}
                                                clampBehavior="strict"
                                                label={t('node-forwarding-card.listen-port')}
                                                max={65_535}
                                                min={1}
                                                {...form.getInputProps(`rules.${index}.listenPort`)}
                                            />
                                            <TextInput
                                                label={t('node-forwarding-card.target-address')}
                                                placeholder="78.105.182.150"
                                                {...form.getInputProps(
                                                    `rules.${index}.targetAddress`
                                                )}
                                            />
                                            <NumberInput
                                                allowDecimal={false}
                                                allowNegative={false}
                                                clampBehavior="strict"
                                                label={t('node-forwarding-card.target-port')}
                                                max={65_535}
                                                min={1}
                                                {...form.getInputProps(`rules.${index}.targetPort`)}
                                            />
                                            <Stack gap={2} justify="end">
                                                <Text c="dimmed" size="xs">
                                                    {t('node-forwarding-card.traffic-since-apply')}
                                                </Text>
                                                <Text size="sm">
                                                    ↑ {prettifyBytesUtil(upload)} · ↓{' '}
                                                    {prettifyBytesUtil(download)}
                                                </Text>
                                            </Stack>
                                        </SimpleGrid>
                                    </Stack>
                                </Paper>
                            )
                        })}

                        <Group justify="space-between">
                            <Button
                                disabled={form.values.rules.length >= 64}
                                leftSection={<TbPlus size={16} />}
                                onClick={addRule}
                                variant="subtle"
                            >
                                {t('node-forwarding-card.add-rule')}
                            </Button>
                            <Group gap="xs">
                                <Button
                                    disabled={isLoading}
                                    leftSection={<TbRefresh size={16} />}
                                    loading={isSyncing}
                                    onClick={() => syncForwarding({})}
                                    variant="light"
                                >
                                    {t('node-forwarding-card.sync')}
                                </Button>
                                <Button
                                    disabled={!form.isDirty()}
                                    loading={isUpdating}
                                    onClick={() =>
                                        form.onSubmit((values) =>
                                            updateForwarding({ variables: values })
                                        )()
                                    }
                                >
                                    {t('node-forwarding-card.apply')}
                                </Button>
                            </Group>
                        </Group>
                    </Stack>
                </SectionCard.Section>
            </SectionCard.Root>
        </MotionWrapper>
    )
}
