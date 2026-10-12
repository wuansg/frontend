import NiceModal, { useModal } from '@ebay/nice-modal-react'
import {
    Alert,
    Badge,
    Box,
    Button,
    Code,
    Group,
    Loader,
    Modal,
    MultiSelect,
    Select,
    Stack,
    Table,
    Tabs,
    Text
} from '@mantine/core'
import { modals } from '@mantine/modals'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useNiceMantineModal } from '@shared/_modals/use-nice-modal'

import { nodeDeploymentsAPI } from './node-deployments.api'

export const NodeDeploymentsModal = NiceModal.create(({ nodeUuid }: { nodeUuid: string }) => {
    const modal = useModal()
    const { modalProps } = useNiceMantineModal({ modal })
    const { i18n } = useTranslation()
    const zh = i18n.language.startsWith('zh'),
        l = (cn: string, en: string) => (zh ? cn : en)
    const client = useQueryClient()
    const [selected, setSelected] = useState<string[]>([nodeUuid])
    const [canary, setCanary] = useState<string | null>(nodeUuid)
    const key = ['node-deployments', nodeUuid]
    const query = useQuery({
        queryKey: key,
        queryFn: () => nodeDeploymentsAPI.history(nodeUuid),
        refetchInterval: 3000
    })
    const action = useMutation({
        mutationFn: (run: () => Promise<unknown>) => run(),
        onSuccess: () => client.invalidateQueries({ queryKey: key })
    })
    const confirm = (title: string, description: string, run: () => Promise<unknown>) =>
        modals.openConfirmModal({
            title,
            children: <Text size="sm">{description}</Text>,
            labels: { confirm: l('确认', 'Confirm'), cancel: l('取消', 'Cancel') },
            onConfirm: () => action.mutate(run),
            centered: true
        })
    const data = query.data
    const busy = action.isPending || Boolean(data?.state?.applying)
    const color = (state: string) =>
        state === 'APPLIED' || state === 'NO_CORE'
            ? 'teal'
            : ['FAILED', 'ROLLED_BACK', 'UNKNOWN'].includes(state)
              ? 'red'
              : 'gray'
    const when = (date: string) => new Date(date).toLocaleString(zh ? 'zh-CN' : 'en-GB')
    const name = (id: string) => data?.eligibleNodes.find((n) => n.uuid === id)?.name ?? id
    return (
        <Modal
            {...modalProps}
            size="1100px"
            title={l('配置发布与回滚', 'Configuration releases & rollback')}
        >
            <Stack>
                <Alert color="blue">
                    {l(
                        '快照仅包含配置模板，回滚时重新注入当前有效用户。历史仅显示摘要，不展示密码和私钥。',
                        'Snapshots contain configuration templates only. Rollback injects current authorized users; passwords and private keys are never displayed.'
                    )}
                </Alert>
                {(query.error || action.error) && (
                    <Alert color="red">{(query.error || action.error)?.message}</Alert>
                )}
                {query.isPending && <Loader />}
                {data && (
                    <>
                        <Group justify="space-between" wrap="wrap">
                            <Box>
                                <Text size="sm">
                                    {l('当前版本', 'Active revision')}:{' '}
                                    <Code>
                                        {data.state?.appliedRevisionUuid?.slice(0, 8) ?? '—'}
                                    </Code>
                                </Text>
                                <Text size="xs" c="dimmed">
                                    {data.state?.applying
                                        ? l('正在应用', 'Applying')
                                        : data.state &&
                                            data.state.requestedSeq !== data.state.processedSeq
                                          ? l('等待同步', 'Pending reconciliation')
                                          : l('已同步', 'Reconciled')}
                                    {data.state?.lastError ? ` · ${data.state.lastError}` : ''}
                                </Text>
                            </Box>
                            {(data.state?.pinnedRevisionUuid || data.state?.blocked) && (
                                <Button
                                    disabled={busy}
                                    variant="light"
                                    onClick={() =>
                                        confirm(
                                            l('恢复当前 Profile', 'Resume current profile'),
                                            l(
                                                '解除固定版本后应用当前 Profile，不会恢复历史用户。',
                                                'Unpin this revision and apply the current profile without restoring historical users.'
                                            ),
                                            () => nodeDeploymentsAPI.resume(nodeUuid)
                                        )
                                    }
                                >
                                    {l('解除固定版本', 'Unpin revision')}
                                </Button>
                            )}
                        </Group>
                        <Tabs defaultValue="deployments">
                            <Tabs.List>
                                <Tabs.Tab value="deployments">
                                    {l('发布记录', 'Deployments')}
                                </Tabs.Tab>
                                <Tabs.Tab value="revisions">{l('配置版本', 'Revisions')}</Tabs.Tab>
                                <Tabs.Tab value="batch">{l('灰度批次', 'Canary batches')}</Tabs.Tab>
                            </Tabs.List>
                            <Tabs.Panel value="deployments" pt="md">
                                <Stack gap="xs">
                                    {!data.deployments.length && (
                                        <Text c="dimmed">
                                            {l('暂无发布记录', 'No deployments yet')}
                                        </Text>
                                    )}
                                    {data.deployments.map((d) => (
                                        <Box
                                            key={d.uuid}
                                            p="sm"
                                            style={{
                                                border: '1px solid var(--mantine-color-default-border)',
                                                borderRadius: 8,
                                                overflowWrap: 'anywhere'
                                            }}
                                        >
                                            <Group justify="space-between">
                                                <Text size="sm">{when(d.startedAt)}</Text>
                                                <Badge color={color(d.state)}>{d.state}</Badge>
                                            </Group>
                                            <Text size="sm">
                                                {d.reason} · {d.revisionUuid?.slice(0, 8) ?? '—'} ·{' '}
                                                {d.durationMs === null ? '—' : `${d.durationMs} ms`}
                                            </Text>
                                            <Text size="xs" c="dimmed">
                                                {l('操作者', 'Actor')}:{' '}
                                                {d.actorUuid ?? l('系统', 'System')}
                                                {d.batchUuid
                                                    ? ` · ${l('批次', 'Batch')}: ${d.batchUuid.slice(0, 8)}`
                                                    : ''}
                                            </Text>
                                            {(d.errorCode || d.rollback) && (
                                                <Text size="xs" c="red">
                                                    {d.errorCode} {d.rollback}
                                                </Text>
                                            )}
                                            <Text size="xs" c="dimmed">
                                                {l('请求 / 活跃 hash', 'Requested / active hash')}:{' '}
                                                {d.requestedHash?.slice(0, 12) ?? '—'} /{' '}
                                                {d.activeHash?.slice(0, 12) ?? '—'}
                                            </Text>
                                        </Box>
                                    ))}
                                </Stack>
                            </Tabs.Panel>
                            <Tabs.Panel value="revisions" pt="md">
                                <Table.ScrollContainer minWidth={620}>
                                    <Table>
                                        <Table.Thead>
                                            <Table.Tr>
                                                <Table.Th>{l('版本', 'Revision')}</Table.Th>
                                                <Table.Th>{l('创建时间', 'Created')}</Table.Th>
                                                <Table.Th>
                                                    {l('变更区段', 'Changed sections')}
                                                </Table.Th>
                                                <Table.Th>{l('操作', 'Action')}</Table.Th>
                                            </Table.Tr>
                                        </Table.Thead>
                                        <Table.Tbody>
                                            {data.revisions.map((r) => (
                                                <Table.Tr key={r.uuid}>
                                                    <Table.Td>
                                                        <Code>{r.uuid.slice(0, 8)}</Code>
                                                        {data.state?.pinnedRevisionUuid ===
                                                            r.uuid && (
                                                            <Badge size="xs">
                                                                {l('固定', 'Pinned')}
                                                            </Badge>
                                                        )}
                                                    </Table.Td>
                                                    <Table.Td>{when(r.createdAt)}</Table.Td>
                                                    <Table.Td>
                                                        <Text size="xs">
                                                            {r.changedSections.join(', ') || '—'}
                                                        </Text>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Button
                                                            size="xs"
                                                            color="orange"
                                                            disabled={
                                                                busy ||
                                                                r.uuid ===
                                                                    data.state
                                                                        ?.appliedRevisionUuid ||
                                                                !data.deployments.some(
                                                                    (d) =>
                                                                        d.revisionUuid === r.uuid &&
                                                                        d.state === 'APPLIED'
                                                                )
                                                            }
                                                            onClick={() =>
                                                                confirm(
                                                                    l(
                                                                        '回滚配置',
                                                                        'Roll back configuration'
                                                                    ),
                                                                    l(
                                                                        '只恢复此配置模板，并使用当前授权用户。成功后固定此版本，直到解除固定或显式更新 Profile。',
                                                                        'Restore this template using current authorized users. The revision stays pinned until unpinned or the profile is explicitly updated.'
                                                                    ),
                                                                    () =>
                                                                        nodeDeploymentsAPI.rollback(
                                                                            nodeUuid,
                                                                            r.uuid
                                                                        )
                                                                )
                                                            }
                                                        >
                                                            {l('回滚', 'Roll back')}
                                                        </Button>
                                                    </Table.Td>
                                                </Table.Tr>
                                            ))}
                                        </Table.Tbody>
                                    </Table>
                                </Table.ScrollContainer>
                            </Tabs.Panel>
                            <Tabs.Panel value="batch" pt="md">
                                <Stack>
                                    <Text size="sm" c="dimmed">
                                        {l(
                                            '先在 Profile 编辑器选择“仅保存，稍后灰度”。此处固定本次模板，先应用灰度节点；确认 hash 成功后逐台继续，失败停止后续节点。不会等待额外的人工网络测试。',
                                            'First choose “Save only, deploy later” in the profile editor. This batch snapshots the template, applies the canary first, then proceeds sequentially after a successful hash acknowledgement. A failure stops subsequent nodes; no separate manual network test is performed.'
                                        )}
                                    </Text>
                                    <MultiSelect
                                        searchable
                                        label={l('同 Profile 节点', 'Nodes sharing this profile')}
                                        data={data.eligibleNodes.map((n) => ({
                                            value: n.uuid,
                                            label: n.name,
                                            disabled: !n.isConnected
                                        }))}
                                        value={selected}
                                        onChange={(ids) => {
                                            setSelected(ids)
                                            if (!ids.includes(canary ?? ''))
                                                setCanary(ids[0] ?? null)
                                        }}
                                    />
                                    <Select
                                        label={l('灰度节点', 'Canary node')}
                                        data={data.eligibleNodes
                                            .filter((n) => selected.includes(n.uuid))
                                            .map((n) => ({ value: n.uuid, label: n.name }))}
                                        value={canary}
                                        onChange={setCanary}
                                    />
                                    <Button
                                        disabled={
                                            busy ||
                                            !selected.length ||
                                            !canary ||
                                            !selected.includes(canary) ||
                                            data.batches.some((b) =>
                                                ['PENDING', 'RUNNING'].includes(b.state)
                                            )
                                        }
                                        loading={action.isPending}
                                        onClick={() =>
                                            confirm(
                                                l('开始灰度发布', 'Start canary deployment'),
                                                `${l('首先应用', 'Apply first')}: ${name(canary!)} · ${selected.length} ${l('个节点', 'nodes')}`,
                                                () => nodeDeploymentsAPI.batch(selected, canary!)
                                            )
                                        }
                                    >
                                        {l('开始灰度发布', 'Start canary deployment')}
                                    </Button>
                                    {data.batches.map((b) => (
                                        <Box
                                            key={b.uuid}
                                            p="sm"
                                            style={{
                                                border: '1px solid var(--mantine-color-default-border)',
                                                borderRadius: 8
                                            }}
                                        >
                                            <Group justify="space-between">
                                                <Text size="sm">
                                                    {b.uuid.slice(0, 8)} · {b.nextIndex}/
                                                    {b.nodeUuids.length}
                                                </Text>
                                                <Badge color={color(b.state)}>{b.state}</Badge>
                                            </Group>
                                            <Text size="xs" style={{ overflowWrap: 'anywhere' }}>
                                                {b.nodeUuids.map(name).join(' → ')}
                                                {b.errorCode ? ` · ${b.errorCode}` : ''}
                                            </Text>
                                            {['PENDING', 'RUNNING'].includes(b.state) && (
                                                <Button
                                                    size="xs"
                                                    color="red"
                                                    variant="light"
                                                    mt="xs"
                                                    disabled={action.isPending}
                                                    onClick={() =>
                                                        confirm(
                                                            l(
                                                                '停止后续发布',
                                                                'Stop subsequent deployments'
                                                            ),
                                                            l(
                                                                '当前已在应用的节点会完成；尚未开始的节点不再下发。',
                                                                'An already applying node is allowed to finish. Nodes that have not started will not be dispatched.'
                                                            ),
                                                            () => nodeDeploymentsAPI.cancel(b.uuid)
                                                        )
                                                    }
                                                >
                                                    {l('停止批次', 'Stop batch')}
                                                </Button>
                                            )}
                                        </Box>
                                    ))}
                                </Stack>
                            </Tabs.Panel>
                        </Tabs>
                    </>
                )}
            </Stack>
        </Modal>
    )
})
