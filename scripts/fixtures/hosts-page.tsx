import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import '@mantine/spotlight/styles.css'
import NiceModal from '@ebay/nice-modal-react'
import { MantineProvider } from '@mantine/core'
import { ModalsProvider } from '@mantine/modals'
import { Notifications } from '@mantine/notifications'
import { QueryClientProvider } from '@tanstack/react-query'
import i18n from 'i18next'
import { createRoot } from 'react-dom/client'
import { initReactI18next, I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router'

import english from '../../public/locales/en/remnawave.json'
import chinese from '../../public/locales/zh/remnawave.json'
import { HostsPageConnector } from '../../src/pages/dashboard/hosts/ui/connectors'
import '../../src/shared/_modals/modal-registry'
import { queryClient } from '../../src/shared/api'
import { instance, setAuthorizationToken } from '../../src/shared/api/axios'
import { theme } from '../../src/shared/constants/theme/theme'
import { IsMobileProvider } from '../../src/shared/hocs/is-mobile-provider'

// Isolated fixture: every API call is answered here, nothing leaves the page.
const PROFILE = '00000000-0000-4000-8000-000000000100'
const INBOUND = '00000000-0000-4000-8000-000000000200'
const uuid = (index: number) => `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`
// Hosts 2 and 5 (indexes 1 and 4) are disabled.
let hosts = Array.from({ length: 7 }, (_, index) => ({
    uuid: uuid(index),
    viewPosition: index,
    remark: `Fixture host ${String(index + 1).padStart(2, '0')}`,
    address: `host-${index + 1}.example.invalid`,
    port: 443,
    path: '/ws',
    sni: `host-${index + 1}.example.invalid`,
    host: null,
    alpn: null,
    fingerprint: 'chrome',
    isDisabled: index === 1 || index === 4,
    securityLayer: 'DEFAULT',
    xhttpExtraParams: null,
    muxParams: null,
    sockoptParams: null,
    finalMask: null,
    inbound: { configProfileUuid: PROFILE, configProfileInboundUuid: INBOUND },
    serverDescription: null,
    tags: index % 2 ? ['EDGE'] : ['CORE'],
    isHidden: index === 6,
    overrideSniFromAddress: false,
    keepSniBlank: false,
    vlessRouteId: null,
    pinnedPeerCertSha256: null,
    verifyPeerCertByName: null,
    shuffleHost: false,
    mihomoX25519: false,
    mihomoIpVersion: null,
    nodes: [],
    excludedInternalSquads: [],
    excludeFromSubscriptionTypes: [],
    mapper: {}
}))
const writes: unknown[] = []
Object.assign(window, { fixtureWrites: writes })

const configProfiles = {
    total: 1,
    configProfiles: [
        {
            uuid: PROFILE,
            viewPosition: 0,
            name: 'Fixture profile',
            tags: [],
            coreType: 'SING_BOX',
            config: {},
            inbounds: [
                {
                    uuid: INBOUND,
                    profileUuid: PROFILE,
                    tag: 'SB_Trojan_WS',
                    type: 'trojan',
                    network: 'ws',
                    security: 'tls',
                    port: 443,
                    rawInbound: { type: 'trojan', tag: 'SB_Trojan_WS' }
                }
            ],
            nodes: [],
            createdAt: '2026-10-01T00:00:00.000Z',
            updatedAt: '2026-10-01T00:00:00.000Z'
        }
    ]
}

instance.defaults.baseURL = window.location.origin
setAuthorizationToken('hosts-page-fixture-only')
instance.defaults.adapter = async (config) => {
    const path = new URL(config.url ?? '', window.location.origin).pathname.replace(/\/$/, '')
    const method = (config.method ?? 'get').toLowerCase()
    let response: unknown
    if (method !== 'get') {
        const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data
        writes.push({ method, path, body })
        if (path === '/api/hosts/actions/reorder') {
            const position = new Map<string, number>(
                body.hosts.map((item: { uuid: string; viewPosition: number }) => [
                    item.uuid,
                    item.viewPosition
                ])
            )
            hosts = hosts
                .map((host) => ({ ...host, viewPosition: position.get(host.uuid)! }))
                .sort((a, b) => a.viewPosition - b.viewPosition)
            response = { isUpdated: true }
        } else if (path === '/api/hosts' && method === 'patch') {
            hosts = hosts.map((host) => (host.uuid === body.uuid ? { ...host, ...body } : host))
            response = hosts.find((host) => host.uuid === body.uuid)
        } else {
            throw new Error(`Fixture has no write handler for ${method} ${path}`)
        }
    } else if (path === '/api/hosts') response = hosts
    else if (path === '/api/config-profiles') response = configProfiles
    else if (path === '/api/hosts/tags') response = { tags: ['CORE', 'EDGE'] }
    else if (path === '/api/nodes') response = []
    else if (path === '/api/internal-squads') response = { total: 0, internalSquads: [] }
    else if (path === '/api/subscription-templates') response = { total: 0, templates: [] }
    else throw new Error(`Fixture has no handler for ${path}`)
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
                                <HostsPageConnector />
                            </ModalsProvider>
                        </NiceModal.Provider>
                    </MemoryRouter>
                </IsMobileProvider>
            </QueryClientProvider>
        </I18nextProvider>
    </MantineProvider>
)
