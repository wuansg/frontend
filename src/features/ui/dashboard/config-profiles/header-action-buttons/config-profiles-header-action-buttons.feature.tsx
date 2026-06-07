import {
    ActionIcon,
    ActionIconGroup,
    Button,
    Group,
    Modal,
    SegmentedControl,
    Stack,
    Text,
    TextInput,
    Tooltip
} from '@mantine/core'
import { CreateConfigProfileCommand } from '@remnawave/backend-contract'
import { generatePath, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { TbCode, TbPlus, TbRefresh } from 'react-icons/tb'
import { useDisclosure } from '@mantine/hooks'
import { useTranslation } from 'react-i18next'
import { useField } from '@mantine/form'

import { CONFIG_PROFILES_VIEW_MODE } from '@pages/dashboard/config-profiles/components/interfaces'
import { QueryKeys, useCreateConfigProfile, useGetConfigProfiles } from '@shared/api/hooks'
import { UniversalSpotlightActionIconShared } from '@shared/ui/universal-spotlight'
import { BaseOverlayHeader } from '@shared/ui/overlays/base-overlay-header'
import { HelpActionIconShared } from '@shared/ui/help-drawer'
import { XrayLogo } from '@shared/ui/logos'
import { ROUTES } from '@shared/constants'
import { queryClient } from '@shared/api'

interface IProps {
    configProfileCount: number
    setViewMode: (viewMode: CONFIG_PROFILES_VIEW_MODE) => void
    viewMode: CONFIG_PROFILES_VIEW_MODE
}

type CoreType = 'XRAY' | 'SING_BOX'

const generateDefaultXrayConfig = () => {
    const randomNumber = Math.floor(Math.random() * 999999) + 1

    return {
        log: {
            loglevel: 'info'
        },
        inbounds: [
            {
                tag: `Shadowsocks_${randomNumber}`,
                port: 1234,
                protocol: 'shadowsocks',
                settings: {
                    clients: [],
                    method: 'chacha20-ietf-poly1305',
                    network: 'tcp,udp'
                },
                sniffing: {
                    enabled: true,
                    destOverride: ['http', 'tls', 'quic']
                }
            }
        ],
        outbounds: [
            {
                protocol: 'freedom',
                tag: 'DIRECT'
            },
            {
                protocol: 'blackhole',
                tag: 'BLOCK'
            }
        ],
        routing: {
            rules: []
        }
    }
}

const generateDefaultSingBoxConfig = () => {
    const randomNumber = Math.floor(Math.random() * 999999) + 1

    return {
        log: {
            level: 'info'
        },
        inbounds: [
            {
                type: 'anytls',
                tag: `AnyTLS_${randomNumber}`,
                listen: '::',
                listen_port: 443,
                users: [],
                tls: {
                    enabled: true,
                    server_name: 'example.com',
                    certificate_path: '/etc/remnawave/cert.pem',
                    key_path: '/etc/remnawave/key.pem'
                }
            }
        ],
        outbounds: [
            {
                type: 'direct',
                tag: 'DIRECT'
            },
            {
                type: 'block',
                tag: 'BLOCK'
            }
        ],
        route: {
            rules: []
        }
    }
}

export const ConfigProfilesHeaderActionButtonsFeature = (props: IProps) => {
    const { configProfileCount, setViewMode, viewMode } = props
    const { isFetching } = useGetConfigProfiles()
    const { t } = useTranslation()

    const [opened, { open, close }] = useDisclosure(false)
    const [coreType, setCoreType] = useState<CoreType>('XRAY')
    const navigate = useNavigate()

    const handleUpdate = async () => {
        await queryClient.refetchQueries({
            queryKey: QueryKeys.configProfiles.getConfigProfiles.queryKey
        })
    }

    const nameField = useField<CreateConfigProfileCommand.Request['name']>({
        initialValue: '',
        validateOnChange: true,
        validate: (value) => {
            const result = CreateConfigProfileCommand.RequestSchema.omit({
                config: true
            }).safeParse({ name: value })
            return result.success ? null : result.error.errors[0]?.message
        }
    })
    const { mutate: createConfigProfile, isPending } = useCreateConfigProfile({
        mutationFns: {
            onSuccess: (data) => {
                close()
                nameField.reset()
                setCoreType('XRAY')
                handleUpdate()
                navigate(
                    generatePath(ROUTES.DASHBOARD.MANAGEMENT.CONFIG_PROFILE_BY_UUID, {
                        uuid: data.uuid
                    })
                )
            }
        }
    })

    return (
        <Group grow preventGrowOverflow={false} wrap="wrap">
            <HelpActionIconShared hidden={false} screen="PAGE_CONFIG_PROFILES" />

            {configProfileCount > 0 && <UniversalSpotlightActionIconShared />}

            <ActionIconGroup>
                <ActionIcon
                    color="gray"
                    onClick={() =>
                        setViewMode(
                            viewMode === CONFIG_PROFILES_VIEW_MODE.PROFILES
                                ? CONFIG_PROFILES_VIEW_MODE.SNIPPETS
                                : CONFIG_PROFILES_VIEW_MODE.PROFILES
                        )
                    }
                    size="input-md"
                    variant="soft"
                >
                    {viewMode === CONFIG_PROFILES_VIEW_MODE.PROFILES ? (
                        <TbCode size="24px" />
                    ) : (
                        <XrayLogo size="24px" />
                    )}
                </ActionIcon>
            </ActionIconGroup>

            <ActionIconGroup>
                <Tooltip label={t('common.update')} withArrow>
                    <ActionIcon
                        loading={isFetching}
                        onClick={handleUpdate}
                        size="input-md"
                        variant="soft"
                    >
                        <TbRefresh size="24px" />
                    </ActionIcon>
                </Tooltip>
            </ActionIconGroup>

            <ActionIconGroup>
                <Tooltip
                    label={t('config-profiles-header-action-buttons.feature.create-config-profile')}
                    withArrow
                >
                    <ActionIcon color="teal" onClick={open} size="input-md" variant="soft">
                        <TbPlus size="24px" />
                    </ActionIcon>
                </Tooltip>
            </ActionIconGroup>

            <Modal
                centered
                onClose={close}
                opened={opened}
                size="md"
                title={
                    <BaseOverlayHeader
                        IconComponent={XrayLogo}
                        iconVariant="soft"
                        title={t(
                            'config-profiles-header-action-buttons.feature.create-config-profile'
                        )}
                    />
                }
            >
                <form
                    onSubmit={(e) => {
                        e.preventDefault()
                        createConfigProfile({
                            variables: {
                                name: nameField.getValue(),
                                coreType,
                                config:
                                    coreType === 'SING_BOX'
                                        ? generateDefaultSingBoxConfig()
                                        : generateDefaultXrayConfig()
                            } as CreateConfigProfileCommand.Request
                        })
                    }}
                >
                    <Stack gap="md">
                        <Text size="sm">
                            {t(
                                'config-profiles-header-action-buttons.feature.create-a-new-config-profile-by-entering-a-name-below'
                            )}
                            <br />

                            {t(
                                'config-profiles-header-action-buttons.feature.you-can-customize-xray-config-after-creation'
                            )}
                        </Text>
                        <TextInput
                            data-autofocus
                            label={t('config-profiles-header-action-buttons.feature.profile-name')}
                            placeholder={t(
                                'config-profiles-header-action-buttons.feature.enter-profile-name'
                            )}
                            required
                            {...nameField.getInputProps()}
                        />
                        <SegmentedControl
                            data={[
                                { label: 'Xray', value: 'XRAY' },
                                { label: 'Sing-box', value: 'SING_BOX' }
                            ]}
                            onChange={(value) => setCoreType(value as CoreType)}
                            value={coreType}
                        />
                        <Group justify="flex-end">
                            <Button color="gray" onClick={close} variant="light">
                                {t('common.cancel')}
                            </Button>

                            <Button color="teal" loading={isPending} type="submit">
                                {t('common.create')}
                            </Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>
        </Group>
    )
}
