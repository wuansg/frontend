import { NodePluginsHeaderActionButtonsFeature } from '@features/ui/dashboard/node-plugins/header-action-buttons'
import { GetNodesCommand, GetNodePluginsCommand } from '@remnawave/backend-contract'
import { NodePluginsGridWidget } from '@widgets/dashboard/node-plugins/node-plugins-grid/node-plugins-grid.widget'
import { NodePluginsSpotlightWidget } from '@widgets/dashboard/node-plugins/node-plugins-spotlight'
import { motion } from 'motion/react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { TbPackage } from 'react-icons/tb'
import { useSearchParams } from 'react-router'

import { showModal } from '@shared/_modals/show-modal'
import { Page, PageHeaderShared } from '@shared/ui'

interface Props {
    nodes: GetNodesCommand.Response['response']
    plugins: GetNodePluginsCommand.Response['response']['nodePlugins']
}

export const NodePluginsBasePageComponent = (props: Props) => {
    const { nodes, plugins } = props
    const { t } = useTranslation()
    const [searchParams, setSearchParams] = useSearchParams()

    useEffect(() => {
        const sharedList = searchParams.get('sharedList')
        if (!sharedList) return
        showModal('sharedLists_sharedListEditorModal', { name: sharedList })
        setSearchParams(
            (previous) => {
                const next = new URLSearchParams(previous)
                next.delete('sharedList')
                return next
            },
            { replace: true }
        )
    }, [searchParams, setSearchParams])

    return (
        <Page title={t('constants.node-plugins')}>
            <PageHeaderShared
                actions={<NodePluginsHeaderActionButtonsFeature />}
                icon={<TbPackage size={24} />}
                title={`${t('constants.node-plugins')} β`}
            />

            <motion.div
                animate={{ opacity: 1 }}
                initial={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
            >
                <NodePluginsGridWidget nodes={nodes} plugins={plugins} />
            </motion.div>

            <NodePluginsSpotlightWidget plugins={plugins} />
        </Page>
    )
}
