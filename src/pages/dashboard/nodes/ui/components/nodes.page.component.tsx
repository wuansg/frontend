import { MultiSelectNodesFeature } from '@features/dashboard/nodes/multi-select-nodes/multi-select-nodes.feature'
import { NodesHeaderActionButtonsFeature } from '@features/ui/dashboard/nodes/nodes-header-action-buttons'
import { Stack } from '@mantine/core'
/* eslint-disable no-nested-ternary */
import { GetNodesCommand } from '@remnawave/backend-contract'
import {
    isNodeAttention,
    NodeRolloutFilter,
    NodeRolloutOverview
} from '@widgets/dashboard/nodes/node-rollout-overview'
import { NodesMatrixWidget } from '@widgets/dashboard/nodes/nodes-matrix'
import { NodesRealtimeUsageMetrics } from '@widgets/dashboard/nodes/nodes-realtime-metrics'
import { NodesTableWidget } from '@widgets/dashboard/nodes/nodes-table'
import { motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HiServer } from 'react-icons/hi'
import { useSearchParams } from 'react-router'

import { showModal } from '@shared/_modals/show-modal'
import { queryClient } from '@shared/api'
import { nodesQueryKeys, useReorderNodes } from '@shared/api/hooks'
import { SEARCH_PARAMS } from '@shared/constants/search-params'
import { LoadingScreen, Page, PageHeaderShared } from '@shared/ui'

import {
    NODES_VIEW_MODE,
    useNodesViewMode,
    useViewPreferencesStoreActions
} from '@entities/dashboard/view-preferences-store'

import { IProps } from './interfaces'

