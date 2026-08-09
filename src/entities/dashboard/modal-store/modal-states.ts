export const MODALS = {
    CONFIG_PROFILE_SHOW_SNIPPETS_DRAWER: 'CONFIG_PROFILE_SHOW_SNIPPETS_DRAWER',
    SHOW_HOST_USERS_USAGE_DRAWER: 'SHOW_HOST_USERS_USAGE_DRAWER'
} as const

export interface ModalInternalStates {
    CONFIG_PROFILE_SHOW_SNIPPETS_DRAWER: undefined
    SHOW_HOST_USERS_USAGE_DRAWER: {
        hostRemark: string
        hostUuid: string
    }
}
