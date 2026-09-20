import { Badge, Code, Group, SimpleGrid, Stack, Switch, Text, TextInput } from '@mantine/core'
import { UseFormReturnType } from '@mantine/form'
import { GetNodeCommand, UpdateNodeCommand } from '@remnawave/backend-contract'
import { ForwardRefComponent, HTMLMotionProps, Variants } from 'motion/react'
import { TbLock, TbPackage, TbRoute, TbVersions } from 'react-icons/tb'

import { BaseOverlayHeader } from '@shared/ui/overlays/base-overlay-header'
import { SectionCard } from '@shared/ui/section-card'

interface IProps<T extends UpdateNodeCommand.RequestBody> {
    cardVariants: Variants
    form: UseFormReturnType<T>
    motionWrapper: ForwardRefComponent<HTMLDivElement, HTMLMotionProps<'div'>>
    node: GetNodeCommand.Response['response']
}

export const NodeDeploymentCard = <T extends UpdateNodeCommand.RequestBody>(props: IProps<T>) => {
    const { cardVariants, form, motionWrapper: MotionWrapper, node } = props
    const inventory = node.runtimeInventory
    const supportsSni = inventory?.capabilities.includes('node_api_sni_v1') === true
    const enforcesSni = inventory?.capabilities.includes('node_api_sni_enforced_v1') === true

    return (
        <MotionWrapper variants={cardVariants}>
            <SectionCard.Root>
                <SectionCard.Section>
                    <BaseOverlayHeader
                        iconColor="violet"
                        IconComponent={TbVersions}
                        iconVariant="soft"
                        subtitle="Current, expected and rollout state"
                        title="Deployment inventory"
                        titleOrder={5}
                    />
                </SectionCard.Section>
                <SectionCard.Section>
                    <Stack gap="md">
                        <SimpleGrid cols={{ base: 1, sm: 2 }}>
                            <TextInput
                                key={form.key('expectedAgentVersion')}
                                label="Expected Agent version"
                                {...form.getInputProps('expectedAgentVersion')}
                                leftSection={<TbVersions size={16} />}
                                placeholder="3.11.0"
                            />
                            <TextInput
                                key={form.key('expectedAgentImageTag')}
                                label="Expected image tag"
                                {...form.getInputProps('expectedAgentImageTag')}
                                leftSection={<TbPackage size={16} />}
                                placeholder="3.11.0"
                            />
                        </SimpleGrid>
                        <TextInput
                            key={form.key('rolloutBatch')}
                            label="Rollout batch"
                            {...form.getInputProps('rolloutBatch')}
                            leftSection={<TbRoute size={16} />}
                            placeholder="canary / non-hk / hk-last"
                        />

                        <Group gap="xs">
                            <Badge color={node.versionDrift ? 'red' : 'teal'} variant="light">
                                {node.versionDrift === null
                                    ? 'No expected version'
                                    : node.versionDrift
                                      ? 'Version drift'
                                      : 'Version aligned'}
                            </Badge>
                            <Badge color="gray" variant="light">
                                {inventory?.architecture ?? 'unknown arch'}
                            </Badge>
                            <Badge color="gray" variant="light">
                                {inventory?.runtimeMode ?? 'no inventory'}
                            </Badge>
                        </Group>

                        <Stack gap={2}>
                            <Text c="dimmed" size="xs">
                                Last reported
                            </Text>
                            <Code>
                                {inventory?.reportedAt
                                    ? new Date(inventory.reportedAt).toLocaleString()
                                    : 'Never'}
                            </Code>
                        </Stack>

                        <Switch
                            key={form.key('nodeApiSniEnabled')}
                            label="Send derived Node API SNI"
                            {...form.getInputProps('nodeApiSniEnabled', { type: 'checkbox' })}
                            description={
                                supportsSni
                                    ? `Agent supports SNI${enforcesSni ? ' and currently enforces it' : ''}. Enable Agent enforcement only after this switch succeeds.`
                                    : 'Unavailable until the Agent reports node_api_sni_v1.'
                            }
                            disabled={!supportsSni && !node.nodeApiSniEnabled}
                            thumbIcon={<TbLock size={12} />}
                        />
                        {node.nodeApiSniEnabled && (
                            <Text c={node.nodeApiSniLastSuccessAt ? 'teal' : 'orange'} size="xs">
                                Last successful gated handshake:{' '}
                                {node.nodeApiSniLastSuccessAt
                                    ? new Date(node.nodeApiSniLastSuccessAt).toLocaleString()
                                    : 'not observed yet'}
                            </Text>
                        )}
                    </Stack>
                </SectionCard.Section>
            </SectionCard.Root>
        </MotionWrapper>
    )
}
