/* eslint-disable camelcase */
import { MRT_ColumnSizingState, MRT_VisibilityState } from '@kastov/mantine-react-table-open'

import { createMrtTableStore } from '@shared/lib/mrt-table-store'

const DEFAULT_VISIBILITY: MRT_VisibilityState = {
    shortUuid: false,
    createdAt: false,
    subRevokedAt: false,
    description: false,
    telegramId: false,
    email: false,
    externalSquadUuid: false,
    vlessUuid: false,
    trojanPassword: false,
    hwidDeviceLimit: false,
    usedTrafficPercentage: false,
    trafficLimitBytes: false,
    'userTraffic.firstConnectedAt': false,
    lastTrafficResetAt: false,
    'userTraffic.lifetimeUsedTrafficBytes': false
}

const DEFAULT_COLUMN_SIZE: MRT_ColumnSizingState = {
    shortUuid: 160,
    createdAt: 165,
    subRevokedAt: 165,
    usedTrafficBytes: 215,
    'userTraffic.onlineAt': 165
}

export const useUsersTableStore = createMrtTableStore({
    name: 'x-rmnw-users-table',
    version: 14,
    defaults: {
        columnVisibility: DEFAULT_VISIBILITY,
        columnSize: DEFAULT_COLUMN_SIZE,
        showColumnFilters: true,
        sorting: [{ id: 'id', desc: true }]
    }
})

export const useUsersTableStoreActions = () => useUsersTableStore((store) => store.actions)
