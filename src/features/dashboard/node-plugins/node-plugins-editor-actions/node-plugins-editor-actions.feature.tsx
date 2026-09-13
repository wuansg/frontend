import type { editor } from 'monaco-editor'

import {
    ActionIcon,
    Alert,
    Badge,
    Button,
    Code,
    Divider,
    Group,
    Menu,
    Paper,
    ScrollArea,
    SimpleGrid,
    Stack,
    Text
} from '@mantine/core'
import { useClipboard, useDisclosure } from '@mantine/hooks'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { Monaco } from '@monaco-editor/react'
import { UpdateNodePluginCommand } from '@remnawave/backend-contract'
import consola from 'consola/browser'
import { RefObject, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PiCheckSquareOffset, PiFloppyDisk } from 'react-icons/pi'
import {
    TbClipboardCopy,
    TbClipboardText,
    TbCut,
    TbDownload,
    TbFlask,
    TbMenuDeep,
    TbSelectAll
} from 'react-icons/tb'

import { instance, queryClient } from '@shared/api'
import { QueryKeys, useUpdateNodePlugin } from '@shared/api/hooks'
import { useIsMobile } from '@shared/hooks'
import { useDownloadTemplate } from '@shared/ui/load-templates/use-download-template'

interface Props {
    editorRef: RefObject<editor.IStandaloneCodeEditor | null>
    hasUnsavedChanges: boolean
    isNodePluginValid: boolean
    monacoRef: RefObject<Monaco | null>
    originalValue: string
    pluginUuid: string
    setHasUnsavedChanges: (value: boolean) => void
    setIsNodePluginValid: (value: boolean) => void
    setOriginalValue: (value: string) => void
    setResult: (value: string) => void
}

