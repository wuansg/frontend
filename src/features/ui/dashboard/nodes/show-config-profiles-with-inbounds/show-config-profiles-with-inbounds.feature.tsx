import {
    ActionIcon,
    Alert,
    Box,
    Button,
    Group,
    Paper,
    Stack,
    Text,
    ThemeIcon,
    Tooltip
} from '@mantine/core'
import clsx from 'clsx'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { TbAlertTriangle, TbEdit, TbFilePlus } from 'react-icons/tb'

import { showModal } from '@shared/_modals/show-modal'
import { detectInboundPortConflicts } from '@shared/ui/forms/nodes/base-node-form/node-forwarding.utils'
import { SingboxLogo } from '@shared/ui/logos'
import surface from '@shared/ui/node-panel-surface.module.css'

import { IProps } from './interfaces'

export function ShowConfigProfilesWithInboundsFeature(props: IProps) {
    const {
        activeConfigProfileInbounds,
        activeConfigProfileUuid,
        configProfiles,
        onSaveInbounds,
        errors
    } = props

    const { t } = useTranslation()

    const activeProfile = configProfiles.find((profile) => profile.uuid === activeConfigProfileUuid)

    const activeInboundDetails = useMemo(() => {
        if (!activeProfile || !activeConfigProfileInbounds?.length) return []
        return activeConfigProfileInbounds
            .map((inboundUuid) =>
                activeProfile.inbounds.find((inbound) => inbound.uuid === inboundUuid)
            )
            .filter((item): item is NonNullable<typeof item> => Boolean(item))
    }, [activeConfigProfileInbounds, activeProfile])

    const portConflicts = useMemo(
        () => detectInboundPortConflicts(activeInboundDetails),
        [activeInboundDetails]
    )
    const conflictingTags = useMemo(
        () => new Set(portConflicts.flatMap((conflict) => conflict.tags)),
        [portConflicts]
    )

    const inboundsCount = activeConfigProfileInbounds?.length ?? 0
    const hasError = Boolean(errors) || portConflicts.length > 0

    if (!activeProfile) {
        return (
            <Paper
                className={clsx(surface.emptyState, hasError && surface.accentError)}
                p="md"
                radius="md"
            >
                <Stack align="center" gap="xs">
                    <ThemeIcon color="teal" radius="xl" size="lg" variant="light">
                        <SingboxLogo size={18} />
                    </ThemeIcon>
                    <Text fw={600} size="sm" ta="center">
                        {t('show-config-profiles-with-inbounds.feature.no-config-profile-selected')}
                    </Text>
                    <Text c="dimmed" maw={360} size="xs" ta="center">
                        {t(
                            'show-config-profiles-with-inbounds.feature.choose-a-profile-to-configure-inbounds-for-this-node'
                        )}
                    </Text>
                    <Button
                        color="teal"
                        leftSection={<TbFilePlus size={15} />}
                        mt={2}
                        size="xs"
                        variant="light"
                        onClick={() =>
                            showModal('nodes_nodesConfigProfilesDrawer', {
                                activeConfigProfileInbounds: [],
                                activeConfigProfileUuid: undefined,
                                onSaveInbounds
                            })
                        }
                    >
                        {t('common.select')}
                    </Button>
                </Stack>
            </Paper>
        )
    }

    return (
        <Paper
            className={clsx(
                surface.subPanel,
                surface.subPanelInteractive,
                hasError
                    ? surface.accentError
                    : inboundsCount > 0
                      ? surface.accentTeal
                      : surface.accentMuted
            )}
            p="sm"
            radius="md"
        >
            <Stack gap="xs">
                <Group gap="sm" justify="space-between" wrap="nowrap">
                    <Group gap="sm" style={{ flex: 1, minWidth: 0 }} wrap="nowrap">
                        <ThemeIcon
                            color={inboundsCount > 0 ? 'teal' : 'gray'}
                            size="md"
                            variant="soft"
                        >
                            <SingboxLogo size={16} />
                        </ThemeIcon>
                        <Text fw={600} size="sm" truncate>
                            {activeProfile.name}
                        </Text>
                    </Group>

                    <Tooltip label={t('common.edit')}>
                        <ActionIcon
                            color="teal"
                            size="md"
                            variant="light"
                            onClick={() =>
                                showModal('nodes_nodesConfigProfilesDrawer', {
                                    activeConfigProfileInbounds,
                                    activeConfigProfileUuid,
                                    onSaveInbounds
                                })
                            }
                        >
                            <TbEdit size={16} />
                        </ActionIcon>
                    </Tooltip>
                </Group>

                {activeInboundDetails.length > 0 && (
                    <Group gap={6} wrap="wrap">
                        {activeInboundDetails.map((inbound) => (
                            <Box key={inbound.uuid} className={surface.routePill}>
                                <Text
                                    c={conflictingTags.has(inbound.tag) ? 'red.4' : 'gray.3'}
                                    size="xs"
                                    span
                                >
                                    {inbound.tag}
                                </Text>
                                {inbound.port !== null && inbound.port !== undefined && (
                                    <Text c="teal.3" fw={600} size="xs" span>
                                        :{inbound.port}
                                    </Text>
                                )}
                            </Box>
                        ))}
                    </Group>
                )}

                {portConflicts.length > 0 && (
                    <Alert
                        color="red"
                        icon={<TbAlertTriangle size={16} />}
                        p="xs"
                        title={t('show-config-profiles-with-inbounds.feature.port-conflict-title')}
                        variant="light"
                    >
                        <Stack gap={4}>
                            {portConflicts.map((conflict) => (
                                <Text key={`${conflict.port}-${conflict.tags.join('-')}`} size="xs">
                                    {t(
                                        'show-config-profiles-with-inbounds.feature.port-conflict-item',
                                        {
                                            protocol: conflict.protocol,
                                            port: conflict.port,
                                            left: conflict.tags[0],
                                            right: conflict.tags[1]
                                        }
                                    )}
                                </Text>
                            ))}
                        </Stack>
                    </Alert>
                )}
            </Stack>
        </Paper>
    )
}
