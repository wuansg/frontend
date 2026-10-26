import '@mantine/core/styles.css'
import '@mantine/spotlight/styles.css'
import { Box, Button, Group, MantineProvider, Title } from '@mantine/core'
import { GetNodesCommand } from '@remnawave/backend-contract'
import { QueryClientProvider } from '@tanstack/react-query'
import i18n from 'i18next'
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { initReactI18next, I18nextProvider } from 'react-i18next'

import english from '../../public/locales/en/remnawave.json'
import chinese from '../../public/locales/zh/remnawave.json'
import { queryClient } from '../../src/shared/api'
import { instance, setAuthorizationToken } from '../../src/shared/api/axios'
import { theme } from '../../src/shared/constants/theme/theme'
import { IsMobileProvider } from '../../src/shared/hocs/is-mobile-provider'
import { NodesTableWidget } from '../../src/widgets/dashboard/nodes/nodes-table/nodes-table.widget'

instance.defaults.baseURL = window.location.origin
setAuthorizationToken('node-list-fixture-only')
const params = new URLSearchParams(location.search)
await i18n.use(initReactI18next).init({
    lng: params.get('lang') === 'en' ? 'en' : 'zh',
    defaultNS: 'remnawave',
    resources: { zh: { remnawave: chinese }, en: { remnawave: english } },
    interpolation: { escapeValue: false }
})
const GiB = 1024 ** 3
const nodes = GetNodesCommand.ResponseSchema.parse({
    response: Array.from({ length: 60 }, (_, index) => ({
        uuid: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
        id: index + 1,
        name: `Fixture node ${String(index + 1).padStart(2, '0')}`,
        address: `node-${index + 1}.example.invalid`,
        port: 2222,
        proxyUrl: null,
        isConnected: index % 6 !== 5,
        isDisabled: index % 6 === 4,
        isConnecting: false,
        lastStatusChange: null,
        lastStatusMessage: null,
        isTrafficTrackingActive: index % 6 !== 3,
        trafficResetDay: index % 2 ? 10 : 1,
        trafficLimitBytes: index % 6 === 2 ? 0 : 500 * GiB,
        trafficUsedBytes: (index % 2 ? 480 : 265.7) * GiB,
        notifyPercent: 90,
        viewPosition: index,
        countryCode: ['HK', 'TW', 'SG', 'JP', 'DE', 'US'][index % 6],
        consumptionMultiplier: 1,
        nodeConsumptionMultiplier: 1,
        tags: [index % 2 ? 'CORE' : 'FORWARDING'],
        expectedAgentVersion: null,
        expectedAgentImageTag: null,
        rolloutBatch: null,
        nodeApiSniEnabled: false,
        nodeApiSniLastSuccessAt: null,
        ips: [],
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
        configProfile: {
            activeConfigProfileUuid: '00000000-0000-4000-8000-000000000100',
            activeInbounds: []
        },
        providerUuid: null,
        provider: null,
        activePluginUuid: null,
        system: null,
        versions: { core: index % 2 ? 'SING_BOX' : null, singBox: '1.14.0', node: '3.16.1' },
        coreUptime: 1200,
        usersOnline: index % 2,
        note: null,
        runtimeStatus: {
            mode: index % 2 ? 'CORE_ACTIVE' : 'FORWARDING_ONLY',
            runningCore: index % 2 ? 'SING_BOX' : null,
            coreOnline: Boolean(index % 2),
            capabilities: [],
            supportedCores: ['SING_BOX'],
            forwarding: null,
            usageSnapshot: null
        }
    }))
}).response

function Fixture() {
    const [budgetEnabled, setBudgetEnabled] = useState(true)
    const visibleNodes = nodes.map((node) => ({
        ...node,
        isTrafficTrackingActive: budgetEnabled && node.isTrafficTrackingActive
    }))
    return (
        <Box p="md">
            <Title order={3} mb="md">
                Nodes · 节点
            </Title>
            <Group mb="md">
                <Button onClick={() => setBudgetEnabled((value) => !value)}>
                    Toggle traffic budget
                </Button>
            </Group>
            <NodesTableWidget nodes={visibleNodes} />
        </Box>
    )
}

createRoot(document.getElementById('root')!).render(
    <MantineProvider
        theme={theme}
        forceColorScheme={params.get('theme') === 'light' ? 'light' : 'dark'}
    >
        <I18nextProvider i18n={i18n}>
            <QueryClientProvider client={queryClient}>
                <IsMobileProvider>
                    <Fixture />
                </IsMobileProvider>
            </QueryClientProvider>
        </I18nextProvider>
    </MantineProvider>
)
