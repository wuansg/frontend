import { Group, NumberInput, Select, SimpleGrid, Stack, TextInput } from '@mantine/core'
import { UseFormReturnType } from '@mantine/form'
import {
    CreateNodeCommand,
    GetNodePluginsCommand,
    GetNodeSecretKeyCommand,
    UpdateNodeCommand
} from '@remnawave/backend-contract'
import { ForwardRefComponent, HTMLMotionProps, Variants } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { HiOutlineServer } from 'react-icons/hi'
import {
    TbCertificate,
    TbMapPin,
    TbNetwork,
    TbPackage,
    TbPlugConnected,
    TbUserCheck,
    TbWorld
} from 'react-icons/tb'

import { CopyableFieldShared } from '@shared/ui/copyable-field/copyable-field'
import { BaseOverlayHeader } from '@shared/ui/overlays/base-overlay-header'
import { SectionCard } from '@shared/ui/section-card'

import { COUNTRIES } from './constants'

interface IProps<T extends CreateNodeCommand.RequestBody | UpdateNodeCommand.RequestBody> {
    cardVariants: Variants
    form: UseFormReturnType<T>
    motionWrapper: ForwardRefComponent<HTMLDivElement, HTMLMotionProps<'div'>>
    nodePlugins: GetNodePluginsCommand.Response['response']['nodePlugins']
    nodeUuid: string
    secretKey: GetNodeSecretKeyCommand.Response['response'] | undefined
}

export const NodeVitalsCard = <
    T extends CreateNodeCommand.RequestBody | UpdateNodeCommand.RequestBody
>(
    props: IProps<T>
) => {
    const { t } = useTranslation()
    const {
        cardVariants,
        form,
        motionWrapper: MotionWrapper,
        nodePlugins,
        secretKey,
        nodeUuid
    } = props

    return (
        <MotionWrapper variants={cardVariants}>
            <SectionCard.Root>
                <SectionCard.Section>
                    <BaseOverlayHeader
                        iconColor="blue"
                        IconComponent={HiOutlineServer}
                        iconVariant="soft"
                        subtitle={nodeUuid}
                        title={t('base-node-form.node-vitals')}
                        titleOrder={5}
                        truncateTitle
                        withCopy
                    />
                </SectionCard.Section>
                <SectionCard.Section>
                    <Stack gap="sm">
                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                            <Select
                                key={form.key('countryCode')}
                                data={COUNTRIES}
                                label={t('base-node-form.country')}
                                leftSection={<TbMapPin size={15} />}
                                placeholder={t('base-node-form.select-country')}
                                required
                                searchable
                                size="xs"
                                {...form.getInputProps('countryCode')}
                            />

                            <TextInput
                                key={form.key('name')}
                                label={t('base-node-form.internal-name')}
                                leftSection={<TbUserCheck size={15} />}
                                placeholder={t('base-node-form.internal-name-placeholder')}
                                required
                                size="xs"
                                {...form.getInputProps('name')}
                            />
                        </SimpleGrid>

                        <Group align="flex-start" gap="xs" grow={false} w="100%" wrap="nowrap">
                            <TextInput
                                key={form.key('address')}
                                label={t('base-node-form.address')}
                                leftSection={<TbWorld size={15} />}
                                placeholder={t('base-node-form.e-g-example-com')}
                                required
                                size="xs"
                                style={{ flex: '1 1 68%', minWidth: 0 }}
                                {...form.getInputProps('address')}
                            />

                            <NumberInput
                                key={form.key('port')}
                                allowDecimal={false}
                                allowNegative={false}
                                clampBehavior="strict"
                                decimalScale={0}
                                hideControls
                                label={t('base-node-form.node-port')}
                                leftSection={<TbPlugConnected size={15} />}
                                max={65535}
                                min={1}
                                placeholder="2222"
                                required
                                size="xs"
                                style={{ flex: '1 1 32%', minWidth: 112 }}
                                {...form.getInputProps('port')}
                            />
                        </Group>

                        <CopyableFieldShared
                            label={t('base-node-form.secret-key')}
                            leftSection={<TbCertificate size={15} />}
                            size="xs"
                            value={
                                secretKey?.secretKey?.trimEnd() ??
                                t('base-node-form.secret-key-loading')
                            }
                        />

                        <Select
                            key={form.key('activePluginUuid')}
                            allowDeselect
                            clearable
                            data={nodePlugins.map((nodePlugin) => ({
                                label: nodePlugin.name,
                                value: nodePlugin.uuid
                            }))}
                            description={t(
                                'node-vitals.card.review-documentation-for-more-information'
                            )}
                            inputWrapperOrder={['label', 'input', 'description', 'error']}
                            label={t('node-vitals.card.plugin')}
                            leftSection={<TbPackage size={15} />}
                            nothingFoundMessage={t('node-vitals.card.nothing-found')}
                            placeholder={t('node-vitals.card.select-plugin')}
                            searchable
                            size="xs"
                            {...form.getInputProps('activePluginUuid')}
                        />

                        <TextInput
                            key={form.key('proxyUrl')}
                            description={t('node-vitals.card.proxy-url-description')}
                            inputWrapperOrder={['label', 'input', 'description', 'error']}
                            label={t('node-vitals.card.proxy-url')}
                            leftSection={<TbNetwork size={15} />}
                            placeholder="socks5://user:pass@address:port"
                            size="xs"
                            {...form.getInputProps('proxyUrl')}
                        />
                    </Stack>
                </SectionCard.Section>
            </SectionCard.Root>
        </MotionWrapper>
    )
}
