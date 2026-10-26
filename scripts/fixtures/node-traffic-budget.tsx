import '@mantine/core/styles.css'
import { Box, Group, MantineProvider, Paper, Stack, Text, Title } from '@mantine/core'
import i18n from 'i18next'
import { createRoot } from 'react-dom/client'
import { initReactI18next, I18nextProvider } from 'react-i18next'

import english from '../../public/locales/en/remnawave.json'
import chinese from '../../public/locales/zh/remnawave.json'
import { theme } from '../../src/shared/constants/theme/theme'
import { NodeTrafficProgress } from '../../src/shared/ui/node-traffic-progress'

const params = new URLSearchParams(location.search)
await i18n.use(initReactI18next).init({
    lng: params.get('lang') === 'en' ? 'en' : 'zh',
    defaultNS: 'remnawave',
    resources: { zh: { remnawave: chinese }, en: { remnawave: english } },
    interpolation: { escapeValue: false }
})
const GiB = 1024 ** 3
const samples = [
    { id: 'under', title: 'Node details · 节点详情', used: 265.7, limit: 500 },
    { id: 'over', title: 'Over daily budget · 超出均分', used: 480, limit: 500 },
    { id: 'exhausted', title: 'Quota exceeded · 已超额', used: 600, limit: 500 },
    { id: 'unlimited', title: 'Unlimited · 无限流量', used: 265.7, limit: 0 },
    {
        id: 'disabled',
        title: 'Tracking disabled · 统计关闭',
        used: 265.7,
        limit: 500,
        disabled: true
    },
    { id: 'compact', title: 'Node list · 节点列表', used: 265.7, limit: 500, compact: true }
]
createRoot(document.getElementById('root')!).render(
    <MantineProvider
        theme={theme}
        forceColorScheme={params.get('theme') === 'light' ? 'light' : 'dark'}
    >
        <I18nextProvider i18n={i18n}>
            <Box maw={760} mx="auto" p="md">
                <Stack>
                    {samples.map((sample) => (
                        <Paper
                            key={sample.id}
                            data-testid={sample.id}
                            p="lg"
                            radius="md"
                            withBorder
                        >
                            <Title mb="lg" order={4}>
                                {sample.title}
                            </Title>
                            <Group justify="space-between" mb="xs">
                                <Text ff="monospace" fw={600}>
                                    {sample.used.toFixed(2)} GiB
                                </Text>
                                <Text c="dimmed" size="xs">
                                    {sample.limit ? `${sample.limit.toFixed(2)} GiB` : '∞'}
                                </Text>
                            </Group>
                            <NodeTrafficProgress
                                node={{
                                    isTrafficTrackingActive: !sample.disabled,
                                    trafficUsedBytes: sample.used * GiB,
                                    trafficLimitBytes: sample.limit * GiB,
                                    trafficResetDay: 1
                                }}
                                value={sample.limit ? (sample.used * 100) / sample.limit : 100}
                                color={sample.used > sample.limit && sample.limit ? 'red' : 'teal'}
                                size={sample.compact ? 'xs' : 'sm'}
                                compact={sample.compact}
                            />
                        </Paper>
                    ))}
                </Stack>
            </Box>
        </I18nextProvider>
    </MantineProvider>
)
