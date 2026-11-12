import {
    Autocomplete,
    Badge,
    Button,
    Group,
    Paper,
    SimpleGrid,
    Stack,
    Switch,
    Text,
    TextInput,
    Tooltip
} from '@mantine/core'
import { UseFormReturnType } from '@mantine/form'
import { GetNodeCommand, UpdateNodeCommand } from '@remnawave/backend-contract'
import clsx from 'clsx'
import dayjs from 'dayjs'
import { ForwardRefComponent, HTMLMotionProps, Variants } from 'motion/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TbHistory, TbLock, TbPackage, TbRoute, TbVersions } from 'react-icons/tb'

import surface from '@shared/ui/node-panel-surface.module.css'
import { BaseOverlayHeader } from '@shared/ui/overlays/base-overlay-header'
import { SectionCard } from '@shared/ui/section-card'

interface IProps<T extends UpdateNodeCommand.RequestBody> {
    cardVariants: Variants
    form: UseFormReturnType<T>
    motionWrapper: ForwardRefComponent<HTMLDivElement, HTMLMotionProps<'div'>>
    node: GetNodeCommand.Response['response']
    onOpenDeployments?: () => void
}

const ROLLOUT_SUGGESTIONS = ['canary', 'non-hk', 'hk-last', 'edge-relay']

