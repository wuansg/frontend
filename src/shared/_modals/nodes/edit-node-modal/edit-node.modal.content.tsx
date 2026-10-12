import NiceModal from '@ebay/nice-modal-react'
import { Button, Stack } from '@mantine/core'
import { useForm, schemaResolver, type UseFormReturnType } from '@mantine/form'
import { UpdateNodeCommand } from '@remnawave/backend-contract'
import { NodeDetailsCardWidget } from '@widgets/dashboard/nodes/node-details-card'
import { NodeSystemCardWidget } from '@widgets/dashboard/nodes/node-system-card'
import { motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { queryClient } from '@shared/api'
import {
    configProfilesQueryKeys,
    nodesQueryKeys,
    useGetNode,
    useGetNodePlugins,
    useGetNodeSecretKey,
    useUpdateNode
} from '@shared/api/hooks'
import { BaseNodeForm } from '@shared/ui/forms/nodes/base-node-form/base-node-form'
import { LoaderModalShared } from '@shared/ui/loader-modal'
import { withNodeIpsErrors } from '@shared/ui/node-ips'

import { NodeDeploymentsModal } from '../node-deployments/node-deployments.modal'
import { nodeDirtyFields } from './node-dirty-fields'

interface IProps {
    nodeUuid: string
    onClose: () => void
}

export const EditNodeByUuidModalContent = (props: IProps) => {
    const { nodeUuid, onClose } = props
    const { i18n } = useTranslation()

    const isFormInitialized = useRef(false)

    const form: UseFormReturnType<UpdateNodeCommand.RequestBody> =
        useForm<UpdateNodeCommand.RequestBody>({
            name: 'edit-node-form',
            mode: 'uncontrolled',
            onValuesChange: (values) => {
                if (typeof values.proxyUrl === 'string' && values.proxyUrl === '') {
                    form.setFieldValue('proxyUrl', null)
                }
            },
            validate: (values) =>
                withNodeIpsErrors(
                    schemaResolver(UpdateNodeCommand.RequestBodySchema.omit({ uuid: true }))
                )(nodeDirtyFields(form.getInitialValues(), values))
        })

    const { data: secretKey } = useGetNodeSecretKey()
    const { data: nodePlugins } = useGetNodePlugins()

    const { data: fetchedNode } = useGetNode({
        route: {
            uuid: nodeUuid
        },
        rQueryParams: {
            enabled: !form.isTouched()
        }
    })

    const { mutate: updateNode, isPending: isUpdateNodePending } = useUpdateNode({
        mutationFns: {
            onSuccess: async (data) => {
                queryClient.setQueryData(
                    nodesQueryKeys.getNode({
                        uuid: nodeUuid
                    }).queryKey,
                    data
                )

                queryClient.refetchQueries({
                    queryKey: nodesQueryKeys.getAllNodes.queryKey
                })
                queryClient.refetchQueries({
                    queryKey: configProfilesQueryKeys.getConfigProfiles.queryKey
                })

                form.setInitialValues(form.getValues())
                form.resetDirty()
            }
        }
    })

    useEffect(() => {
        if (fetchedNode && !isFormInitialized.current) {
            isFormInitialized.current = true
            form.initialize({
                uuid: fetchedNode.uuid,
                countryCode: fetchedNode.countryCode,
                name: fetchedNode.name,
                address: fetchedNode.address,
                port: fetchedNode.port ?? undefined,
                isTrafficTrackingActive: fetchedNode.isTrafficTrackingActive ?? undefined,
                trafficLimitBytes: fetchedNode.trafficLimitBytes ?? undefined,
                trafficResetDay: fetchedNode.trafficResetDay ?? undefined,
                notifyPercent: fetchedNode.notifyPercent ?? undefined,
                consumptionMultiplier: fetchedNode.consumptionMultiplier ?? undefined,
                nodeConsumptionMultiplier: fetchedNode.nodeConsumptionMultiplier ?? undefined,
                tags: fetchedNode.tags ?? undefined,
                ips: fetchedNode.ips ?? [],
                proxyUrl: fetchedNode.proxyUrl ?? undefined,
                expectedAgentVersion: fetchedNode.expectedAgentVersion ?? undefined,
                expectedAgentImageTag: fetchedNode.expectedAgentImageTag ?? undefined,
                rolloutBatch: fetchedNode.rolloutBatch ?? undefined,
                nodeApiSniEnabled: fetchedNode.nodeApiSniEnabled,
                configProfile: {
                    activeConfigProfileUuid:
                        fetchedNode.configProfile.activeConfigProfileUuid ?? '',
                    activeInbounds:
                        fetchedNode.configProfile.activeInbounds.map((inbound) => inbound.uuid) ??
                        []
                },

                providerUuid: fetchedNode.providerUuid ?? undefined,
                activePluginUuid: fetchedNode.activePluginUuid ?? undefined,
                note: fetchedNode.note ?? undefined
            })
        }
    }, [fetchedNode])

    const handleSubmit = form.onSubmit(async (values) => {
        if (!fetchedNode) {
            return
        }
        if (!values.name || values.name.trim().length < 3) {
            form.setFieldError('name', 'Name must contain at least 3 non-whitespace characters')
            return
        }
        if (!values.address || values.address.trim().length < 2) {
            form.setFieldError('address', 'Address must not be blank')
            return
        }
        const changes = nodeDirtyFields(form.getInitialValues(), values)
        if (!Object.keys(changes).length) return

        updateNode({
            variables: {
                ...changes,
                uuid: fetchedNode.uuid
            }
        })
    })

    if (!fetchedNode) {
        return (
            <motion.div
                animate={{ opacity: 1 }}
                initial={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
            >
                <LoaderModalShared h="78vh" />
            </motion.div>
        )
    }

    return (
        <Stack>
            <Button
                variant="light"
                onClick={() => NiceModal.show(NodeDeploymentsModal, { nodeUuid })}
            >
                {i18n.language.startsWith('zh')
                    ? '配置发布与回滚'
                    : 'Configuration releases & rollback'}
            </Button>
            <BaseNodeForm
                form={form}
                handleClose={onClose}
                handleSubmit={handleSubmit}
                isDataSubmitting={isUpdateNodePending}
                node={fetchedNode}
                nodeDetailsCard={<NodeDetailsCardWidget node={fetchedNode} />}
                nodePlugins={nodePlugins?.nodePlugins ?? []}
                nodeSystemCard={<NodeSystemCardWidget node={fetchedNode} />}
                secretKey={secretKey}
            />
        </Stack>
    )
}
