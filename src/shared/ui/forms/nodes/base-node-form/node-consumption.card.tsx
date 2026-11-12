import {
    ActionIcon,
    Badge,
    Group,
    HoverCard,
    NumberInput,
    NumberInputHandlers,
    Paper,
    SimpleGrid,
    Stack,
    Text
} from '@mantine/core'
import { UseFormReturnType } from '@mantine/form'
import { CreateNodeCommand, UpdateNodeCommand } from '@remnawave/backend-contract'
import { ForwardRefComponent, HTMLMotionProps, Variants } from 'motion/react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HiQuestionMarkCircle } from 'react-icons/hi'
import { TbChartLine, TbMinus, TbPlus } from 'react-icons/tb'

import surface from '@shared/ui/node-panel-surface.module.css'
import { BaseOverlayHeader } from '@shared/ui/overlays/base-overlay-header'
import { SectionCard } from '@shared/ui/section-card'

interface IProps {
    cardVariants: Variants
    form: UseFormReturnType<CreateNodeCommand.RequestBody | UpdateNodeCommand.RequestBody>
    motionWrapper: ForwardRefComponent<HTMLDivElement, HTMLMotionProps<'div'>>
}

const PRESET_MULTIPLIERS = [0.5, 1.0, 1.5, 2.0]

