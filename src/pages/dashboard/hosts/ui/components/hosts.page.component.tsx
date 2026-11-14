import { MultiSelectHostsFeature } from '@features/dashboard/hosts/multi-select-hosts/multi-select-hosts.feature'
import { HeaderActionButtonsFeature } from '@features/ui/dashboard/hosts/header-action-buttons'
import { Stack } from '@mantine/core'
import { useListState } from '@mantine/hooks'
import { HostUsersUsageDrawer } from '@widgets/dashboard/hosts/host-users-usage-statistic'
import { HostsMatrixWidget } from '@widgets/dashboard/hosts/hosts-matrix'
import {
    HostFilterMode,
    HostsOverviewWidget,
    isHostDangling
} from '@widgets/dashboard/hosts/hosts-overview'
import { HostsSpotlightWidget } from '@widgets/dashboard/hosts/hosts-spotlight'
import { HostsTableWidget } from '@widgets/dashboard/hosts/hosts-table'
import { motion } from 'motion/react'
/* eslint-disable no-nested-ternary */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TbListCheck } from 'react-icons/tb'
import { useSearchParams } from 'react-router'

import { showModal } from '@shared/_modals/show-modal'
import { queryClient } from '@shared/api'
import { hostsQueryKeys, useReorderHosts } from '@shared/api/hooks'
import { SEARCH_PARAMS } from '@shared/constants/search-params'
import { LoadingScreen, Page, PageHeaderShared } from '@shared/ui'

import {
    HOSTS_VIEW_MODE,
    useHostsViewMode,
    useViewPreferencesStoreActions
} from '@entities/dashboard/view-preferences-store'

import { IProps } from './interfaces'

