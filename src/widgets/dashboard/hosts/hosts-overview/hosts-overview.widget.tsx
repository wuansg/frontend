import {
    Box,
    CloseButton,
    Flex,
    Group,
    Paper,
    SegmentedControl,
    Text,
    TextInput,
    ThemeIcon
} from '@mantine/core'
import { GetConfigProfilesCommand, GetHostsCommand } from '@remnawave/backend-contract'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { TbListCheck, TbSearch } from 'react-icons/tb'

export type HostFilterMode = 'active' | 'all' | 'dangling' | 'disabled' | 'hidden'

type HostItem = GetHostsCommand.Response['response'][number]
type ConfigProfileItem = GetConfigProfilesCommand.Response['response']['configProfiles'][number]

export const isHostDangling = (
    host: HostItem,
    profilesByUuid: Map<string, ConfigProfileItem>
): boolean => {
    const profileUuid = host.inbound.configProfileUuid
    const inboundUuid = host.inbound.configProfileInboundUuid
    if (!profileUuid || !inboundUuid) return true
    const profile = profilesByUuid.get(profileUuid)
    if (!profile) return true
    return !profile.inbounds.some((inbound) => inbound.uuid === inboundUuid)
}

interface HostsOverviewProps {
    configProfiles: ConfigProfileItem[] | undefined
    filter: HostFilterMode
    hosts: HostItem[]
    onFilterChange: (next: HostFilterMode) => void
    onSearchChange: (next: string) => void
    searchQuery: string
}

export const HostsOverviewWidget = memo((props: HostsOverviewProps) => {
    const { configProfiles, filter, hosts, onFilterChange, onSearchChange, searchQuery } = props
    const { t } = useTranslation()

    const profilesByUuid = useMemo(
        () => new Map((configProfiles ?? []).map((p) => [p.uuid, p] as const)),
        [configProfiles]
    )

    const counts = useMemo(() => {
        let active = 0
        let hidden = 0
        let disabled = 0
        let dangling = 0

        for (const host of hosts) {
            const missing = isHostDangling(host, profilesByUuid)
            if (missing) {
                dangling += 1
            }
            if (host.isDisabled) {
                disabled += 1
            } else if (host.isHidden) {
                hidden += 1
            } else if (!missing) {
                active += 1
            }
        }

        return {
            all: hosts.length,
            active,
            hidden,
            disabled,
            dangling
        }
    }, [hosts, profilesByUuid])

    if (hosts.length === 0) {
        return null
    }

    return (
        <Paper
            p="sm"
            radius="md"
            style={{
                background: 'light-dark(var(--mantine-color-white), rgba(255, 255, 255, 0.02))',
                border: '1px solid light-dark(var(--mantine-color-gray-3), rgba(255, 255, 255, 0.08))'
            }}
        >
            <Flex
                align={{ base: 'stretch', md: 'center' }}
                direction={{ base: 'column', md: 'row' }}
                gap="sm"
                justify="space-between"
            >
                <Group gap="sm" miw={0} wrap="wrap">
                    <Group gap="xs" wrap="nowrap">
                        <ThemeIcon color="teal" radius="md" size={34} variant="light">
                            <TbListCheck size={18} />
                        </ThemeIcon>
                        <div>
                            <Text fw={600} size="sm">
                                {t('hosts-overview.widget.title')}
                            </Text>
                            <Text
                                c="dimmed"
                                size="xs"
                                style={{ fontVariantNumeric: 'tabular-nums' }}
                            >
                                {t('hosts-overview.widget.subtitle', {
                                    active: counts.active,
                                    total: counts.all
                                })}
                            </Text>
                        </div>
                    </Group>

                    <Box style={{ overflowX: 'auto', maxWidth: '100%' }}>
                        <SegmentedControl
                            data={[
                                {
                                    value: 'all',
                                    label: `${t('hosts-overview.widget.filter-all')} (${counts.all})`
                                },
                                {
                                    value: 'active',
                                    label: `${t('use-hosts-table-widget.enabled')} (${counts.active})`
                                },
                                {
                                    value: 'hidden',
                                    label: `${t('use-hosts-table-widget.hidden')} (${counts.hidden})`
                                },
                                {
                                    value: 'disabled',
                                    label: `${t('use-hosts-table-widget.disabled')} (${counts.disabled})`
                                },
                                {
                                    value: 'dangling',
                                    label: `${t('host-card.widget.dangling')} (${counts.dangling})`
                                }
                            ]}
                            onChange={(val) => onFilterChange(val as HostFilterMode)}
                            size="xs"
                            style={{ flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}
                            value={filter}
                        />
                    </Box>
                </Group>

                <TextInput
                    leftSection={<TbSearch size={15} />}
                    miw={{ base: '100%', md: 260 }}
                    onChange={(event) => onSearchChange(event.currentTarget.value)}
                    placeholder={t('hosts-overview.widget.search-placeholder')}
                    rightSection={
                        searchQuery ? (
                            <CloseButton
                                aria-label={t('common.clear')}
                                onClick={() => onSearchChange('')}
                                size="sm"
                            />
                        ) : null
                    }
                    size="xs"
                    value={searchQuery}
                />
            </Flex>
        </Paper>
    )
})
