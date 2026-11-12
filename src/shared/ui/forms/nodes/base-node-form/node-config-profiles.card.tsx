import { ShowConfigProfilesWithInboundsFeature } from '@features/ui/dashboard/nodes/show-config-profiles-with-inbounds'
import { Badge, Group, Skeleton, Stack } from '@mantine/core'
import { UseFormReturnType } from '@mantine/form'
import { CreateNodeCommand, UpdateNodeCommand } from '@remnawave/backend-contract'
import { ForwardRefComponent, HTMLMotionProps, motion, Variants } from 'motion/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SiSecurityscorecard } from 'react-icons/si'
import { TbTag } from 'react-icons/tb'

import { useGetConfigProfiles } from '@shared/api/hooks'
import { BaseOverlayHeader } from '@shared/ui/overlays/base-overlay-header'
import { SectionCard } from '@shared/ui/section-card'

interface IProps<T extends CreateNodeCommand.RequestBody | UpdateNodeCommand.RequestBody> {
    cardVariants: Variants
    form: UseFormReturnType<T>
    motionWrapper: ForwardRefComponent<HTMLDivElement, HTMLMotionProps<'div'>>
}

export const NodeConfigProfilesCard = <
    T extends CreateNodeCommand.RequestBody | UpdateNodeCommand.RequestBody
>(
    props: IProps<T>
) => {
    const { t } = useTranslation()
    const { cardVariants, form, motionWrapper: MotionWrapper } = props

    const { data: configProfiles, isLoading: isConfigProfilesLoading } = useGetConfigProfiles()

    const [profileState, setProfileState] = useState<{
        activeConfigProfileUuid?: string
        activeInbounds: string[]
    }>(() => ({
        activeConfigProfileUuid: form.getValues().configProfile?.activeConfigProfileUuid,
        activeInbounds: form.getValues().configProfile?.activeInbounds ?? []
    }))

    form.watch('configProfile', ({ value }) => {
        setProfileState({
            activeConfigProfileUuid: value?.activeConfigProfileUuid,
            activeInbounds: value?.activeInbounds ?? []
        })
    })

    const saveInbounds = (inbounds: string[], configProfileUuid: string) => {
        form.setValues({
            configProfile: {
                activeInbounds: inbounds,
                activeConfigProfileUuid: configProfileUuid
            }
        } as Partial<T>)
        form.setTouched({
            activeConfigProfileUuid: true,
            activeInbounds: true
        })
        form.setDirty({
            activeConfigProfileUuid: true,
            activeInbounds: true
        })
        setProfileState({
            activeConfigProfileUuid: configProfileUuid,
            activeInbounds: inbounds
        })
    }

    const inboundCount = profileState.activeInbounds.length
    const subtitle =
        inboundCount > 0
            ? t('base-node-form.core-configuration-subtitle', { count: inboundCount })
            : t('base-node-form.core-configuration-empty-subtitle')

    return (
        <MotionWrapper variants={cardVariants}>
            <SectionCard.Root>
                <SectionCard.Section>
                    <Group gap="xs" justify="space-between" wrap="nowrap">
                        <BaseOverlayHeader
                            iconColor="teal"
                            IconComponent={SiSecurityscorecard}
                            iconVariant="soft"
                            subtitle={subtitle}
                            title={t('base-node-form.core-configuration')}
                            titleOrder={5}
                        />

                        <Badge
                            color={inboundCount > 0 ? 'teal' : 'gray'}
                            leftSection={<TbTag size={12} />}
                            size="sm"
                            style={{ flexShrink: 0 }}
                            variant="light"
                        >
                            {inboundCount}
                        </Badge>
                    </Group>
                </SectionCard.Section>
                <SectionCard.Section>
                    {isConfigProfilesLoading && (
                        <Stack gap="sm">
                            <Skeleton height={58} radius="md" />
                        </Stack>
                    )}

                    {!isConfigProfilesLoading && configProfiles && (
                        <motion.div
                            animate={{ opacity: 1 }}
                            initial={{ opacity: 0 }}
                            transition={{
                                duration: 0.3,
                                ease: 'easeInOut'
                            }}
                        >
                            <ShowConfigProfilesWithInboundsFeature
                                activeConfigProfileInbounds={profileState.activeInbounds}
                                activeConfigProfileUuid={profileState.activeConfigProfileUuid}
                                configProfiles={configProfiles.configProfiles}
                                errors={form.errors.configProfile}
                                onSaveInbounds={saveInbounds}
                            />
                        </motion.div>
                    )}
                </SectionCard.Section>
            </SectionCard.Root>
        </MotionWrapper>
    )
}