export default function HostsPageComponent(props: IProps) {
    const { t } = useTranslation()
    const { configProfiles, hosts, isLoading } = props
    const [selectedHosts, setSelectedHosts] = useState<string[]>([])
    const [filterMode, setFilterMode] = useState<HostFilterMode>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [state, handlers] = useListState(hosts || [])
    const isDraggingRef = useRef(false)

    const viewMode = useHostsViewMode()
    const { mutate: reorderHosts } = useReorderHosts({
        mutationFns: {
            onError: () => {
                queryClient.invalidateQueries({ queryKey: hostsQueryKeys.getAllHosts.queryKey })
            }
        }
    })

    const [searchParams, setSearchParams] = useSearchParams()

    const { setHostsViewMode } = useViewPreferencesStoreActions()

    const profilesByUuid = useMemo(
        () => new Map((configProfiles ?? []).map((p) => [p.uuid, p] as const)),
        [configProfiles]
    )

    const isFilterOrSearchActive = filterMode !== 'all' || searchQuery.trim() !== ''

    const filteredState = useMemo(() => {
        let result = state
        if (filterMode === 'active') {
            result = result.filter(
                (host) =>
                    !host.isDisabled && !host.isHidden && !isHostDangling(host, profilesByUuid)
            )
        } else if (filterMode === 'hidden') {
            result = result.filter((host) => !host.isDisabled && host.isHidden)
        } else if (filterMode === 'disabled') {
            result = result.filter((host) => host.isDisabled)
        } else if (filterMode === 'dangling') {
            result = result.filter((host) => isHostDangling(host, profilesByUuid))
        }

        const needle = searchQuery.trim().toLowerCase()
        if (needle) {
            result = result.filter((host) => {
                const profile = profilesByUuid.get(host.inbound.configProfileUuid ?? '')
                const inbound = profile?.inbounds.find(
                    (i) => i.uuid === host.inbound.configProfileInboundUuid
                )
                return (
                    host.remark.toLowerCase().includes(needle) ||
                    host.address.toLowerCase().includes(needle) ||
                    String(host.port ?? '').includes(needle) ||
                    (host.sni ?? '').toLowerCase().includes(needle) ||
                    (host.host ?? '').toLowerCase().includes(needle) ||
                    (profile?.name ?? '').toLowerCase().includes(needle) ||
                    (inbound?.tag ?? '').toLowerCase().includes(needle) ||
                    (host.tags ?? []).some((tag) => tag.toLowerCase().includes(needle))
                )
            })
        }

        return result
    }, [filterMode, profilesByUuid, searchQuery, state])

    useEffect(() => {
        ;(async () => {
            if (!hosts || !state || hosts.length !== state.length) {
                return
            }

            if (isDraggingRef.current) {
                return
            }

            const hostsToReorder = hosts

            const updatedHosts = hostsToReorder.map((host) => ({
                uuid: host.uuid,
                viewPosition: state.findIndex((stateItem) => stateItem.uuid === host.uuid)
            }))

            const hasOrderChanged = hostsToReorder.some(
                (host, index) => host.uuid !== state[index]?.uuid
            )

            if (hasOrderChanged && updatedHosts.every((item) => item.viewPosition !== -1)) {
                reorderHosts({ variables: { hosts: updatedHosts } })
                queryClient.setQueryData(hostsQueryKeys.getAllHosts.queryKey, state)
            }
        })()
    }, [state])

    useEffect(() => {
        handlers.setState(hosts || [])
    }, [hosts])

    useEffect(() => {
        if (!hosts || isLoading) return
        if (!searchParams.get(SEARCH_PARAMS.HOST)) return
        const hostUuid = searchParams.get(SEARCH_PARAMS.HOST)
        if (!hostUuid) return

        const host = hosts.find((entry) => entry.uuid === hostUuid)
        if (!host) return

        showModal('hosts_editHostDrawer', {
            host
        })

        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev)
                next.delete(SEARCH_PARAMS.HOST)
                return next
            },
            { replace: true }
        )
    }, [searchParams, hosts, isLoading, setSearchParams])

    const moveSelected = useCallback(
        (mode: 'bottom' | 'down' | 'top' | 'up') => {
            if (selectedHosts.length === 0) return
            const selected = new Set(selectedHosts)

            handlers.setState((current) => {
                if (mode === 'top' || mode === 'bottom') {
                    const sel = current.filter((host) => selected.has(host.uuid))
                    const rest = current.filter((host) => !selected.has(host.uuid))
                    return mode === 'top' ? [...sel, ...rest] : [...rest, ...sel]
                }

                const next = [...current]
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
                return next
            })
        },
        [selectedHosts, handlers]
    )

    return (
        <Page title={t('constants.hosts')}>
            <Stack gap="sm">
                <PageHeaderShared
                    actions={
                        <HeaderActionButtonsFeature
                            setViewMode={setHostsViewMode}
                            viewMode={viewMode}
                        />
                    }
                    icon={<TbListCheck size={24} />}
                    mb={0}
                    title={t('constants.hosts')}
                    wrapActions
                />

                {!isLoading && (
                    <HostsOverviewWidget
                        configProfiles={configProfiles}
                        filter={filterMode}
                        hosts={state}
                        onFilterChange={(next) => {
                            setSelectedHosts([])
                            setFilterMode(next)
                        }}
                        onSearchChange={(next) => {
                            setSelectedHosts([])
                            setSearchQuery(next)
                        }}
                        searchQuery={searchQuery}
                    />
                )}

                {isLoading ? (
                    <LoadingScreen height="60vh" />
                ) : viewMode === HOSTS_VIEW_MODE.MATRIX ? (
                    <motion.div
                        animate={{ opacity: 1 }}
                        initial={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <HostsMatrixWidget
                            allHosts={hosts}
                            configProfiles={configProfiles}
                            hosts={filteredState}
                            selectedHosts={selectedHosts}
                            setSelectedHosts={setSelectedHosts}
                        />
                    </motion.div>
                ) : (
                    <HostsTableWidget
                        configProfiles={configProfiles}
                        disableReordering={isFilterOrSearchActive}
                        handlers={handlers}
                        hosts={hosts}
                        isDraggingRef={isDraggingRef}
                        selectedHosts={selectedHosts}
                        setSelectedHosts={setSelectedHosts}
                        state={filteredState}
                    />
                )}
            </Stack>

            <HostsSpotlightWidget configProfiles={configProfiles ?? []} hosts={hosts ?? []} />

            <HostUsersUsageDrawer key="host-users-usage-drawer" />
            <MultiSelectHostsFeature
                configProfiles={configProfiles}
                hosts={filteredState}
                moveSelected={moveSelected}
                selectedHosts={selectedHosts}
                setSelectedHosts={setSelectedHosts}
            />
        </Page>
    )
}
