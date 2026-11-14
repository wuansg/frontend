import { HOSTS_VIEW_MODE } from '@entities/dashboard/view-preferences-store'

export interface IProps {
    setViewMode: (viewMode: HOSTS_VIEW_MODE) => void
    viewMode: HOSTS_VIEW_MODE
}
