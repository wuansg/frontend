import type { TFunction } from 'i18next'

import { TUsersStatus, USERS_STATUS } from '@remnawave/backend-contract'

export const userStatusValues = [
    { value: USERS_STATUS.ACTIVE, label: 'Active' },
    { value: USERS_STATUS.LIMITED, label: 'Limited' },
    { value: USERS_STATUS.DISABLED, label: 'Disabled' },
    { value: USERS_STATUS.EXPIRED, label: 'Expired' }
]

export const getUserStatusLabel = (status: TUsersStatus, t: TFunction): string => {
    switch (status) {
        case USERS_STATUS.ACTIVE:
            return t('user-status.active')
        case USERS_STATUS.LIMITED:
            return t('user-status.limited')
        case USERS_STATUS.DISABLED:
            return t('user-status.disabled')
        case USERS_STATUS.EXPIRED:
            return t('user-status.expired')
        default:
            return status
    }
}

export const getUserStatusOptions = (t: TFunction) => [
    { value: USERS_STATUS.ACTIVE, label: t('user-status.active') },
    { value: USERS_STATUS.LIMITED, label: t('user-status.limited') },
    { value: USERS_STATUS.DISABLED, label: t('user-status.disabled') },
    { value: USERS_STATUS.EXPIRED, label: t('user-status.expired') }
]
