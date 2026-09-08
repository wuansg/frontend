import { HomePage } from '@pages/dashboard/home/components'

import {
    useGetBandwidthStats,
    useGetConfiguration,
    useGetRemnawaveHealth,
    useGetSystemStats
} from '@shared/api/hooks'
import { LoadingScreen } from '@shared/ui/loading-screen'

export const HomePageConnector = () => {
    const { data: systemInfo } = useGetSystemStats()
    const { data: bandwidthStats } = useGetBandwidthStats()
    const { data: remnawaveHealth } = useGetRemnawaveHealth()
    const { data: configuration } = useGetConfiguration()

    if (!systemInfo || !bandwidthStats || !remnawaveHealth || !configuration) {
        return <LoadingScreen />
    }

    return (
        <HomePage
            bandwidthStats={bandwidthStats}
            configuration={configuration}
            remnawaveHealth={remnawaveHealth}
            systemInfo={systemInfo}
        />
    )
}
