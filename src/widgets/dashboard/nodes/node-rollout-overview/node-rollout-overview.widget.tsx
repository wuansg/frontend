import { Badge, Group, Paper, SegmentedControl, SimpleGrid, Stack, Text } from '@mantine/core'
import { GetNodesCommand } from '@remnawave/backend-contract'

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

const Distribution = ({ title, values }: { title: string; values: Array<[string, number]> }) => (
    <Paper p="sm" radius="md" withBorder>
        <Stack gap="xs">
            <Text c="dimmed" fw={600} size="xs" tt="uppercase">
                {title}
            </Text>
            <Group gap={6}>
                {values.map(([label, count]) => (
                    <Badge color="gray" key={label} variant="light">
                        {label} · {count}
                    </Badge>
                ))}
            </Group>
        </Stack>
    </Paper>
)

export const NodeRolloutOverview = ({ filter, nodes, onFilterChange }: IProps) => {
    const drift = nodes.filter((node) => node.versionDrift === true).length
    const missingSni = nodes.filter(
        (node) => !node.runtimeInventory?.capabilities.includes('node_api_sni_v1')
    ).length

    return (
        <Paper p="md" radius="md" withBorder>
            <Stack gap="md">
                <Group justify="space-between">
                    <Stack gap={0}>
                        <Text fw={600}>Node rollout inventory</Text>
                        <Text c="dimmed" size="xs">
                            Persisted last-known state remains visible while a node is offline.
                        </Text>
                    </Stack>
                    <SegmentedControl
                        data={[
                            { label: `All ${nodes.length}`, value: 'all' },
                            { label: `Drift ${drift}`, value: 'drift' },
                            { label: `Missing SNI ${missingSni}`, value: 'missing-sni' }
                        ]}
                        onChange={(value) => onFilterChange(value as NodeRolloutFilter)}
                        size="xs"
                        value={filter}
                    />
                </Group>
                <SimpleGrid cols={{ base: 1, md: 2, xl: 4 }}>
                    <Distribution
                        title="Agent version"
                        values={countBy(
                            nodes,
                            (node) => node.runtimeInventory?.agentVersion ?? 'unknown'
                        )}
                    />
                    <Distribution
                        title="Architecture"
                        values={countBy(
                            nodes,
                            (node) => node.runtimeInventory?.architecture ?? 'unknown'
                        )}
                    />
                    <Distribution
                        title="Runtime mode"
                        values={countBy(
                            nodes,
                            (node) => node.runtimeInventory?.runtimeMode ?? 'unknown'
                        )}
                    />
                    <Distribution
                        title="Country"
                        values={countBy(nodes, (node) => node.countryCode || 'XX')}
                    />
                </SimpleGrid>
            </Stack>
        </Paper>
    )
}
