import '@mantine/core/styles.css'
import '@mantine/dates/styles.css'
import 'dayjs/locale/zh'
import NiceModal from '@ebay/nice-modal-react'
import { Button, MantineProvider } from '@mantine/core'
import { ModalsProvider } from '@mantine/modals'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import i18n from 'i18next'
import { createRoot } from 'react-dom/client'
import { initReactI18next, I18nextProvider } from 'react-i18next'

import englishLabels from '../../public/locales/en/remnawave.json'
import labels from '../../public/locales/zh/remnawave.json'
import { UserAccessAuditModal } from '../../src/shared/_modals/users/user-access-audit/user-access-audit.modal'
import { instance, setAuthorizationToken } from '../../src/shared/api/axios'
import { theme } from '../../src/shared/constants/theme/theme'
import { IsMobileProvider } from '../../src/shared/hocs/is-mobile-provider'

// This fixture never contacts the configured panel or uses a real token.
instance.defaults.baseURL = window.location.origin
setAuthorizationToken('audit-fixture-only')
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
const options = new URLSearchParams(window.location.search)
await i18n.use(initReactI18next).init({
    lng: options.get('lang') === 'en' ? 'en' : 'zh',
    defaultNS: 'remnawave',
    resources: { zh: { remnawave: labels }, en: { remnawave: englishLabels } },
    interpolation: { escapeValue: false }
})
createRoot(document.getElementById('root')!).render(
    <MantineProvider
        theme={theme}
        forceColorScheme={options.get('theme') === 'light' ? 'light' : 'dark'}
    >
        <I18nextProvider i18n={i18n}>
            <QueryClientProvider client={queryClient}>
                <ModalsProvider>
                    <IsMobileProvider>
                        <NiceModal.Provider>
                            <Button
                                onClick={() => NiceModal.show(UserAccessAuditModal, { userId: 18 })}
                            >
                                Open selected user
                            </Button>
                            <Button onClick={() => NiceModal.show(UserAccessAuditModal, {})}>
                                Open global audit
                            </Button>
                        </NiceModal.Provider>
                    </IsMobileProvider>
                </ModalsProvider>
            </QueryClientProvider>
        </I18nextProvider>
    </MantineProvider>
)
