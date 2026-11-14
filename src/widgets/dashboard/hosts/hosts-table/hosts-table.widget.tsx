import { RestrictToVerticalAxis } from '@dnd-kit/abstract/modifiers'
import { move } from '@dnd-kit/helpers'
import {
    DragDropProvider,
    DragEndEvent,
    DragOverEvent,
    DragOverlay,
    DragStartEvent
} from '@dnd-kit/react'
import { Box } from '@mantine/core'
import { GetHostsCommand } from '@remnawave/backend-contract'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { HostCardWidget } from '@widgets/dashboard/hosts/host-card'
import { memo, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { useGetNodes } from '@shared/api/hooks'
import { useIsMobile } from '@shared/hooks'
import { NO_TAG, TagFilterBar } from '@shared/ui'
import { EmptyPageLayout } from '@shared/ui/layouts/empty-page'

import {
    useHostsActiveTag,
    useViewPreferencesStoreActions
} from '@entities/dashboard/view-preferences-store'

import classes from './hosts-table.module.css'
import { IProps } from './interfaces'

export const HostsTableWidget = memo((props: IProps) => {
    const {
        configProfiles,
        disableReordering = false,
        handlers,
        hosts,
        isDraggingRef,
        selectedHosts,
        setSelectedHosts,
        state
    } = props
    const [draggedHost, setDraggedHost] = useState<
        GetHostsCommand.Response['response'][number] | null
    >(null)
    const dragSnapshotRef = useRef<null | typeof state>(null)

    const [scrollMargin, setScrollMargin] = useState(0)
    const listRef = useRef<HTMLDivElement | null>(null)
    const isMobile = useIsMobile()

    const activeTag = useHostsActiveTag()
    const { setHostsActiveTag } = useViewPreferencesStoreActions()

    const { data: nodes } = useGetNodes()

    const visibleState = useMemo(() => {
        if (activeTag === null) return state
        if (activeTag === NO_TAG) return state.filter((host) => (host.tags ?? []).length === 0)
        return state.filter((host) => (host.tags ?? []).includes(activeTag))
    }, [state, activeTag])

    useLayoutEffect(() => {
        if (listRef.current) {
            setScrollMargin(listRef.current.offsetTop)
        }
    }, [visibleState.length])

    const virtualizer = useWindowVirtualizer({
        count: visibleState.length,
        estimateSize: () => (isMobile ? 168 : 88),
        overscan: 7,
        scrollMargin,
        getItemKey: (index) => visibleState[index].uuid
    })

    const nodesByUuid = useMemo(
        () => new Map((nodes ?? []).map((node) => [node.uuid, node] as const)),
        [nodes]
    )

    const isReorderDisabled = disableReordering || activeTag !== null

    const handleDragStart = useCallback(
        (event: DragStartEvent) => {
            isDraggingRef.current = true
            dragSnapshotRef.current = state
            const draggedItem = state.find((item) => item.uuid === event.operation.source?.id)
            setDraggedHost(draggedItem || null)
        },
        [state, isDraggingRef]
    )

    const handleDragOver = useCallback(
        (event: DragOverEvent) => {
            handlers.setState((prev) => {
                const ids = prev.map((host) => host.uuid)
                const newIds = move(ids, event)
                if (newIds === ids) return prev

                const hostsByUuid = new Map(prev.map((host) => [host.uuid, host]))
                return newIds.map((uuid) => hostsByUuid.get(uuid)!)
            })
        },
        [handlers]
    )

    const handleDragEnd = useCallback(
        (event: DragEndEvent) => {
            isDraggingRef.current = false
            setDraggedHost(null)

            const snapshot = dragSnapshotRef.current
            dragSnapshotRef.current = null

            if (event.canceled) {
                if (snapshot) handlers.setState(snapshot)
                return
            }

            handlers.setState((prev) => [...prev])
        },
        [handlers, isDraggingRef]
    )

    const toggleHostSelection = useCallback(
        (hostId: string) => {
            setSelectedHosts((prev) =>
                prev.includes(hostId) ? prev.filter((id) => id !== hostId) : [...prev, hostId]
            )
        },
        [setSelectedHosts]
    )

    if (!hosts || !configProfiles) {
        return null
    }

    if (hosts.length === 0) {
        return <EmptyPageLayout />
    }

    return (
        <Box>
            <TagFilterBar activeTag={activeTag} items={hosts} onChange={setHostsActiveTag} />

            {visibleState.length === 0 ? (
                <EmptyPageLayout />
            ) : (
                <DragDropProvider
                    modifiers={[RestrictToVerticalAxis]}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    onDragStart={handleDragStart}
                >
                    <div ref={listRef}>
                        <div
                            style={{
                                height: `${virtualizer.getTotalSize()}px`,
                                width: '100%',
                                position: 'relative'
                            }}
                        >
                            {virtualizer.getVirtualItems().map((virtualItem) => {
                                const item = visibleState[virtualItem.index]
                                if (!item) return null

                                return (
                                    <Box
                                        data-index={virtualItem.index}
                                        key={item.uuid}
                                        ref={virtualizer.measureElement}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            transform: `translateY(${
                                                virtualItem.start - virtualizer.options.scrollMargin
                                            }px)`
                                        }}
                                    >
                                        <div className={classes.hostFadeIn}>
                                            <HostCardWidget
                                                configProfiles={configProfiles}
                                                disableReordering={isReorderDisabled}
                                                index={virtualItem.index}
                                                isSelected={selectedHosts.includes(item.uuid)}
                                                item={item}
                                                nodesByUuid={nodesByUuid}
                                                onSelect={() => toggleHostSelection(item.uuid)}
                                            />
                                        </div>
                                    </Box>
                                )
                            })}
                        </div>
                    </div>

                    <DragOverlay>
                        {draggedHost && (
                            <Box w="100%">
                                <HostCardWidget
                                    configProfiles={configProfiles}
                                    index={0}
                                    isDragOverlay
                                    isSelected={selectedHosts.includes(draggedHost.uuid)}
                                    item={draggedHost}
                                    nodesByUuid={nodesByUuid}
                                    onSelect={() => toggleHostSelection(draggedHost.uuid)}
                                />
                            </Box>
                        )}
                    </DragOverlay>
                </DragDropProvider>
            )}
        </Box>
    )
})
