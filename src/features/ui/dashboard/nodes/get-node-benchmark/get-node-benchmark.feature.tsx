import { ActionIcon, Tooltip } from '@mantine/core'
import { GetNodeCommand } from '@remnawave/backend-contract'
import { useTranslation } from 'react-i18next'
import { TbCpu, TbNetwork } from 'react-icons/tb'

import { showModal } from '@shared/_modals/show-modal'

export function GetNodeBenchmarkFeature({
    node,
    kind
}: {
    node: GetNodeCommand.Response['response']
    kind: 'HARDWARE' | 'NETWORK'
}) {
    const { i18n } = useTranslation()
    const zh = i18n.language.startsWith('zh')
    const supported = node.runtimeStatus?.capabilities?.includes('node_benchmarks_v1')
    const title =
        kind === 'HARDWARE'
            ? zh
                ? '硬件性能测试'
                : 'Hardware benchmark'
            : zh
              ? '网络测速'
              : 'Network benchmark'
    return (
        <Tooltip
            label={
                supported
                    ? node.isConnected
                        ? title
                        : zh
                          ? '节点离线，可查看历史记录'
                          : 'Node offline; history is available'
                    : zh
                      ? '需要支持测试的 Agent ≥ 3.15.0'
                      : 'Requires a benchmark-capable Agent ≥ 3.15.0'
            }
        >
            <ActionIcon
                aria-label={title}
                disabled={!supported}
                color={kind === 'HARDWARE' ? 'orange' : 'cyan'}
                size="lg"
                variant="soft"
                onClick={() => showModal('nodes_nodeBenchmarkModal', { node, kind })}
            >
                {kind === 'HARDWARE' ? <TbCpu size={22} /> : <TbNetwork size={22} />}
            </ActionIcon>
        </Tooltip>
    )
}
