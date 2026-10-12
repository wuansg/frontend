import '@mantine/core/styles.css'
import NiceModal from '@ebay/nice-modal-react'
import { Button, MantineProvider } from '@mantine/core'
import { ModalsProvider } from '@mantine/modals'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import i18n from 'i18next'
import { createRoot } from 'react-dom/client'
import { initReactI18next, I18nextProvider } from 'react-i18next'

import { NodeDeploymentsModal } from '../../src/shared/_modals/nodes/node-deployments/node-deployments.modal'
import { instance, setAuthorizationToken } from '../../src/shared/api/axios'
import { theme } from '../../src/shared/constants/theme/theme'
instance.defaults.baseURL = window.location.origin
setAuthorizationToken('deployment-fixture-only')
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
await i18n
    .use(initReactI18next)
    .init({ lng: 'zh', resources: {}, interpolation: { escapeValue: false } })
createRoot(document.getElementById('root')!).render(
    <MantineProvider theme={theme} forceColorScheme="dark">
        <I18nextProvider i18n={i18n}>
            <QueryClientProvider client={client}>
                <ModalsProvider>
                    <NiceModal.Provider>
                        <Button
                            onClick={() =>
                                NiceModal.show(NodeDeploymentsModal, {
                                    nodeUuid: '10000000-0000-4000-8000-000000000001'
                                })
                            }
                        >
                            Open fixture
                        </Button>
                    </NiceModal.Provider>
                </ModalsProvider>
            </QueryClientProvider>
        </I18nextProvider>
    </MantineProvider>
)
