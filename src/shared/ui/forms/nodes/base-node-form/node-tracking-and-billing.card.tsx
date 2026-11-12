import {
    Button,
    Collapse,
    Divider,
    Group,
    NumberInput,
    Paper,
    SimpleGrid,
    Stack,
    Switch,
    TagsInput,
    Text,
    Textarea
} from '@mantine/core'
import { UseFormReturnType } from '@mantine/form'
import { CreateNodeCommand, UpdateNodeCommand } from '@remnawave/backend-contract'
import clsx from 'clsx'
import { ForwardRefComponent, HTMLMotionProps, Variants } from 'motion/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PiTagDuotone } from 'react-icons/pi'
import { TbBell, TbChartBar, TbChartLine, TbClock, TbExternalLink } from 'react-icons/tb'

import { useGetNodesTags } from '@shared/api/hooks'
import { TrafficLimitInput } from '@shared/ui/forms/traffic-limit-input'
import { SelectInfraProviderShared } from '@shared/ui/infra-billing/select-infra-provider/select-infra-provider.shared'
import surface from '@shared/ui/node-panel-surface.module.css'
import { BaseOverlayHeader } from '@shared/ui/overlays/base-overlay-header'
import { SectionCard } from '@shared/ui/section-card'
import { TagInputPill } from '@shared/ui/tag-input-pill'

const URL_REGEX = /https?:\/\/[^\s]+/i

function extractFirstUrl(text: string): null | string {
    const match = text.match(URL_REGEX)
    return match ? match[0] : null
}

interface IProps<T extends CreateNodeCommand.RequestBody | UpdateNodeCommand.RequestBody> {
    cardVariants: Variants
    form: UseFormReturnType<T>
    motionWrapper: ForwardRefComponent<HTMLDivElement, HTMLMotionProps<'div'>>
}

export const NodeTrackingAndBillingCard = <
    T extends CreateNodeCommand.RequestBody | UpdateNodeCommand.RequestBody
