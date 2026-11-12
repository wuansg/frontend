import { DeleteNodeFeature } from '@features/ui/dashboard/nodes/delete-node'
import { ResetNodeTrafficFeature } from '@features/ui/dashboard/nodes/reset-node-traffic'
import { RestartNodeButtonFeature } from '@features/ui/dashboard/nodes/restart-node-button'
import { ToggleNodeStatusButtonFeature } from '@features/ui/dashboard/nodes/toggle-node-status-button'
import { Badge, Button, CopyButton, Group, Menu, px, Stack } from '@mantine/core'
import { UseFormReturnType } from '@mantine/form'
import {
    GetNodeCommand,
    GetNodePluginsCommand,
    GetNodeSecretKeyCommand,
    UpdateNodeCommand
} from '@remnawave/backend-contract'
import { ModalAccordionWidget } from '@widgets/dashboard/nodes/modal-accordeon-widget'
import { motion } from 'framer-motion'
import { ReactNode, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PiFloppyDiskDuotone } from 'react-icons/pi'
import { TbCopy, TbDots, TbHistory, TbRotate } from 'react-icons/tb'

import { useIsMobile } from '@shared/hooks'
import { ModalFooter } from '@shared/ui/modal-footer'

import { NodeConfigProfilesCard } from './node-config-profiles.card'
import { NodeConsumptionCard } from './node-consumption.card'
import { NodeDeploymentCard } from './node-deployment.card'
import { NodeForwardingCard } from './node-forwarding.card'
import { NodeIpsCard } from './node-ips.card'
import { NodeTrackingAndBillingCard } from './node-tracking-and-billing.card'
import { NodeVitalsCard } from './node-vitals.card'

const MotionWrapper = motion.div
const MotionStack = motion.create(Stack)

const containerVariants = {
    hidden: {},
    visible: {
        transition: {
            staggerChildren: 0.08
        }
    }
}

const cardVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.25 }
    }
}

interface IProps<T extends UpdateNodeCommand.RequestBody> {
    form: UseFormReturnType<T>
    handleClose: () => void
    handleSubmit: () => void
    isDataSubmitting: boolean
    node: GetNodeCommand.Response['response']
    nodeDetailsCard?: ReactNode
    nodePlugins: GetNodePluginsCommand.Response['response']['nodePlugins']
    nodeSystemCard?: ReactNode
    onOpenDeployments?: () => void
    secretKey: GetNodeSecretKeyCommand.Response['response'] | undefined
}

