import { create } from 'zustand'
import { createJSONStorage, devtools, persist } from 'zustand/middleware'

import {
    CONFIG_PROFILES_VIEW_MODE,
    HOSTS_VIEW_MODE,
    IActions,
    IState,
    LAYOUT_STYLE,
    NODES_VIEW_MODE
} from './interfaces'

const initialState: IState = {
    nodesViewMode: NODES_VIEW_MODE.MATRIX,
    nodesActiveTag: null,
    configProfilesViewMode: CONFIG_PROFILES_VIEW_MODE.PROFILES,
    hostsViewMode: HOSTS_VIEW_MODE.MATRIX,
    hostsActiveTag: null,
    layoutStyle: LAYOUT_STYLE.COMPACT
}

export const useViewPreferencesStore = create<IActions & IState>()(
    persist(
        devtools(
            (set) => ({
                ...initialState,
                actions: {
                    setNodesViewMode: (mode) => set({ nodesViewMode: mode }),
                    setNodesActiveTag: (tag) => set({ nodesActiveTag: tag }),
                    setConfigProfilesViewMode: (mode) => set({ configProfilesViewMode: mode }),
                    setHostsViewMode: (mode) => set({ hostsViewMode: mode }),
                    setHostsActiveTag: (tag) => set({ hostsActiveTag: tag }),
                    toggleLayoutStyle: () =>
                        set((state) => ({
                            layoutStyle:
                                state.layoutStyle === LAYOUT_STYLE.SIDEBAR
                                    ? LAYOUT_STYLE.COMPACT
                                    : LAYOUT_STYLE.SIDEBAR
                        })),
                    resetState: () => set({ ...initialState })
                }
            }),
            { name: 'viewPreferencesStore', anonymousActionType: 'viewPreferencesStore' }
        ),
        {
            name: 'viewPreferencesStore',
            version: 4,
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                nodesViewMode: state.nodesViewMode,
                nodesActiveTag: state.nodesActiveTag,
                configProfilesViewMode: state.configProfilesViewMode,
                hostsViewMode: state.hostsViewMode,
                hostsActiveTag: state.hostsActiveTag,
                layoutStyle: state.layoutStyle
            }),
            // Matrix became the default view in version 4: older sessions move to
            // it once and can still switch back to cards afterwards.
            migrate: (persistedState) => ({
                ...initialState,
                ...((persistedState ?? {}) as Partial<IState>),
                nodesViewMode: NODES_VIEW_MODE.MATRIX,
                hostsViewMode: HOSTS_VIEW_MODE.MATRIX
            })
        }
    )
)

export const useNodesViewMode = () =>
    useViewPreferencesStore((state) =>
        state.nodesViewMode === NODES_VIEW_MODE.MATRIX
            ? NODES_VIEW_MODE.MATRIX
            : NODES_VIEW_MODE.CARDS
    )
export const useNodesActiveTag = () => useViewPreferencesStore((state) => state.nodesActiveTag)
export const useConfigProfilesViewMode = () =>
    useViewPreferencesStore((state) => state.configProfilesViewMode)
export const useViewPreferencesStoreActions = () =>
    useViewPreferencesStore((state) => state.actions)
export const useHostsViewMode = () =>
    useViewPreferencesStore((state) =>
        state.hostsViewMode === HOSTS_VIEW_MODE.MATRIX
            ? HOSTS_VIEW_MODE.MATRIX
            : HOSTS_VIEW_MODE.CARDS
    )
export const useHostsActiveTag = () => useViewPreferencesStore((state) => state.hostsActiveTag)
export const useLayoutStyle = () => useViewPreferencesStore((state) => state.layoutStyle)
export const useToggleLayoutStyleAction = () =>
    useViewPreferencesStore((state) => state.actions.toggleLayoutStyle)
