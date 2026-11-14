import { Stack } from '@mantine/core'
import { SrhInspectorMetrics } from '@widgets/dashboard/srh-inspector/srh-inspector-metrics'
import { SrhInspectorTableWidget } from '@widgets/dashboard/srh-inspector/srh-inspector-table'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { TbReportAnalytics } from 'react-icons/tb'

import { Page, PageHeaderShared } from '@shared/ui'

export default function SrhInspectorPageComponent() {
    const { t } = useTranslation()

    return (
        <Page title={t('constants.srh-inspector')}>
            <PageHeaderShared
                icon={<TbReportAnalytics size={24} />}
                title={t('constants.srh-inspector')}
            />
            <Stack gap="md">
                <SrhInspectorMetrics />

                <motion.div
                    animate={{ opacity: 1 }}
                    initial={{ opacity: 0 }}
                    transition={{ duration: 0.5, ease: [0, 0.71, 0.2, 1.01] }}
                >
                    <SrhInspectorTableWidget />
                </motion.div>
            </Stack>
        </Page>
    )
}