export const BaseNodeForm = <T extends UpdateNodeCommand.RequestBody>(props: IProps<T>) => {
    const {
        form,
        node,
        nodePlugins,
        secretKey,
        nodeDetailsCard,
        nodeSystemCard,
        handleClose,
        handleSubmit,
        isDataSubmitting,
        onOpenDeployments
    } = props

    const { t } = useTranslation()
    const isMobile = useIsMobile()
    const [resetSeed, setResetSeed] = useState(0)

    const isDirty = form.isDirty()

    const handleDiscard = () => {
        form.reset()
        form.clearErrors()
        setResetSeed((prev) => prev + 1)
    }

    return (
        <>
            {isMobile ? (
                <MotionStack
                    animate="visible"
                    gap="md"
                    initial="hidden"
                    variants={containerVariants}
                >
                    <ModalAccordionWidget node={node} />

                    {nodeDetailsCard && (
                        <MotionWrapper variants={cardVariants}>{nodeDetailsCard}</MotionWrapper>
                    )}

                    {nodeSystemCard && node.system && (
                        <MotionWrapper variants={cardVariants}>{nodeSystemCard}</MotionWrapper>
                    )}

                    <NodeVitalsCard
                        cardVariants={cardVariants}
                        form={form}
                        motionWrapper={MotionWrapper}
                        nodePlugins={nodePlugins}
                        nodeUuid={node.uuid}
                        secretKey={secretKey}
                    />

                    <NodeDeploymentCard
                        cardVariants={cardVariants}
                        form={form}
                        motionWrapper={MotionWrapper}
                        node={node}
                        onOpenDeployments={onOpenDeployments}
                    />

                    <NodeConfigProfilesCard
                        cardVariants={cardVariants}
                        form={form}
                        motionWrapper={MotionWrapper}
                    />

                    <NodeForwardingCard
                        cardVariants={cardVariants}
                        motionWrapper={MotionWrapper}
                        node={node}
                        nodeUuid={node.uuid}
                    />

                    <NodeConsumptionCard
                        cardVariants={cardVariants}
                        form={form}
                        motionWrapper={MotionWrapper}
                    />

                    <NodeIpsCard
                        key={`ips-m-${resetSeed}`}
                        cardVariants={cardVariants}
                        form={form}
                        motionWrapper={MotionWrapper}
                    />

                    <NodeTrackingAndBillingCard
                        key={`track-m-${resetSeed}`}
                        cardVariants={cardVariants}
                        form={form}
                        motionWrapper={MotionWrapper}
                    />
                </MotionStack>
            ) : (
                <Group align="flex-start" gap="md" grow={false} wrap="wrap">
                    {/* Left Side */}
                    <MotionStack
                        animate="visible"
                        gap="md"
                        initial="hidden"
                        style={{ flex: '1 1 420px', minWidth: 0 }}
                        variants={containerVariants}
                    >
                        <ModalAccordionWidget node={node} />

                        {nodeDetailsCard && (
                            <MotionWrapper variants={cardVariants}>{nodeDetailsCard}</MotionWrapper>
                        )}

                        <NodeVitalsCard
                            cardVariants={cardVariants}
                            form={form}
                            motionWrapper={MotionWrapper}
                            nodePlugins={nodePlugins}
                            nodeUuid={node.uuid}
                            secretKey={secretKey}
                        />

                        <NodeDeploymentCard
                            cardVariants={cardVariants}
                            form={form}
                            motionWrapper={MotionWrapper}
                            node={node}
                            onOpenDeployments={onOpenDeployments}
                        />

                        <NodeConsumptionCard
                            cardVariants={cardVariants}
                            form={form}
                            motionWrapper={MotionWrapper}
                        />

                        <NodeIpsCard
                            key={`ips-d-${resetSeed}`}
                            cardVariants={cardVariants}
                            form={form}
                            motionWrapper={MotionWrapper}
                        />
                    </MotionStack>

                    {/* Right Side */}
                    <MotionStack
                        animate="visible"
                        gap="md"
                        initial="hidden"
                        style={{ flex: '1 1 420px', minWidth: 0 }}
                        variants={containerVariants}
                    >
                        {nodeSystemCard && node.system && (
                            <MotionWrapper variants={cardVariants}>{nodeSystemCard}</MotionWrapper>
                        )}

                        <NodeConfigProfilesCard
                            cardVariants={cardVariants}
                            form={form}
                            motionWrapper={MotionWrapper}
                        />

                        <NodeForwardingCard
                            cardVariants={cardVariants}
                            motionWrapper={MotionWrapper}
                            node={node}
                            nodeUuid={node.uuid}
                        />

                        <NodeTrackingAndBillingCard
                            key={`track-d-${resetSeed}`}
                            cardVariants={cardVariants}
                            form={form}
                            motionWrapper={MotionWrapper}
                        />
                    </MotionStack>
                </Group>
            )}

            <ModalFooter isMobile={isMobile}>
                {node && (
                    <Menu keepMounted={true} position="top-end" shadow="md">
                        <Menu.Target>
                            <Button
                                color="gray"
                                leftSection={<TbDots size={px('1.2rem')} />}
                                size="md"
                                variant="light"
                            >
                                {t('base-node-form.more-actions')}
                            </Button>
                        </Menu.Target>

                        <Menu.Dropdown>
                            <DeleteNodeFeature handleClose={handleClose} node={node} />
                            <Menu.Divider />

                            <Menu.Label>{t('base-node-form.management')}</Menu.Label>
                            {onOpenDeployments && (
                                <Menu.Item
                                    leftSection={<TbHistory size="16px" />}
                                    onClick={onOpenDeployments}
                                >
                                    {t('base-node-form.releases-and-rollback')}
                                </Menu.Item>
                            )}
                            <CopyButton value={node.uuid}>
                                {({ copy }) => (
                                    <Menu.Item leftSection={<TbCopy size="16px" />} onClick={copy}>
                                        {t('common.copy-uuid')}
                                    </Menu.Item>
                                )}
                            </CopyButton>
                            <ResetNodeTrafficFeature handleClose={handleClose} node={node} />

                            <RestartNodeButtonFeature handleClose={handleClose} node={node} />
                            <ToggleNodeStatusButtonFeature handleClose={handleClose} node={node} />
                        </Menu.Dropdown>
                    </Menu>
                )}

                <Group gap="xs" wrap="nowrap">
                    {isDirty && (
                        <>
                            <Badge color="yellow" size="sm" variant="outline" visibleFrom="xs">
                                {t('base-node-form.unsaved')}
                            </Badge>
                            <Button
                                color="gray"
                                leftSection={<TbRotate size={16} />}
                                size="md"
                                variant="subtle"
                                onClick={handleDiscard}
                            >
                                {t('base-node-form.discard')}
                            </Button>
                        </>
                    )}
                    <Button
                        color="teal"
                        disabled={!isDirty || !form.isTouched()}
                        leftSection={<PiFloppyDiskDuotone size="16px" />}
                        loading={isDataSubmitting}
                        size="md"
                        variant="light"
                        onClick={handleSubmit}
                    >
                        {t('common.save')}
                    </Button>
                </Group>
            </ModalFooter>
        </>
    )
}
