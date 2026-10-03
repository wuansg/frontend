import { Stack, TextInput, Group, Button, Text, Select } from '@mantine/core'
import { useField } from '@mantine/form'
import { CreateConfigProfileCommand } from '@remnawave/backend-contract'
import { t } from 'i18next'
import { useState } from 'react'
import { generatePath, NavigateFunction } from 'react-router'

import { queryClient } from '@shared/api'
import { useCreateConfigProfile } from '@shared/api/hooks/config-profiles/config-profiles.mutation.hooks'
import { QueryKeys } from '@shared/api/hooks/keys-factory'
import { ROUTES } from '@shared/constants/routes'

interface IProps {
    onClose: () => void
    navigate: NavigateFunction
}

const generateDefaultSingBoxConfig = (protocol: 'anytls' | 'snell' = 'anytls') => {
    const randomNumber = Math.floor(Math.random() * 999999) + 1

    return {
        log: { level: 'info' },
        inbounds: [
            protocol === 'snell' ? {
                type: 'snell',
                tag: `Snell_${randomNumber}`,
                listen: '0.0.0.0',
                listen_port: 54320,
                version: 5,
                multi_user_psk: true,
                users: []
            } : {
                type: 'anytls',
                tag: `AnyTLS_${randomNumber}`,
                listen: '::',
                listen_port: 54321,
                users: [],
                tls: {
                    enabled: true,
                    certificate_path: '/root/cert/anytls/cert.pem',
                    key_path: '/root/cert/anytls/cert.key'
                }
            }
        ],
        outbounds: [
            { type: 'direct', tag: 'DIRECT' },
            { type: 'block', tag: 'BLOCK' }
        ],
        route: { rules: [] }
    }
}

export const CreateConfigProfileContent = (props: IProps) => {
    const { onClose, navigate } = props
    const [protocol, setProtocol] = useState<'anytls' | 'snell'>('anytls')

    const handleUpdate = async () => {
        await queryClient.refetchQueries({
            queryKey: QueryKeys.configProfiles.getConfigProfiles.queryKey
        })
    }

    const nameField = useField<CreateConfigProfileCommand.RequestBody['name']>({
        initialValue: '',
        validateOnChange: true,
        validate: (value) => {
            const result = CreateConfigProfileCommand.RequestBodySchema.pick({
                name: true
            }).safeParse({ name: value })
            return result.success ? null : result.error.issues[0]?.message
        }
    })
    const { mutate: createConfigProfile, isPending } = useCreateConfigProfile({
        mutationFns: {
            onSuccess: (data) => {
                onClose()

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
        <form
            onSubmit={(e) => {
                e.preventDefault()
                createConfigProfile({
                    variables: {
                        name: nameField.getValue(),
                        coreType: 'SING_BOX',
                        config: generateDefaultSingBoxConfig(protocol)
                    }
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
                        'config-profiles-header-action-buttons.feature.you-can-customize-core-config-after-creation'
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
                <Select
                    aria-label="Protocol"
                    data={[
                        { value: 'anytls', label: 'AnyTLS' },
                        { value: 'snell', label: 'Snell v5 (Remnanode ≥ 3.14.0)' }
                    ]}
                    value={protocol}
                    onChange={(value) => setProtocol(value === 'snell' ? 'snell' : 'anytls')}
                    allowDeselect={false}
                />
                <Group justify="flex-end">
                    <Button color="gray" onClick={onClose} variant="light">
                        {t('common.cancel')}
                    </Button>

                    <Button color="teal" loading={isPending} type="submit">
                        {t('common.create')}
                    </Button>
                </Group>
            </Stack>
        </form>
    )
}
