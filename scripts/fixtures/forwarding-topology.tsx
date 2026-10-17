import '@mantine/core/styles.css'
import '@mantine/dates/styles.css'
import 'dayjs/locale/zh'
import { Box, MantineProvider } from '@mantine/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import i18n from 'i18next'
import { createRoot } from 'react-dom/client'
import { initReactI18next, I18nextProvider } from 'react-i18next'

import english from '../../public/locales/en/remnawave.json'
import labels from '../../public/locales/zh/remnawave.json'
import { ForwardingTopologyContent } from '../../src/pages/dashboard/forwarding-topology/forwarding-topology.page'
import { instance, setAuthorizationToken } from '../../src/shared/api/axios'
import { theme } from '../../src/shared/constants/theme/theme'

instance.defaults.baseURL = window.location.origin
setAuthorizationToken('topology-fixture-only')
const params = new URLSearchParams(location.search)
await i18n
    .use(initReactI18next)
    .init({
        lng: params.get('lang') === 'en' ? 'en' : 'zh',
        defaultNS: 'remnawave',
        resources: { zh: { remnawave: labels }, en: { remnawave: english } },
        interpolation: { escapeValue: false }
    })
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
createRoot(document.getElementById('root')!).render(
    <MantineProvider
        theme={theme}
        forceColorScheme={params.get('theme') === 'light' ? 'light' : 'dark'}
    >
        <I18nextProvider i18n={i18n}>
            <QueryClientProvider client={client}>
                <Box p="md">
                    <ForwardingTopologyContent />
                </Box>
            </QueryClientProvider>
        </I18nextProvider>
    </MantineProvider>
)
