import { Box, Checkbox } from '@mantine/core'
import { GetConfigProfilesCommand, GetHostsCommand } from '@remnawave/backend-contract'
import { Dispatch, memo, SetStateAction, useCallback, useMemo, useRef } from 'react'
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

    const lastClickedUuidRef = useRef<string | null>(null)

    const profilesByUuid = useMemo(
        () => new Map((configProfiles ?? []).map((p) => [p.uuid, p] as const)),
        [configProfiles]
    )

    const nodesByUuid = useMemo(
        () => new Map((nodes ?? []).map((n) => [n.uuid, n] as const)),
        [nodes]
    )

    const visibleHosts = useMemo(() => {
        if (activeTag === null) return hosts
        if (activeTag === NO_TAG) return hosts.filter((host) => (host.tags ?? []).length === 0)
        return hosts.filter((host) => (host.tags ?? []).includes(activeTag))
    }, [activeTag, hosts])

    const selectedUuidSet = useMemo(() => new Set(selectedHosts), [selectedHosts])

    const selectedVisibleCount = useMemo(
        () => visibleHosts.filter((host) => selectedUuidSet.has(host.uuid)).length,
        [selectedUuidSet, visibleHosts]
    )

    const allVisibleSelected =
        visibleHosts.length > 0 && selectedVisibleCount === visibleHosts.length
    const someVisibleSelected =
        selectedVisibleCount > 0 && selectedVisibleCount < visibleHosts.length

    const handleToggleAllVisible = () => {
        if (allVisibleSelected) {
            const visibleIds = new Set(visibleHosts.map((h) => h.uuid))
            setSelectedHosts((prev) => prev.filter((id) => !visibleIds.has(id)))
        } else {
            setSelectedHosts((prev) => {
                const next = new Set(prev)
                for (const host of visibleHosts) next.add(host.uuid)
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
                    const startIdx = visibleHosts.findIndex((item) => item.uuid === lastUuid)
                    const endIdx = visibleHosts.findIndex((item) => item.uuid === targetUuid)
                    if (startIdx !== -1 && endIdx !== -1) {
                        const [from, to] =
                            startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx]
                        const rangeSlice = visibleHosts.slice(from, to + 1)
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
        [setSelectedHosts, visibleHosts]
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
                                  total: visibleHosts.length
                              })
                            : t('nodes-matrix.widget.select-all', {
                                  count: visibleHosts.length
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
            </div>

            {visibleHosts.length === 0 ? (
                <EmptyPageLayout />
            ) : (
                <div className={classes.matrixGrid}>
                    {visibleHosts.map((host) => (
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
