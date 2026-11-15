import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import NiceModal from '@ebay/nice-modal-react'
import { Button, Group, MantineProvider } from '@mantine/core'
import { ModalsProvider } from '@mantine/modals'
import { Notifications } from '@mantine/notifications'
import { QueryClientProvider } from '@tanstack/react-query'
import i18n from 'i18next'
import { createRoot } from 'react-dom/client'
import { initReactI18next, I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router'

import english from '../../public/locales/en/remnawave.json'
import chinese from '../../public/locales/zh/remnawave.json'
import '../../src/shared/_modals/modal-registry'
import { showModal } from '../../src/shared/_modals/show-modal'
import { queryClient } from '../../src/shared/api'
import { instance, setAuthorizationToken } from '../../src/shared/api/axios'
import { theme } from '../../src/shared/constants/theme/theme'
import { IsMobileProvider } from '../../src/shared/hocs/is-mobile-provider'

// Isolated fixture: every API call is answered here, nothing leaves the page.
const PLAIN = '00000000-0000-4000-8000-000000000001'
const RELAY = '00000000-0000-4000-8000-000000000002'
const RULE = '00000000-0000-4000-8000-000000000301'
const node = (uuid: string, name: string, relay: boolean) => ({
    uuid,
    id: relay ? 2 : 1,
    name,
    address: `${relay ? 'relay' : 'plain'}.example.invalid`,
    port: 2222,
    proxyUrl: null,
    isConnected: true,
    isDisabled: false,
    isConnecting: false,
    lastStatusChange: null,
    lastStatusMessage: null,
    isTrafficTrackingActive: relay,
    trafficResetDay: 1,
    trafficLimitBytes: 500 * 1024 ** 3,
    trafficUsedBytes: 120 * 1024 ** 3,
    notifyPercent: 90,
    viewPosition: relay ? 1 : 0,
    countryCode: 'HK',
    consumptionMultiplier: 1,
    nodeConsumptionMultiplier: 1,
    tags: relay ? ['RELAY', 'HKG'] : [],
    expectedAgentVersion: null,
    expectedAgentImageTag: null,
    rolloutBatch: null,
    nodeApiSniEnabled: false,
    nodeApiSniLastSuccessAt: null,
    ips: [],
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
    configProfile: { activeConfigProfileUuid: null, activeInbounds: [] },
    providerUuid: null,
    provider: null,
    activePluginUuid: null,
    system: null,
    versions: { core: null, singBox: '1.14.0', node: '3.16.5' },
    coreUptime: 0,
    usersOnline: 0,
    note: null,
    versionDrift: null,
    runtimeInventory: null,
    runtimeStatus: {
        mode: relay ? 'FORWARDING_ONLY' : 'IDLE',
        runningCore: null,
        coreOnline: false,
        capabilities: [],
        supportedCores: ['SING_BOX'],
        forwarding: null,
        usageSnapshot: null
    }
})
const nodes = [node(PLAIN, 'Fixture plain node', false), node(RELAY, 'Fixture relay node', true)]
const forwarding = (relay: boolean) => ({
    config: {
        enabled: relay,
        listenInterface: 'auto',
        rules: relay
            ? [
                  {
                      id: RULE,
                      name: 'fixture-rule',
                      enabled: true,
                      protocol: 'TCP_UDP',
                      listenPort: 54322,
                      targetAddress: '198.51.100.10',
                      targetPort: 54320
                  }
              ]
            : []
    },
    status: { state: relay ? 'applied' : 'disabled', rules: [] }
})
const unhandled: string[] = []
Object.assign(window, { fixtureUnhandled: unhandled })

instance.defaults.baseURL = window.location.origin
setAuthorizationToken('node-edit-fixture-only')
instance.defaults.adapter = async (config) => {
    const path = new URL(config.url ?? '', window.location.origin).pathname.replace(/\/$/, '')
    const method = (config.method ?? 'get').toLowerCase()
    const one = nodes.find((item) => path.startsWith(`/api/nodes/${item.uuid}`))
    let response: unknown
    if (method !== 'get') throw new Error(`Fixture is read-only: ${method} ${path}`)
    if (path === '/api/nodes') response = nodes
    else if (one && path === `/api/nodes/${one.uuid}`) response = one
    else if (one && path.endsWith('/forwarding')) response = forwarding(one.uuid === RELAY)
    else if (one && path.endsWith('/forwarding/usage'))
        response = {
            start: '2026-11-01',
            end: '2026-11-15',
            uploadBytes: 0,
            downloadBytes: 0,
            totalBytes: 0,
            lastRecordedAt: null,
            rules: []
        }
    else if (path === '/api/keygen') response = { secretKey: 'fixture-secret-key' }
    else if (path === '/api/node-plugins') response = { total: 0, nodePlugins: [] }
    else if (path === '/api/nodes/tags') response = { tags: ['RELAY', 'HKG'] }
    else if (path === '/api/config-profiles') response = { total: 0, configProfiles: [] }
    else {
        unhandled.push(path)
        throw new Error(`Fixture has no handler for ${path}`)
    }
    return { data: { response }, status: 200, statusText: 'OK', headers: {}, config }
}

const params = new URLSearchParams(location.search)
await i18n.use(initReactI18next).init({
    lng: params.get('lang') === 'en' ? 'en' : 'zh',
    defaultNS: 'remnawave',
    resources: { zh: { remnawave: chinese }, en: { remnawave: english } },
    interpolation: { escapeValue: false }
})

createRoot(document.getElementById('root')!).render(
    <MantineProvider
        theme={theme}
        forceColorScheme={params.get('theme') === 'light' ? 'light' : 'dark'}
    >
        <I18nextProvider i18n={i18n}>
            <QueryClientProvider client={queryClient}>
                <IsMobileProvider>
                    <MemoryRouter>
                        <NiceModal.Provider>
                            <ModalsProvider>
                                <Notifications position="top-right" />
                                <Group p="md">
                                    {nodes.map((item) => (
                                        <Button
                                            key={item.uuid}
                                            onClick={() =>
                                                showModal('nodes_editNodeModal', {
                                                    nodeUuid: item.uuid
                                                })
                                            }
                                        >
                                            {item.name}
                                        </Button>
                                    ))}
                                </Group>
                            </ModalsProvider>
                        </NiceModal.Provider>
                    </MemoryRouter>
                </IsMobileProvider>
            </QueryClientProvider>
        </I18nextProvider>
    </MantineProvider>
)