>(
    props: IProps<T>
) => {
    const { t } = useTranslation()
    const { data: nodesTags } = useGetNodesTags()
    const { cardVariants, form, motionWrapper: MotionWrapper } = props

    const [advancedOpened, setAdvancedOpened] = useState<boolean>(() =>
        Boolean(form.getValues().isTrafficTrackingActive)
    )
    const [firstNoteUrl, setFirstNoteUrl] = useState<null | string>(() =>
        extractFirstUrl(typeof form.getValues().note === 'string' ? form.getValues().note! : '')
    )

    form.watch('isTrafficTrackingActive', ({ value }) => {
        setAdvancedOpened(value ?? false)
    })

    form.watch('note', ({ value }) => {
        setFirstNoteUrl(extractFirstUrl(typeof value === 'string' ? value : ''))
    })

    return (
        <MotionWrapper variants={cardVariants}>
            <SectionCard.Root>
                <SectionCard.Section>
                    <BaseOverlayHeader
                        iconColor="yellow"
                        IconComponent={TbChartBar}
                        iconVariant="soft"
                        subtitle={t('base-node-form.tracking-subtitle')}
                        title={t('base-node-form.tracking-and-billing')}
                        titleOrder={5}
                    />
                </SectionCard.Section>
                <SectionCard.Section>
                    <Stack gap="sm">
                        <SelectInfraProviderShared
                            selectedInfraProviderUuid={form.getValues().providerUuid}
                            size="xs"
                            setSelectedInfraProviderUuid={(providerUuid) => {
                                form.setValues({
                                    providerUuid
                                } as Partial<T>)
                                form.setTouched({
                                    providerUuid: true
                                })
                                form.setDirty({
                                    providerUuid: true
                                })
                            }}
                        />

                        <Paper
                            className={clsx(
                                surface.subPanel,
                                advancedOpened ? surface.accentTeal : surface.accentMuted
                            )}
                            p="sm"
                            radius="md"
                        >
                            <Stack gap="xs">
                                <Group gap="xs" justify="space-between" wrap="nowrap">
                                    <Group gap="xs" wrap="nowrap">
                                        <TbChartLine
                                            size={16}
                                            style={{
                                                color: advancedOpened
                                                    ? 'var(--mantine-color-teal-4)'
                                                    : 'var(--mantine-color-dimmed)'
                                            }}
                                        />
                                        <Text fw={500} size="sm">
                                            {t('base-node-form.traffic-tracking')}
                                        </Text>
                                    </Group>
                                    <Switch
                                        key={form.key('isTrafficTrackingActive')}
                                        color="teal"
                                        size="sm"
                                        {...form.getInputProps('isTrafficTrackingActive', {
                                            type: 'checkbox'
                                        })}
                                        onChange={(event) => {
                                            form.getInputProps('isTrafficTrackingActive').onChange(
                                                event
                                            )
                                            setAdvancedOpened(event.currentTarget.checked)
                                        }}
                                    />
                                </Group>

                                <Collapse expanded={advancedOpened}>
                                    <Stack gap="xs" pt={4}>
                                        <Divider opacity={0.25} />

                                        <TrafficLimitInput
                                            key={form.key('trafficLimitBytes')}
                                            hideControls
                                            label={t('base-node-form.limit')}
                                            leftSection={<TbChartLine size={15} />}
                                            size="xs"
                                            {...form.getInputProps('trafficLimitBytes')}
                                        />

                                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                                            <NumberInput
                                                key={form.key('trafficResetDay')}
                                                allowDecimal={false}
                                                allowNegative={false}
                                                clampBehavior="strict"
                                                decimalScale={0}
                                                hideControls
                                                label={t('base-node-form.reset-day')}
                                                leftSection={<TbClock size={15} />}
                                                max={31}
                                                min={1}
                                                placeholder={t('base-node-form.e-g-1-31')}
                                                size="xs"
                                                {...form.getInputProps('trafficResetDay')}
                                            />

                                            <NumberInput
                                                key={form.key('notifyPercent')}
                                                allowDecimal={false}
                                                allowNegative={false}
                                                clampBehavior="strict"
                                                decimalScale={0}
                                                hideControls
                                                label={t('base-node-form.notify-percent')}
                                                leftSection={<TbBell size={15} />}
                                                max={100}
                                                placeholder={t('base-node-form.e-g-50')}
                                                size="xs"
                                                {...form.getInputProps('notifyPercent')}
                                            />
                                        </SimpleGrid>
                                    </Stack>
                                </Collapse>
                            </Stack>
                        </Paper>

                        <TagsInput
                            key={form.key('tags')}
                            clearable
                            data={nodesTags?.tags || []}
                            label={t('use-nodes-table-widget.tags')}
                            leftSection={<PiTagDuotone size="15px" />}
                            maxTags={10}
                            placeholder={t('base-node-form.tags-placeholder')}
                            size="xs"
                            splitChars={[',', ' ', ';']}
                            {...form.getInputProps('tags')}
                            error={
                                Object.keys(form.errors)
                                    .filter((key) => key.startsWith('tags.'))
                                    .map((key) => form.errors[key])
                                    .join(', ') || form.getInputProps('tags').error
                            }
                            renderPill={({ value, onRemove }) => (
                                <TagInputPill value={value} onRemove={onRemove} />
                            )}
                        />

                        <Stack gap={6}>
                            <Textarea
                                key={form.key('note')}
                                autosize
                                label={t('node-tracking-and-billing.card.note')}
                                maxRows={6}
                                minRows={2}
                                size="xs"
                                {...form.getInputProps('note')}
                            />
                            {firstNoteUrl && (
                                <Button
                                    component="a"
                                    href={firstNoteUrl}
                                    leftSection={<TbExternalLink size={14} />}
                                    maw="100%"
                                    rel="noopener noreferrer"
                                    size="xs"
                                    target="_blank"
                                    variant="soft"
                                    w="fit-content"
                                >
                                    {t('common.open')}
                                </Button>
                            )}
                        </Stack>
                    </Stack>
                </SectionCard.Section>
            </SectionCard.Root>
        </MotionWrapper>
    )
}
