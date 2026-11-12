import {
    Badge,
    Box,
    Button,
    Collapse,
    Group,
    SegmentedControl,
    SimpleGrid,
    Stack,
    Text
} from '@mantine/core'
import { GetNodesCommand } from '@remnawave/backend-contract'
import { ReactNode, useState } from 'react'
import ReactCountryFlag from 'react-country-flag'
import { useTranslation } from 'react-i18next'
import { TbChevronDown, TbVersions } from 'react-icons/tb'

import surface from '@shared/ui/node-panel-surface.module.css'
import { BaseOverlayHeader } from '@shared/ui/overlays/base-overlay-header'
import { SectionCard } from '@shared/ui/section-card'

export type NodeRolloutFilter = 'all' | 'drift' | 'missing-sni'

interface IProps {
    filter: NodeRolloutFilter
    nodes: GetNodesCommand.Response['response']
    onFilterChange: (value: NodeRolloutFilter) => void
}

const countBy = (
    nodes: GetNodesCommand.Response['response'],
    selector: (node: GetNodesCommand.Response['response'][number]) => string
) =>
    [
        ...nodes.reduce((result, node) => {
            const value = selector(node)
            result.set(value, (result.get(value) ?? 0) + 1)
            return result
        }, new Map<string, number>())
    ].sort((left, right) => right[1] - left[1])

const Distribution = ({
    title,
    values,
    renderItem
}: {
    renderItem?: (label: string, count: number) => ReactNode
    title: string
    values: Array<[string, number]>
}) => (
    <Box className={surface.metricBlock}>
        <Stack gap={6}>
            <Text c="dimmed" fw={600} lh={1.2} lts={0.5} size="10px" tt="uppercase">
                {title}
            </Text>
            <Group gap={6}>
                {values.map(([label, count]) =>
                    renderItem ? (
                        renderItem(label, count)
                    ) : (
                        <Badge
                            className={surface.tabular}
                            color="gray"
                            key={label}
                            size="xs"
                            variant="light"
                        >
                            {label} · {count}
                        </Badge>
                    )
                )}
            </Group>
        </Stack>
    </Box>
)

export const NodeRolloutOverview = ({ filter, nodes, onFilterChange }: IProps) => {
    const { t } = useTranslation()
    const [expanded, setExpanded] = useState(true)

    const connected = nodes.filter((node) => node.isConnected).length
    const drift = nodes.filter((node) => node.versionDrift === true).length
    const missingSni = nodes.filter(
        (node) => !node.runtimeInventory?.capabilities.includes('node_api_sni_v1')
    ).length
    const unknownLabel = t('node-rollout-overview.unknown')

    const renderRuntimeBadge = (mode: string, count: number) => {
        let color = 'gray'
        let label = mode

        if (mode === 'CORE_ACTIVE') {
            color = 'teal'
            label = t('node-status-badge.widget.core-active')
        } else if (mode === 'FORWARDING_ONLY') {
            color = 'blue'
            label = t('node-status-badge.widget.forwarding-only')
        } else if (mode === 'IDLE') {
            color = 'gray'
            label = t('node-status-badge.widget.idle')
        } else if (mode === 'DEGRADED') {
            color = 'orange'
            label = t('node-status-badge.widget.degraded')
        }

        return (
            <Badge className={surface.tabular} color={color} key={mode} size="xs" variant="light">
                {label} · {count}
            </Badge>
        )
    }

    return (
        <SectionCard.Root gap="sm">
            <SectionCard.Section>
                <Group align="center" gap="sm" justify="space-between" wrap="wrap">
                    <BaseOverlayHeader
                        iconColor="violet"
                        IconComponent={TbVersions}
                        iconSize={20}
                        iconVariant="soft"
                        subtitle={t('node-rollout-overview.subtitle', {
                            connected,
                            total: nodes.length
                        })}
                        title={t('node-rollout-overview.title')}
                        titleOrder={5}
                    />

                    <Group gap="xs" wrap="wrap">
                        <SegmentedControl
                            data={[
                                {
                                    label: t('node-rollout-overview.filter-all', {
                                        count: nodes.length
                                    }),
                                    value: 'all'
                                },
                                {
                                    label: t('node-rollout-overview.filter-drift', {
                                        count: drift
                                    }),
                                    value: 'drift'
                                },
                                {
                                    label: t('node-rollout-overview.filter-missing-sni', {
                                        count: missingSni
                                    }),
                                    value: 'missing-sni'
                                }
                            ]}
                            size="xs"
                            value={filter}
                            onChange={(value) => onFilterChange(value as NodeRolloutFilter)}
                        />
                        <Button
                            color="gray"
                            rightSection={
                                <TbChevronDown
                                    size={14}
                                    style={{
                                        transform: expanded ? 'rotate(180deg)' : undefined,
                                        transition: 'transform 160ms ease'
                                    }}
                                />
                            }
                            size="xs"
                            variant="subtle"
                            onClick={() => setExpanded((prev) => !prev)}
                        >
                            {t(
                                expanded
                                    ? 'node-rollout-overview.collapse'
                                    : 'node-rollout-overview.expand'
                            )}
                        </Button>
                    </Group>
                </Group>
            </SectionCard.Section>

            <Collapse expanded={expanded}>
                <SectionCard.Section>
                    <SimpleGrid cols={{ base: 1, sm: 2, xl: 4 }} spacing="xs">
                        <Distribution
                            renderItem={(label, count) => (
                                <Badge
                                    className={surface.tabular}
                                    color={label === unknownLabel ? 'gray' : 'cyan'}
                                    key={label}
                                    size="xs"
                                    variant="light"
                                >
                                    {label} · {count}
                                </Badge>
                            )}
                            title={t('node-rollout-overview.agent-version')}
                            values={countBy(
                                nodes,
                                (node) => node.runtimeInventory?.agentVersion ?? unknownLabel
                            )}
                        />
                        <Distribution
                            renderItem={(label, count) => (
                                <Badge
                                    className={surface.tabular}
                                    color={label === unknownLabel ? 'gray' : 'violet'}
                                    key={label}
                                    size="xs"
                                    variant="light"
                                >
                                    {label} · {count}
                                </Badge>
                            )}
                            title={t('node-rollout-overview.architecture')}
                            values={countBy(
                                nodes,
                                (node) => node.runtimeInventory?.architecture ?? unknownLabel
                            )}
                        />
                        <Distribution
                            renderItem={renderRuntimeBadge}
                            title={t('node-rollout-overview.runtime-mode')}
                            values={countBy(
                                nodes,
                                (node) => node.runtimeInventory?.runtimeMode ?? unknownLabel
                            )}
                        />
                        <Distribution
                            renderItem={(code, count) => (
                                <Badge
                                    className={surface.tabular}
                                    color="gray"
                                    key={code}
                                    leftSection={
                                        code !== 'XX' ? (
                                            <ReactCountryFlag
                                                countryCode={code}
                                                style={{ fontSize: '1.05em' }}
                                                svg
                                            />
                                        ) : undefined
                                    }
                                    size="xs"
                                    variant="light"
                                >
                                    {code} · {count}
                                </Badge>
                            )}
                            title={t('node-rollout-overview.country')}
                            values={countBy(nodes, (node) => node.countryCode || 'XX')}
                        />
                    </SimpleGrid>
                </SectionCard.Section>
            </Collapse>
        </SectionCard.Root>
    )
}