export const NodeDeploymentCard = <T extends UpdateNodeCommand.RequestBody>(props: IProps<T>) => {
    const { cardVariants, form, motionWrapper: MotionWrapper, node, onOpenDeployments } = props
    const { t } = useTranslation()

    const inventory = node.runtimeInventory
    const runningVersion = inventory?.agentVersion ?? node.versions?.node ?? null
    const supportsSni = inventory?.capabilities.includes('node_api_sni_v1') === true
    const enforcesSni = inventory?.capabilities.includes('node_api_sni_enforced_v1') === true

    const [expectedVersionValue, setExpectedVersionValue] = useState<string>(
        () => form.getValues().expectedAgentVersion ?? ''
    )
    const [sniEnabled, setSniEnabled] = useState<boolean>(() =>
        Boolean(form.getValues().nodeApiSniEnabled ?? node.nodeApiSniEnabled)
    )

    form.watch('expectedAgentVersion', ({ value }) => {
        setExpectedVersionValue(value ?? '')
    })
    form.watch('nodeApiSniEnabled', ({ value }) => {
        setSniEnabled(Boolean(value))
    })

    const driftBadge =
        node.versionDrift === null
            ? { color: 'gray', label: t('node-deployment-card.status-no-expected') }
            : node.versionDrift
              ? { color: 'red', label: t('node-deployment-card.status-drift') }
              : { color: 'teal', label: t('node-deployment-card.status-aligned') }

    const subtitle = runningVersion
        ? t('node-deployment-card.subtitle-running', {
              version: runningVersion,
              arch: inventory?.architecture ?? t('node-deployment-card.unknown-arch')
          })
        : t('node-deployment-card.subtitle-default')

    const applyRunningVersion = () => {
        if (!runningVersion) return
        form.setFieldValue('expectedAgentVersion' as never, runningVersion as never)
        form.setFieldValue('expectedAgentImageTag' as never, runningVersion as never)
        form.setTouched({
            expectedAgentVersion: true,
            expectedAgentImageTag: true
        } as never)
        form.setDirty({
            expectedAgentVersion: true,
            expectedAgentImageTag: true
        } as never)
    }

    const showUseRunningChip =
        Boolean(runningVersion) && expectedVersionValue.trim() !== runningVersion

    const runtimeModeLabel = (() => {
        switch (inventory?.runtimeMode) {
            case 'CORE_ACTIVE':
                return t('node-status-badge.widget.core-active')
            case 'FORWARDING_ONLY':
                return t('node-status-badge.widget.forwarding-only')
            case 'IDLE':
                return t('node-status-badge.widget.idle')
            case 'DEGRADED':
                return t('node-status-badge.widget.degraded')
            default:
                return inventory?.runtimeMode ?? t('node-deployment-card.no-inventory')
        }
    })()

    return (
        <MotionWrapper variants={cardVariants}>
            <SectionCard.Root>
                <SectionCard.Section>
                    <Group gap="xs" justify="space-between" wrap="nowrap">
                        <BaseOverlayHeader
                            iconColor="violet"
                            IconComponent={TbVersions}
                            iconVariant="soft"
                            subtitle={subtitle}
                            title={t('node-deployment-card.title')}
                            titleOrder={5}
                            truncateTitle
                        />

                        <Group gap={6} style={{ flexShrink: 0 }} wrap="nowrap">
                            <Badge color={driftBadge.color} size="sm" variant="light">
                                {driftBadge.label}
                            </Badge>
                            {onOpenDeployments && (
                                <Button
                                    color="violet"
                                    leftSection={<TbHistory size={14} />}
                                    size="compact-xs"
                                    variant="light"
                                    onClick={onOpenDeployments}
                                >
                                    {t('node-deployment-card.releases-button')}
                                </Button>
                            )}
                        </Group>
                    </Group>
                </SectionCard.Section>

                <SectionCard.Section>
                    <Stack gap="sm">
                        <Paper className={surface.subPanel} p="sm" radius="md">
                            <Group gap={6} justify="space-between" wrap="wrap">
                                <Group gap={6} wrap="wrap">
                                    <Badge color="violet" size="xs" variant="light">
                                        {inventory?.architecture ??
                                            t('node-deployment-card.unknown-arch')}
                                    </Badge>
                                    <Badge color="cyan" size="xs" variant="light">
                                        {runtimeModeLabel}
                                    </Badge>
                                    <Badge
                                        color={enforcesSni ? 'teal' : supportsSni ? 'blue' : 'gray'}
                                        size="xs"
                                        variant="light"
                                    >
                                        {enforcesSni
                                            ? t('node-deployment-card.sni-enforced')
                                            : supportsSni
                                              ? t('node-deployment-card.sni-supported')
                                              : t('node-deployment-card.sni-unsupported')}
                                    </Badge>
                                </Group>

                                {inventory?.reportedAt ? (
                                    <Tooltip
                                        label={new Date(inventory.reportedAt).toLocaleString()}
                                    >
                                        <Badge color="gray" size="xs" variant="light">
                                            {t('node-deployment-card.last-reported', {
                                                time: dayjs(inventory.reportedAt).format(
                                                    'MM-DD HH:mm'
                                                )
                                            })}
                                        </Badge>
                                    </Tooltip>
                                ) : (
                                    <Badge color="gray" size="xs" variant="outline">
                                        {t('node-deployment-card.never-reported')}
                                    </Badge>
                                )}
                            </Group>
                        </Paper>

                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                            <TextInput
                                key={form.key('expectedAgentVersion')}
                                label={t('node-deployment-card.expected-agent-version')}
                                leftSection={<TbVersions size={15} />}
                                placeholder={runningVersion ?? '3.16.4'}
                                size="xs"
                                {...form.getInputProps('expectedAgentVersion')}
                            />
                            <TextInput
                                key={form.key('expectedAgentImageTag')}
                                label={t('node-deployment-card.expected-image-tag')}
                                leftSection={<TbPackage size={15} />}
                                placeholder={runningVersion ?? '3.16.4'}
                                size="xs"
                                {...form.getInputProps('expectedAgentImageTag')}
                            />
                        </SimpleGrid>

                        {showUseRunningChip && runningVersion && (
                            <Group gap={6}>
                                <Badge
                                    className={surface.quickChip}
                                    color="violet"
                                    size="xs"
                                    variant="light"
                                    onClick={applyRunningVersion}
                                >
                                    {t('node-deployment-card.use-running-version', {
                                        version: runningVersion
                                    })}
                                </Badge>
                            </Group>
                        )}

                        <Autocomplete
                            key={form.key('rolloutBatch')}
                            data={ROLLOUT_SUGGESTIONS}
                            label={t('node-deployment-card.rollout-batch')}
                            leftSection={<TbRoute size={15} />}
                            placeholder="canary / non-hk / hk-last"
                            size="xs"
                            {...form.getInputProps('rolloutBatch')}
                        />

                        <Paper
                            className={clsx(
                                surface.subPanel,
                                sniEnabled ? surface.accentTeal : surface.accentMuted
                            )}
                            p="sm"
                            radius="md"
                        >
                            <Stack gap={6}>
                                <Group align="center" justify="space-between" wrap="nowrap">
                                    <Switch
                                        key={form.key('nodeApiSniEnabled')}
                                        color="teal"
                                        disabled={!supportsSni && !node.nodeApiSniEnabled}
                                        label={t('node-deployment-card.sni-label')}
                                        size="sm"
                                        thumbIcon={<TbLock size={11} />}
                                        {...form.getInputProps('nodeApiSniEnabled', {
                                            type: 'checkbox'
                                        })}
                                    />

                                    {(sniEnabled || node.nodeApiSniEnabled) && (
                                        <Badge
                                            color={node.nodeApiSniLastSuccessAt ? 'teal' : 'orange'}
                                            size="xs"
                                            style={{ flexShrink: 0 }}
                                            variant="light"
                                        >
                                            {node.nodeApiSniLastSuccessAt
                                                ? t('node-deployment-card.sni-handshake-ok', {
                                                      time: dayjs(
                                                          node.nodeApiSniLastSuccessAt
                                                      ).format('MM-DD HH:mm')
                                                  })
                                                : t('node-deployment-card.sni-handshake-pending')}
                                        </Badge>
                                    )}
                                </Group>

                                <Text c="dimmed" size="xs">
                                    {supportsSni
                                        ? t('node-deployment-card.sni-description-supported')
                                        : t('node-deployment-card.sni-unsupported')}
                                </Text>
                            </Stack>
                        </Paper>
                    </Stack>
                </SectionCard.Section>
            </SectionCard.Root>
        </MotionWrapper>
    )
}
