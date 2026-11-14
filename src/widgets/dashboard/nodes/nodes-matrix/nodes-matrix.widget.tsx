import { Box, Checkbox, SegmentedControl } from '@mantine/core'
import { GetNodesCommand } from '@remnawave/backend-contract'
import { memo, useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { showModal } from '@shared/_modals/show-modal'
import { useGetNodes } from '@shared/api/hooks'
import { NO_TAG, TagFilterBar } from '@shared/ui'
import { EmptyPageLayout } from '@shared/ui/layouts/empty-page'
import { sToMs } from '@shared/utils/time-utils'

import {
    useNodesActiveTag,
    useViewPreferencesStoreActions
} from '@entities/dashboard/view-preferences-store'

import { NodesSpotlightSearchWidget } from '../nodes-spotlight-search'
import { MatrixNodeType, NodeMatrixTile } from './node-matrix-tile'
import classes from './NodesMatrix.module.css'

type NodeType = GetNodesCommand.Response['response'][number]
type MatrixSortMode = 'load' | 'order' | 'quota' | 'throughput' | 'users'

interface IProps {
    nodes: GetNodesCommand.Response['response'] | undefined
    selectedRecords: NodeType[]
    setSelectedRecords: (records: NodeType[]) => void
}

const getThroughputScore = (node: NodeType) => {
    const iface = node.system?.stats.interface
    if (!iface) return -1
    return (iface.rxBytesPerSec ?? 0) + (iface.txBytesPerSec ?? 0)
}

const getLoadScore = (node: NodeType) => {
    if (!node.system) return -1
    const cpus = Math.max(1, node.system.info.cpus)
    const cpuRatio = node.system.stats.loadAvg ? node.system.stats.loadAvg[0] / cpus : 0
    const ramRatio =
        node.system.info.memoryTotal > 0
            ? node.system.stats.memoryUsed / node.system.info.memoryTotal
            : 0
    return Math.max(cpuRatio, ramRatio)
}

const getQuotaScore = (node: NodeType) => {
    if (!node.isTrafficTrackingActive || !node.trafficLimitBytes || node.trafficLimitBytes <= 0) {
        return -1
    }
    return (node.trafficUsedBytes ?? 0) / node.trafficLimitBytes
}

export const NodesMatrixWidget = memo((props: IProps) => {
    const { nodes, selectedRecords, setSelectedRecords } = props
    const { t } = useTranslation()

    const activeTag = useNodesActiveTag()
    const { setNodesActiveTag } = useViewPreferencesStoreActions()
    const [sortMode, setSortMode] = useState<MatrixSortMode>('order')
    const lastClickedUuidRef = useRef<string | null>(null)

    useGetNodes({
        rQueryParams: {
            enabled: true,
            refetchInterval: sToMs(5)
        }
    })

    const tagFilteredNodes = useMemo(() => {
        if (!nodes) return []
        if (activeTag === null) return nodes
        if (activeTag === NO_TAG) return nodes.filter((node) => (node.tags ?? []).length === 0)
        return nodes.filter((node) => (node.tags ?? []).includes(activeTag))
    }, [activeTag, nodes])

    const sortedNodes = useMemo(() => {
        if (sortMode === 'order') return tagFilteredNodes
        const copy = [...tagFilteredNodes]
        copy.sort((a, b) => {
            if (sortMode === 'throughput') {
                return getThroughputScore(b) - getThroughputScore(a)
            }
            if (sortMode === 'users') {
                return (b.usersOnline ?? 0) - (a.usersOnline ?? 0)
            }
            if (sortMode === 'load') {
                return getLoadScore(b) - getLoadScore(a)
            }
            return getQuotaScore(b) - getQuotaScore(a)
        })
        return copy
    }, [sortMode, tagFilteredNodes])

    const selectedUuidSet = useMemo(
        () => new Set(selectedRecords.map((item) => item.uuid)),
        [selectedRecords]
    )

    const selectedVisibleCount = useMemo(
        () => sortedNodes.filter((node) => selectedUuidSet.has(node.uuid)).length,
        [selectedUuidSet, sortedNodes]
    )

    const allVisibleSelected = sortedNodes.length > 0 && selectedVisibleCount === sortedNodes.length
    const someVisibleSelected =
        selectedVisibleCount > 0 && selectedVisibleCount < sortedNodes.length

    const handleToggleAllVisible = () => {
        if (allVisibleSelected) {
            const visibleIds = new Set(sortedNodes.map((n) => n.uuid))
            setSelectedRecords(selectedRecords.filter((item) => !visibleIds.has(item.uuid)))
        } else {
            const merged = new Map<string, NodeType>()
            for (const item of selectedRecords) merged.set(item.uuid, item)
            for (const item of sortedNodes) merged.set(item.uuid, item)
            setSelectedRecords([...merged.values()])
        }
    }

    const handleToggleSelect = useCallback(
        (targetNode: MatrixNodeType, shiftKey: boolean) => {
            const isCurrentlySelected = selectedUuidSet.has(targetNode.uuid)
            const lastUuid = lastClickedUuidRef.current
            lastClickedUuidRef.current = targetNode.uuid

            if (shiftKey && lastUuid && lastUuid !== targetNode.uuid) {
                const startIdx = sortedNodes.findIndex((item) => item.uuid === lastUuid)
                const endIdx = sortedNodes.findIndex((item) => item.uuid === targetNode.uuid)
                if (startIdx !== -1 && endIdx !== -1) {
                    const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx]
                    const rangeSlice = sortedNodes.slice(from, to + 1)
                    const nextMap = new Map(selectedRecords.map((item) => [item.uuid, item]))
                    if (isCurrentlySelected) {
                        for (const item of rangeSlice) nextMap.delete(item.uuid)
                    } else {
                        for (const item of rangeSlice) nextMap.set(item.uuid, item)
                    }
                    setSelectedRecords([...nextMap.values()])
                    return
                }
            }

            if (isCurrentlySelected) {
                setSelectedRecords(selectedRecords.filter((item) => item.uuid !== targetNode.uuid))
            } else {
                setSelectedRecords([...selectedRecords, targetNode])
            }
        },
        [selectedRecords, selectedUuidSet, setSelectedRecords, sortedNodes]
    )

    const handleViewNode = useCallback((nodeUuid: string) => {
        showModal('nodes_editNodeModal', { nodeUuid })
    }, [])

    if (!nodes) {
        return null
    }

    if (nodes.length === 0) {
        return <EmptyPageLayout />
    }

    return (
        <Box>
            <TagFilterBar activeTag={activeTag} items={nodes} onChange={setNodesActiveTag} />

            <div className={classes.toolbar}>
                <Checkbox
                    checked={allVisibleSelected}
                    color="cyan"
                    indeterminate={someVisibleSelected}
                    label={
                        selectedVisibleCount > 0
                            ? t('nodes-matrix.widget.selected-count', {
                                  selected: selectedVisibleCount,
                                  total: sortedNodes.length
                              })
                            : t('nodes-matrix.widget.select-all', {
                                  count: sortedNodes.length
                              })
                    }
                    onChange={handleToggleAllVisible}
                    radius="xs"
                    size="xs"
                    styles={{
                        label: {
                            cursor: 'pointer',
                            fontVariantNumeric: 'tabular-nums',
                            userSelect: 'none'
                        },
                        input: { cursor: 'pointer' }
                    }}
                />

                <Box style={{ overflowX: 'auto', maxWidth: '100%' }}>
                    <SegmentedControl
                        data={[
                            {
                                value: 'order',
                                label: t('nodes-matrix.widget.sort-order')
                            },
                            {
                                value: 'throughput',
                                label: t('nodes-matrix.widget.sort-traffic-rate')
                            },
                            {
                                value: 'users',
                                label: t('nodes-matrix.widget.sort-online-users')
                            },
                            {
                                value: 'load',
                                label: t('nodes-matrix.widget.sort-load')
                            },
                            {
                                value: 'quota',
                                label: t('nodes-matrix.widget.sort-quota')
                            }
                        ]}
                        onChange={(value) => setSortMode(value as MatrixSortMode)}
                        size="xs"
                        style={{ flexShrink: 0 }}
                        value={sortMode}
                    />
                </Box>
            </div>

            {sortedNodes.length === 0 ? (
                <EmptyPageLayout />
            ) : (
                <div className={classes.matrixGrid}>
                    {sortedNodes.map((node) => (
                        <NodeMatrixTile
                            isSelected={selectedUuidSet.has(node.uuid)}
                            key={node.uuid}
                            node={node}
                            onToggleSelect={handleToggleSelect}
                            onViewNode={handleViewNode}
                        />
                    ))}
                </div>
            )}

            {nodes.length > 0 && <NodesSpotlightSearchWidget nodes={nodes} />}
        </Box>
    )
})