export function NodePluginsEditorActionsFeature(props: Props) {
    const {
        editorRef,
        monacoRef,
        isNodePluginValid,
        setResult,
        setIsNodePluginValid,
        hasUnsavedChanges,
        setHasUnsavedChanges,
        setOriginalValue,
        pluginUuid
    } = props
    const { t } = useTranslation()

    const isMobile = useIsMobile()
    const clipboard = useClipboard({ timeout: 500 })
    const [opened, handlers] = useDisclosure(false)
    const [isPreviewing, setIsPreviewing] = useState(false)

    const { mutate: updateNodePluginRes, isPending: isUpdating } = useUpdateNodePlugin({
        mutationFns: {
            onSuccess: async (updatedNodePlugin: UpdateNodePluginCommand.Response['response']) => {
                await queryClient.refetchQueries({
                    queryKey: QueryKeys.nodePlugins.getNodePlugin({ uuid: pluginUuid }).queryKey
                })

                setIsNodePluginValid(true)

                const newValue = JSON.stringify(updatedNodePlugin.pluginConfig, null, 2)

                if (editorRef.current) {
                    editorRef.current.setValue(newValue)
                    setOriginalValue(newValue)
                }

                await queryClient.setQueryData(
                    QueryKeys.nodePlugins.getNodePlugin({ uuid: pluginUuid }).queryKey,
                    updatedNodePlugin
                )

                setHasUnsavedChanges(false)
            },
            onError: (error) => {
                setIsNodePluginValid(false)
                setResult(error.message)
            }
        }
    })

    const { openDownloadModal } = useDownloadTemplate({
        editorType: 'NODE_PLUGIN',
        templateType: 'NODE_PLUGIN',
        editorRef
    })

    const handleSave = () => {
        if (!editorRef.current) return
        if (!monacoRef.current) return

        const currentValue = editorRef.current.getValue()

        try {
            JSON.parse(currentValue)
        } catch (error) {
            consola.error(error)
            notifications.show({
                color: 'red',
                message: t('config-editor-actions.feature.failed-to-save-invalid-json'),
                title: t('config-editor-actions.feature.error')
            })
            return
        }

        if (currentValue) {
            updateNodePluginRes({
                variables: {
                    uuid: pluginUuid,
                    pluginConfig: JSON.parse(currentValue)
                }
            })
        }
    }

    const handlePreview = async () => {
        if (!editorRef.current) return

        let pluginConfig: Record<string, unknown>
        try {
            pluginConfig = JSON.parse(editorRef.current.getValue()) as Record<string, unknown>
        } catch {
            notifications.show({
                color: 'red',
                message: t('config-editor-actions.feature.failed-to-save-invalid-json'),
                title: t('config-editor-actions.feature.error')
            })
            return
        }

        setIsPreviewing(true)
        try {
            const response = await instance.post<{ response: NodePluginPreview }>(
                '/api/node-plugins/actions/preview',
                { uuid: pluginUuid, pluginConfig }
            )
            modals.open({
                size: 'min(920px, 95vw)',
                title: 'Node Plugin dry-run',
                children: <NodePluginPreviewContent preview={response.data.response} />
            })
        } catch (error) {
            notifications.show({
                color: 'red',
                message: error instanceof Error ? error.message : 'Plugin validation failed',
                title: 'Dry-run failed'
            })
        } finally {
            setIsPreviewing(false)
        }
    }

    const handleCopyConfig = () => {
        if (!editorRef.current) return

        const currentValue = editorRef.current.getValue()
        clipboard.copy(currentValue)
    }

    const handleSelectAll = () => {
        if (!editorRef.current) return

        const model = editorRef.current.getModel()
        if (!model) return

        editorRef.current.setSelection({
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: model.getLineCount(),
            endColumn: model.getLineMaxColumn(model.getLineCount())
        })
    }

    const handleCut = () => {
        if (!editorRef.current) return

        const selection = editorRef.current.getSelection()
        const model = editorRef.current.getModel()
        if (!selection || !model) return

        const selectedText = model.getValueInRange(selection)
        clipboard.copy(selectedText)

        editorRef.current.executeEdits('', [{ range: selection, text: '' }])
    }

    const handlePaste = () => {
        if (!editorRef.current) return

        const position = editorRef.current.getPosition()
        if (!position) return

        navigator.clipboard.readText().then((text) => {
            if (!editorRef.current) return
            editorRef.current.executeEdits('', [
                {
                    range: {
                        startLineNumber: position.lineNumber,
                        startColumn: position.column,
                        endLineNumber: position.lineNumber,
                        endColumn: position.column
                    },
                    text
                }
            ])
        })
    }

    const formatDocument = () => {
        if (!editorRef.current) return

        editorRef.current.getAction('editor.action.formatDocument')?.run()
    }

    return (
        <Group grow={isMobile} preventGrowOverflow={false} wrap="wrap">
            <Button
                color={!hasUnsavedChanges ? 'gray' : 'teal'}
                disabled={!isNodePluginValid && !hasUnsavedChanges}
                leftSection={<PiFloppyDisk size={16} />}
                loading={isUpdating}
                onClick={handleSave}
            >
                {t('common.save')}
            </Button>

            <Button
                leftSection={<TbFlask size={16} />}
                loading={isPreviewing}
                onClick={handlePreview}
                variant="light"
            >
                Dry-run
            </Button>

            <Group gap={0} wrap="nowrap">
                <Menu
                    onClose={() => handlers.close()}
                    onOpen={() => handlers.open()}
                    shadow="md"
                    trigger="click-hover"
                    withinPortal
                >
                    <Menu.Target>
                        <ActionIcon
                            size={36}
                            style={{
                                borderTopRightRadius: 0,
                                borderBottomRightRadius: 0
                            }}
                            variant={opened ? 'outline' : 'default'}
                        >
                            <TbMenuDeep size={20} />
                        </ActionIcon>
                    </Menu.Target>

                    <Menu.Dropdown>
                        <Menu.Item
                            color={clipboard.copied ? 'teal' : undefined}
                            leftSection={<TbClipboardCopy size={14} />}
                            onClick={handleCopyConfig}
                        >
                            {t('config-editor-actions.feature.copy-all-content')}
                        </Menu.Item>

                        <Menu.Item
                            leftSection={<TbSelectAll size={14} />}
                            onClick={handleSelectAll}
                        >
                            {t('config-editor-actions.feature.select-all')}
                        </Menu.Item>

                        <Menu.Item leftSection={<TbCut size={14} />} onClick={handleCut}>
                            {t('config-editor-actions.feature.cut-selection')}
                        </Menu.Item>

                        <Menu.Item
                            leftSection={<TbClipboardText size={14} />}
                            onClick={handlePaste}
                        >
                            {t('config-editor-actions.feature.paste-from-clipboard')}
                        </Menu.Item>

                        <Menu.Divider />

                        <Menu.Item
                            leftSection={<TbDownload size={14} />}
                            onClick={openDownloadModal}
                        >
                            {t('config-editor-actions.feature.load-from-github')}
                        </Menu.Item>
                    </Menu.Dropdown>
                </Menu>

                <Button
                    leftSection={<PiCheckSquareOffset size={16} />}
                    onClick={formatDocument}
                    style={{
                        borderTopLeftRadius: 0,
                        borderBottomLeftRadius: 0,

                        borderLeft: 0,
                        width: '100%'
                    }}
                    variant="default"
                >
                    {t('config-editor-actions.feature.format')}
                </Button>
            </Group>
        </Group>
    )
}