export const NodeConsumptionCard = (props: IProps) => {
    const { t } = useTranslation()
    const { cardVariants, form, motionWrapper: MotionWrapper } = props
    const consumptionMultiplierRef = useRef<NumberInputHandlers>(null)
    const nodeConsumptionRef = useRef<NumberInputHandlers>(null)

    const [userMultiplier, setUserMultiplier] = useState<number | string | undefined>(
        () => form.getValues().consumptionMultiplier
    )
    const [nodeMultiplier, setNodeMultiplier] = useState<number | string | undefined>(
        () => form.getValues().nodeConsumptionMultiplier
    )

    form.watch('consumptionMultiplier', ({ value }) => {
        setUserMultiplier(value)
    })
    form.watch('nodeConsumptionMultiplier', ({ value }) => {
        setNodeMultiplier(value)
    })

    const applyPreset = (
        field: 'consumptionMultiplier' | 'nodeConsumptionMultiplier',
        preset: number
    ) => {
        form.setFieldValue(field, preset)
        form.setTouched({ [field]: true })
        form.setDirty({ [field]: true })
    }

    return (
        <MotionWrapper variants={cardVariants}>
            <SectionCard.Root>
                <SectionCard.Section>
                    <BaseOverlayHeader
                        iconColor="indigo"
                        IconComponent={TbChartLine}
                        iconVariant="soft"
                        subtitle={t('base-node-form.consumption-subtitle')}
                        title={t('base-node-form.consumption')}
                        titleOrder={5}
                    />
                </SectionCard.Section>
                <SectionCard.Section>
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                        <Paper className={surface.subPanel} p="sm" radius="md">
                            <Stack gap="xs">
                                <Group align="center" gap={4} justify="space-between" wrap="nowrap">
                                    <Text fw={500} size="xs" truncate>
                                        {t('node-consumption.card.user-consumption-multiplier')}
                                    </Text>
                                    <HoverCard shadow="md" width={280} withArrow>
                                        <HoverCard.Target>
                                            <ActionIcon color="gray" size="xs" variant="subtle">
                                                <HiQuestionMarkCircle size={16} />
                                            </ActionIcon>
                                        </HoverCard.Target>
                                        <HoverCard.Dropdown>
                                            <Stack gap="xs">
                                                <Text c="dimmed" size="xs">
                                                    {t('base-node-form.consumption-m-line-1')}
                                                </Text>
                                                <Text c="dimmed" size="xs">
                                                    {t('base-node-form.consumption-m-line-2')}
                                                </Text>
                                            </Stack>
                                        </HoverCard.Dropdown>
                                    </HoverCard>
                                </Group>

                                <NumberInput
                                    key={form.key('consumptionMultiplier')}
                                    allowDecimal
                                    allowedDecimalSeparators={['.']}
                                    allowNegative={false}
                                    clampBehavior="strict"
                                    decimalScale={1}
                                    fixedDecimalScale
                                    handlersRef={consumptionMultiplierRef}
                                    hideControls
                                    leftSection={
                                        <ActionIcon
                                            color="red"
                                            radius="sm"
                                            size={22}
                                            variant="light"
                                            onClick={() =>
                                                consumptionMultiplierRef.current?.decrement()
                                            }
                                        >
                                            <TbMinus size={13} />
                                        </ActionIcon>
                                    }
                                    leftSectionPointerEvents="all"
                                    leftSectionWidth={32}
                                    max={100.0}
                                    min={0}
                                    rightSection={
                                        <ActionIcon
                                            color="teal"
                                            radius="sm"
                                            size={22}
                                            variant="light"
                                            onClick={() =>
                                                consumptionMultiplierRef.current?.increment()
                                            }
                                        >
                                            <TbPlus size={13} />
                                        </ActionIcon>
                                    }
                                    rightSectionPointerEvents="all"
                                    rightSectionWidth={32}
                                    size="xs"
                                    step={0.1}
                                    styles={{
                                        input: {
                                            textAlign: 'center',
                                            fontWeight: 600,
                                            fontVariantNumeric: 'tabular-nums'
                                        }
                                    }}
                                    {...form.getInputProps('consumptionMultiplier')}
                                />

                                <Group gap={4} justify="center">
                                    {PRESET_MULTIPLIERS.map((preset) => {
                                        const active = Number(userMultiplier) === preset
                                        return (
                                            <Badge
                                                key={preset}
                                                className={surface.quickChip}
                                                color={active ? 'indigo' : 'gray'}
                                                size="xs"
                                                variant={active ? 'filled' : 'light'}
                                                onClick={() =>
                                                    applyPreset('consumptionMultiplier', preset)
                                                }
                                            >
                                                {preset.toFixed(1)}x
                                            </Badge>
                                        )
                                    })}
                                </Group>
                            </Stack>
                        </Paper>

                        <Paper className={surface.subPanel} p="sm" radius="md">
                            <Stack gap="xs">
                                <Group align="center" gap={4} justify="space-between" wrap="nowrap">
                                    <Text fw={500} size="xs" truncate>
                                        {t('node-consumption.card.node-consumption-multiplier')}
                                    </Text>
                                    <HoverCard shadow="md" width={280} withArrow>
                                        <HoverCard.Target>
                                            <ActionIcon color="gray" size="xs" variant="subtle">
                                                <HiQuestionMarkCircle size={16} />
                                            </ActionIcon>
                                        </HoverCard.Target>
                                        <HoverCard.Dropdown>
                                            <Stack gap="xs">
                                                <Text c="dimmed" size="xs">
                                                    {t(
                                                        'node-consumption.card.node-consumption-multiplier-1'
                                                    )}
                                                </Text>
                                                <Text c="dimmed" size="xs">
                                                    {t(
                                                        'node-consumption.card.node-consumption-multiplier-2'
                                                    )}
                                                </Text>
                                            </Stack>
                                        </HoverCard.Dropdown>
                                    </HoverCard>
                                </Group>

                                <NumberInput
                                    key={form.key('nodeConsumptionMultiplier')}
                                    allowDecimal
                                    allowedDecimalSeparators={['.']}
                                    allowNegative={false}
                                    clampBehavior="strict"
                                    decimalScale={1}
                                    fixedDecimalScale
                                    handlersRef={nodeConsumptionRef}
                                    hideControls
                                    leftSection={
                                        <ActionIcon
                                            color="red"
                                            radius="sm"
                                            size={22}
                                            variant="light"
                                            onClick={() => nodeConsumptionRef.current?.decrement()}
                                        >
                                            <TbMinus size={13} />
                                        </ActionIcon>
                                    }
                                    leftSectionPointerEvents="all"
                                    leftSectionWidth={32}
                                    max={100.0}
                                    min={0}
                                    rightSection={
                                        <ActionIcon
                                            color="teal"
                                            radius="sm"
                                            size={22}
                                            variant="light"
                                            onClick={() => nodeConsumptionRef.current?.increment()}
                                        >
                                            <TbPlus size={13} />
                                        </ActionIcon>
                                    }
                                    rightSectionPointerEvents="all"
                                    rightSectionWidth={32}
                                    size="xs"
                                    step={0.1}
                                    styles={{
                                        input: {
                                            textAlign: 'center',
                                            fontWeight: 600,
                                            fontVariantNumeric: 'tabular-nums'
                                        }
                                    }}
                                    {...form.getInputProps('nodeConsumptionMultiplier')}
                                />

                                <Group gap={4} justify="center">
                                    {PRESET_MULTIPLIERS.map((preset) => {
                                        const active = Number(nodeMultiplier) === preset
                                        return (
                                            <Badge
                                                key={preset}
                                                className={surface.quickChip}
                                                color={active ? 'indigo' : 'gray'}
                                                size="xs"
                                                variant={active ? 'filled' : 'light'}
                                                onClick={() =>
                                                    applyPreset('nodeConsumptionMultiplier', preset)
                                                }
                                            >
                                                {preset.toFixed(1)}x
                                            </Badge>
                                        )
                                    })}
                                </Group>
                            </Stack>
                        </Paper>
                    </SimpleGrid>
                </SectionCard.Section>
            </SectionCard.Root>
        </MotionWrapper>
    )
}