export default function NodesPageComponent(props: IProps) {
    const { nodes, isLoading } = props

    const { t } = useTranslation()

    const viewMode = useNodesViewMode()
    const { setNodesViewMode } = useViewPreferencesStoreActions()
    const [selectedRecords, setSelectedRecords] = useState<
        GetNodesCommand.Response['response'][number][]
    >([])
    const [searchParams, setSearchParams] = useSearchParams()
    const [rolloutFilter, setRolloutFilter] = useState<NodeRolloutFilter>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const allNodes = useMemo(() => nodes ?? [], [nodes])

    const isRolloutOrSearchActive = rolloutFilter !== 'all' || searchQuery.trim() !== ''

    const visibleNodes = useMemo(() => {
        let result = allNodes
        if (rolloutFilter === 'online') {
            result = result.filter((node) => node.isConnected)
        } else if (rolloutFilter === 'attention') {
            result = result.filter(isNodeAttention)
        } else if (rolloutFilter === 'drift') {
            result = result.filter((node) => node.versionDrift === true)
        } else if (rolloutFilter === 'missing-sni') {
            result = result.filter(
                (node) => !node.runtimeInventory?.capabilities.includes('node_api_sni_v1')
            )
        }

        const needle = searchQuery.trim().toLowerCase()
        if (needle) {
            result = result.filter(
                (node) =>
                    node.name.toLowerCase().includes(needle) ||
                    node.address.toLowerCase().includes(needle) ||
                    (node.provider?.name ?? '').toLowerCase().includes(needle) ||
                    (node.countryCode ?? '').toLowerCase().includes(needle) ||
                    (node.tags ?? []).some((tag) => tag.toLowerCase().includes(needle))
            )
        }

        return result
    }, [allNodes, rolloutFilter, searchQuery])

    useEffect(() => {
        if (!nodes || isLoading) return
        const nodeUuid = searchParams.get(SEARCH_PARAMS.NODE)
        if (!nodeUuid || !nodes.some((node) => node.uuid === nodeUuid)) return

        showModal('nodes_editNodeModal', { nodeUuid })
        setSearchParams(
            (previous) => {
                const next = new URLSearchParams(previous)
                next.delete(SEARCH_PARAMS.NODE)
                return next
            },
            { replace: true }
        )
    }, [isLoading, nodes, searchParams, setSearchParams])

    const { mutate: reorderNodes } = useReorderNodes({
        mutationFns: {
            onSuccess: (data) => {
                queryClient.setQueryData(nodesQueryKeys.getAllNodes.queryKey, data)
            },
            onError: () => {
                queryClient.invalidateQueries({ queryKey: nodesQueryKeys.getAllNodes.queryKey })
            }
        }
    })

    const moveSelected = useCallback(
        (mode: 'bottom' | 'down' | 'top' | 'up') => {
            if (!nodes || selectedRecords.length === 0) return
            const selected = new Set(selectedRecords.map((record) => record.uuid))

            let next: typeof nodes
            if (mode === 'top' || mode === 'bottom') {
                const sel = nodes.filter((node) => selected.has(node.uuid))
                const rest = nodes.filter((node) => !selected.has(node.uuid))
                next = mode === 'top' ? [...sel, ...rest] : [...rest, ...sel]
            } else {
                next = [...nodes]
                const offset = mode === 'up' ? -1 : 1
                const start = mode === 'up' ? 1 : next.length - 2
                const end = mode === 'up' ? next.length : -1
                const step = mode === 'up' ? 1 : -1

                for (let i = start; i !== end; i += step) {
                    const j = i + offset
                    if (selected.has(next[i].uuid) && !selected.has(next[j].uuid)) {
                        ;[next[i], next[j]] = [next[j], next[i]]
                    }
                }
            }

            const hasOrderChanged = nodes.some((node, index) => node.uuid !== next[index].uuid)
            if (!hasOrderChanged) return

            queryClient.setQueryData(nodesQueryKeys.getAllNodes.queryKey, next)
            reorderNodes({
                variables: {
                    nodes: next.map((node, index) => ({ uuid: node.uuid, viewPosition: index }))
                }
            })
        },
        [nodes, selectedRecords, reorderNodes]
    )

    return (
        <Page title={t('constants.nodes')}>
            <Stack gap="sm">
                <PageHeaderShared
                    actions={
                        <NodesHeaderActionButtonsFeature
                            setViewMode={(nextMode) => {
                                if (nextMode !== NODES_VIEW_MODE.MATRIX) {
                                    setSelectedRecords([])
                                }
                                setNodesViewMode(nextMode)
                            }}
                            viewMode={viewMode}
                        />
                    }
                    icon={<HiServer size={24} />}
                    mb={0}
                    title={t('constants.nodes')}
                    wrapActions
                />

                <NodesRealtimeUsageMetrics isLoading={isLoading} nodes={nodes} />

                <NodeRolloutOverview
                    filter={rolloutFilter}
                    nodes={allNodes}
                    onFilterChange={(value) => {
                        setSelectedRecords([])
                        setRolloutFilter(value)
                    }}
                    onSearchChange={(value) => {
                        setSelectedRecords([])
                        setSearchQuery(value)
                    }}
                    searchQuery={searchQuery}
                />

                {isLoading ? (
                    <LoadingScreen height="60vh" />
                ) : viewMode === NODES_VIEW_MODE.MATRIX ? (
                    <motion.div
                        animate={{ opacity: 1 }}
                        initial={{ opacity: 0 }}
                        transition={{
                            duration: 0.2
                        }}
                    >
                        <NodesMatrixWidget
                            nodes={visibleNodes}
                            selectedRecords={selectedRecords}
                            setSelectedRecords={setSelectedRecords}
                        />
                    </motion.div>
                ) : (
                    <NodesTableWidget
                        disableReordering={isRolloutOrSearchActive}
                        nodes={visibleNodes}
                    />
                )}
            </Stack>

            <MultiSelectNodesFeature
                moveSelected={moveSelected}
                selectedRecords={selectedRecords}
                setSelectedRecords={setSelectedRecords}
            />
        </Page>
    )
}