interface NodePluginPreview {
    valid: boolean
    desiredHash: string
    currentSavedHash: null | string
    diff: Array<{ path: string; before?: unknown; after?: unknown }>
    referencedLists: Array<{ name: string; type?: string; itemsCount: number }>
    affectedNodes: Array<{ uuid: string; name: string; connected: boolean }>
    domainsToResolve: string[]
    deployments: Array<{
        nodeUuid: string
        desiredHash: string
        appliedHash: string
        state: string
        lastError: null | string
        rolledBack: boolean
        checkedAt: string
        resolutionState: Record<string, { stale?: boolean; failureCount?: number }>
        node: { uuid: string; name: string; isConnected: boolean; countryCode: string }
    }>
    compile: null | Record<string, unknown>
}

function NodePluginPreviewContent({ preview }: { preview: NodePluginPreview }) {
    const hashMatches =
        preview.currentSavedHash !== null && preview.currentSavedHash === preview.desiredHash

    return (
        <Stack gap="md">
            <Alert color={preview.valid ? 'teal' : 'red'} title="Validation">
                {preview.valid
                    ? 'Schema and Shared List reference types are valid.'
                    : 'The plugin is not valid.'}
            </Alert>

            <SimpleGrid cols={{ base: 1, sm: 3 }}>
                <PreviewStat label="Changes" value={preview.diff.length} />
                <PreviewStat label="Affected nodes" value={preview.affectedNodes.length} />
                <PreviewStat label="Domains" value={preview.domainsToResolve.length} />
            </SimpleGrid>

            <Group gap="xs">
                <Badge color={hashMatches ? 'teal' : 'yellow'} variant="light">
                    {hashMatches ? 'Saved hash matches' : 'Unsaved changes'}
                </Badge>
                <Code>{preview.desiredHash}</Code>
            </Group>

            <Divider label="Dependency graph" labelPosition="left" />
            <Group gap="xs">
                {preview.referencedLists.length === 0 && (
                    <Text c="dimmed" size="sm">
                        No Shared Lists referenced
                    </Text>
                )}
                {preview.referencedLists.map((list) => (
                    <Badge key={list.name} variant="outline">
                        {list.name} · {list.type ?? 'unknown'} · {list.itemsCount}
                    </Badge>
                ))}
            </Group>

            <Divider label="Affected nodes and DNS" labelPosition="left" />
            <Group gap="xs">
                {preview.affectedNodes.map((node) => (
                    <Badge color={node.connected ? 'teal' : 'gray'} key={node.uuid} variant="light">
                        {node.name}
                    </Badge>
                ))}
                {preview.domainsToResolve.map((domain) => (
                    <Badge color="cyan" key={domain} variant="dot">
                        {domain}
                    </Badge>
                ))}
            </Group>

            <Divider label="Deployment state" labelPosition="left" />
            {preview.deployments.length === 0 && (
                <Text c="dimmed" size="sm">
                    No node has reported an applied state for this plugin yet.
                </Text>
            )}
            {preview.deployments.map((deployment) => {
                const isApplied =
                    deployment.state === 'APPLIED' &&
                    deployment.desiredHash === deployment.appliedHash
                const staleDomains = Object.values(deployment.resolutionState ?? {}).filter(
                    (resolution) => resolution.stale
                ).length
                return (
                    <Paper key={deployment.nodeUuid} p="sm" withBorder>
                        <Group justify="space-between" wrap="wrap">
                            <Group gap="xs">
                                <Text fw={600} size="sm">
                                    {deployment.node.name}
                                </Text>
                                <Badge color={isApplied ? 'teal' : 'yellow'} variant="light">
                                    {isApplied ? 'Applied' : deployment.state}
                                </Badge>
                                {deployment.rolledBack && <Badge color="red">Rolled back</Badge>}
                                {staleDomains > 0 && (
                                    <Badge color="orange">{staleDomains} stale DNS</Badge>
                                )}
                            </Group>
                            <Text c="dimmed" size="xs">
                                checked {new Date(deployment.checkedAt).toLocaleString()}
                            </Text>
                        </Group>
                        {deployment.lastError && (
                            <Text c="red" mt={4} size="xs">
                                {deployment.lastError}
                            </Text>
                        )}
                    </Paper>
                )
            })}

            <Divider label="Structured diff / Agent compile" labelPosition="left" />
            <ScrollArea.Autosize mah={360} type="auto">
                <Code block>
                    {JSON.stringify({ diff: preview.diff, compile: preview.compile }, null, 2)}
                </Code>
            </ScrollArea.Autosize>
        </Stack>
    )
}

function PreviewStat({ label, value }: { label: string; value: number }) {
    return (
        <Paper p="sm" withBorder>
            <Text c="dimmed" size="xs">
                {label}
            </Text>
            <Text fw={700} size="xl">
                {value}
            </Text>
        </Paper>
    )
}
