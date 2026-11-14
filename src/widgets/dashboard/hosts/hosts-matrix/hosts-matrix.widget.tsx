import { Box, Checkbox, Scroller, SegmentedControl } from '@mantine/core'
import { GetConfigProfilesCommand, GetHostsCommand } from '@remnawave/backend-contract'
import { Dispatch, memo, SetStateAction, useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useGetNodes } from '@shared/api/hooks'
import { NO_TAG, TagFilterBar } from '@shared/ui'
import { EmptyPageLayout } from '@shared/ui/layouts/empty-page'

import {
    useHostsActiveTag,
    useViewPreferencesStoreActions
} from '@entities/dashboard/view-preferences-store'

import { HostMatrixTile } from './host-matrix-tile'
import classes from './HostsMatrix.module.css'

type HostItem = GetHostsCommand.Response['response'][number]
type ConfigProfileItem = GetConfigProfilesCommand.Response['response']['configProfiles'][number]
type HostMatrixSortMode = 'address' | 'nodes' | 'order' | 'profile' | 'remark'

interface HostsMatrixWidgetProps {
    allHosts: HostItem[] | undefined
    configProfiles: ConfigProfileItem[] | undefined
    hosts: HostItem[]
    selectedHosts: string[]
    setSelectedHosts: Dispatch<SetStateAction<string[]>>
}

export const HostsMatrixWidget = memo((props: HostsMatrixWidgetProps) => {
    const { allHosts, configProfiles, hosts, selectedHosts, setSelectedHosts } = props
    const { t } = useTranslation()

    const activeTag = useHostsActiveTag()
    const { setHostsActiveTag } = useViewPreferencesStoreActions()
    const { data: nodes } = useGetNodes()

    const [sortMode, setSortMode] = useState<HostMatrixSortMode>('order')
    const lastClickedUuidRef = useRef<string | null>(null)

    const profilesByUuid = useMemo(
        () => new Map((configProfiles ?? []).map((p) => [p.uuid, p] as const)),
        [configProfiles]
    )

    const nodesByUuid = useMemo(
        () => new Map((nodes ?? []).map((n) => [n.uuid, n] as const)),
        [nodes]
    )

    const tagFilteredHosts = useMemo(() => {
        if (activeTag === null) return hosts
        if (activeTag === NO_TAG) return hosts.filter((host) => (host.tags ?? []).length === 0)
        return hosts.filter((host) => (host.tags ?? []).includes(activeTag))
    }, [activeTag, hosts])

    const sortedHosts = useMemo(() => {
        if (sortMode === 'order') return tagFilteredHosts
        const copy = [...tagFilteredHosts]
        copy.sort((a, b) => {
            if (sortMode === 'remark') {
                return a.remark.localeCompare(b.remark)
            }
            if (sortMode === 'address') {
                return `${a.address}:${a.port}`.localeCompare(`${b.address}:${b.port}`)
            }
            if (sortMode === 'profile') {
                const nameA = profilesByUuid.get(a.inbound.configProfileUuid ?? '')?.name ?? ''
                const nameB = profilesByUuid.get(b.inbound.configProfileUuid ?? '')?.name ?? ''
                return nameA.localeCompare(nameB)
            }
            return b.nodes.length - a.nodes.length
        })
        return copy
    }, [profilesByUuid, sortMode, tagFilteredHosts])

    const selectedUuidSet = useMemo(() => new Set(selectedHosts), [selectedHosts])

    const selectedVisibleCount = useMemo(
        () => sortedHosts.filter((host) => selectedUuidSet.has(host.uuid)).length,
        [selectedUuidSet, sortedHosts]
    )

    const allVisibleSelected = sortedHosts.length > 0 && selectedVisibleCount === sortedHosts.length
    const someVisibleSelected =
        selectedVisibleCount > 0 && selectedVisibleCount < sortedHosts.length

    const handleToggleAllVisible = () => {
        if (allVisibleSelected) {
            const visibleIds = new Set(sortedHosts.map((h) => h.uuid))
            setSelectedHosts((prev) => prev.filter((id) => !visibleIds.has(id)))
        } else {
            setSelectedHosts((prev) => {
                const next = new Set(prev)
                for (const host of sortedHosts) next.add(host.uuid)
                return [...next]
            })
        }
    }

    const handleToggleSelect = useCallback(
        (targetUuid: string, shiftKey: boolean) => {
            const lastUuid = lastClickedUuidRef.current
            lastClickedUuidRef.current = targetUuid

            setSelectedHosts((prev) => {
                const prevSet = new Set(prev)
                const isCurrentlySelected = prevSet.has(targetUuid)

                if (shiftKey && lastUuid && lastUuid !== targetUuid) {
                    const startIdx = sortedHosts.findIndex((item) => item.uuid === lastUuid)
                    const endIdx = sortedHosts.findIndex((item) => item.uuid === targetUuid)
                    if (startIdx !== -1 && endIdx !== -1) {
                        const [from, to] =
                            startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx]
                        const rangeSlice = sortedHosts.slice(from, to + 1)
                        if (isCurrentlySelected) {
                            for (const item of rangeSlice) prevSet.delete(item.uuid)
                        } else {
                            for (const item of rangeSlice) prevSet.add(item.uuid)
                        }
                        return [...prevSet]
                    }
                }

                if (isCurrentlySelected) {
                    prevSet.delete(targetUuid)
                } else {
                    prevSet.add(targetUuid)
                }
                return [...prevSet]
            })
        },
        [setSelectedHosts, sortedHosts]
    )

    if (!allHosts || !configProfiles) {
        return null
    }

    if (allHosts.length === 0) {
        return <EmptyPageLayout />
    }

    return (
        <Box>
            <TagFilterBar activeTag={activeTag} items={allHosts} onChange={setHostsActiveTag} />

            <div className={classes.toolbar}>
                <Checkbox
                    checked={allVisibleSelected}
                    color="cyan"
                    indeterminate={someVisibleSelected}
                    label={
                        selectedVisibleCount > 0
                            ? t('nodes-matrix.widget.selected-count', {
                                  selected: selectedVisibleCount,
                                  total: sortedHosts.length
                              })
                            : t('nodes-matrix.widget.select-all', {
                                  count: sortedHosts.length
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

                <Scroller draggable style={{ maxWidth: '100%' }}>
                    <SegmentedControl
                        data={[
                            {
                                value: 'order',
                                label: t('nodes-matrix.widget.sort-order')
                            },
                            {
                                value: 'remark',
                                label: t('hosts-matrix.widget.sort-remark')
                            },
                            {
                                value: 'address',
                                label: t('hosts-matrix.widget.sort-address')
                            },
                            {
                                value: 'profile',
                                label: t('hosts-matrix.widget.sort-profile')
                            },
                            {
                                value: 'nodes',
                                label: t('hosts-matrix.widget.sort-nodes')
                            }
                        ]}
                        onChange={(value) => setSortMode(value as HostMatrixSortMode)}
                        size="xs"
                        style={{ flexShrink: 0 }}
                        value={sortMode}
                    />
                </Scroller>
            </div>

            {sortedHosts.length === 0 ? (
                <EmptyPageLayout />
            ) : (
                <div className={classes.matrixGrid}>
                    {sortedHosts.map((host) => (
                        <HostMatrixTile
                            configProfile={profilesByUuid.get(host.inbound.configProfileUuid ?? '')}
                            isSelected={selectedUuidSet.has(host.uuid)}
                            item={host}
                            key={host.uuid}
                            nodesByUuid={nodesByUuid}
                            onToggleSelect={handleToggleSelect}
                        />
                    ))}
                </div>
            )}
        </Box>
    )
})
