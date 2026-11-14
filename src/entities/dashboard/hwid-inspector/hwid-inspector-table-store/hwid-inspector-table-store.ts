import { createMrtTableStore } from '@shared/lib/mrt-table-store'

export const useHwidInspectorTableStore = createMrtTableStore({
    name: 'x-rmnw-hwid-inspector-table',
    version: 3,
    defaults: {
        showColumnFilters: true,
        sorting: [{ id: 'createdAt', desc: true }]
    }
})

export const useHwidInspectorTableStoreActions = () =>
    useHwidInspectorTableStore((store) => store.actions)
