import { Navigate, useParams } from 'react-router'

import { useGetConfigProfile, useGetSnippets } from '@shared/api/hooks'
import { ROUTES } from '@shared/constants'
import { LoadingScreen } from '@shared/ui'

import { ConfigProfileByUuidPageComponent } from '../components/config-profile-by-uuid.page.component'

export function ConfigProfileByUuidPageConnector() {
    const { uuid } = useParams()

    const { data: configProfile, isLoading: isConfigProfileLoading } = useGetConfigProfile({
        route: { uuid: uuid! },
        rQueryParams: {
            enabled: !!uuid,
            refetchOnWindowFocus: false
        }
    })

    const { data: snippets, isLoading: isSnippetsLoading } = useGetSnippets({})

    if (!uuid) {
        return <Navigate to={ROUTES.DASHBOARD.MANAGEMENT.CONFIG_PROFILES} />
    }

    if (isConfigProfileLoading || !configProfile || isSnippetsLoading || !snippets) {
        return <LoadingScreen />
    }

    return <ConfigProfileByUuidPageComponent configProfile={configProfile} snippets={snippets} />
}
