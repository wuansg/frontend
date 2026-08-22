import type { editor } from 'monaco-editor'

import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { MonacoSetupHostMapperEditorFeature } from '@features/dashboard/config-profiles/monaco-setup'
import { CodeHighlight } from '@mantine/code-highlight'
import {
    Accordion,
    Alert,
    Box,
    Button,
    Card,
    Grid,
    Group,
    Modal,
    Paper,
    Select,
    Stack,
    Tabs,
    Text
} from '@mantine/core'
import { UseFormReturnType } from '@mantine/form'
import Editor, { Monaco, useMonaco } from '@monaco-editor/react'
import {
    CreateHostCommand,
    HostMapperSchema,
    PreviewHostSubscriptionCommand,
    UpdateHostCommand,
    UpdateManyHostsCommand
} from '@remnawave/backend-contract'
import clsx from 'clsx'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TbAlertTriangle, TbArrowsExchange, TbPlayerPlay } from 'react-icons/tb'

import { useNiceMantineModal } from '@shared/_modals/use-nice-modal'
import { usePreviewHostSubscription } from '@shared/api/hooks'
import { monacoTheme } from '@shared/constants/monaco-theme'
import { usePseudoFullscreen } from '@shared/hooks'
import { fullscreenClasses, FullscreenToggleButton } from '@shared/ui/fullscreen-toggle-button'
import { BaseOverlayHeader } from '@shared/ui/overlays/base-overlay-header'

import classes from './HostMapperModal.module.css'

const EMPTY_MAPPER = JSON.stringify({ singbox: [], mihomo: [], base64: [], xrayJson: [] }, null, 2)

type HostForm =
    | CreateHostCommand.RequestBody
    | UpdateHostCommand.RequestBody
    | UpdateManyHostsCommand.RequestBody
type PreviewType = PreviewHostSubscriptionCommand.RequestBody['templateType']
type PreviewResult = PreviewHostSubscriptionCommand.Response['response']

interface IProps {
    form: UseFormReturnType<HostForm>
    hostUuid?: string
    rawInbound?: unknown
}

const PREVIEW_TYPES: Array<{ label: string; value: PreviewType }> = [
    { label: 'Sing-box', value: 'SINGBOX' },
    { label: 'Mihomo', value: 'MIHOMO' },
    { label: 'Base64', value: 'XRAY_BASE64' },
    { label: 'Xray JSON', value: 'XRAY_JSON' }
]

export const HostMapperModal = NiceModal.create((props: IProps) => {
    const { form, hostUuid, rawInbound } = props
    const modal = useModal()
    const { modalProps, hide } = useNiceMantineModal({ modal })
    const { t } = useTranslation()
    const { isFullscreen, toggle: toggleFullscreen } = usePseudoFullscreen()
    const monaco = useMonaco()

    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
    const monacoRef = useRef<Monaco | null>(null)
    const [activeTab, setActiveTab] = useState<string | null>('mapper')
    const [error, setError] = useState<null | string>(null)
    const [previewType, setPreviewType] = useState<PreviewType>('SINGBOX')
    const [preview, setPreview] = useState<PreviewResult | null>(null)

    const currentMapper = form.getValues().mapper
    const initialValue =
        currentMapper && Object.keys(currentMapper).length > 0
            ? JSON.stringify(currentMapper, null, 2)
            : EMPTY_MAPPER

    const { mutate: generatePreview, isPending: isPreviewPending } = usePreviewHostSubscription({
        mutationFns: {
            onSuccess: (data) => {
                setPreview(data)
                setActiveTab('preview')
            },
            onError: (previewError) => {
                setError(previewError.message)
            }
        }
    })

    useEffect(() => {
        if (!monaco) return
        void MonacoSetupHostMapperEditorFeature.setup(rawInbound)
    }, [monaco, rawInbound])

    const focusFirstMarker = () => {
        const model = editorRef.current?.getModel()
        const marker = model
            ? monacoRef.current?.editor
                  .getModelMarkers({ resource: model.uri })
                  .find((item) => item.severity === monacoRef.current?.MarkerSeverity.Error)
            : undefined

        if (!marker || !editorRef.current) return false

        const position = {
            lineNumber: marker.startLineNumber,
            column: marker.startColumn
        }
        editorRef.current.setPosition(position)
        editorRef.current.revealPositionInCenter(position)
        editorRef.current.focus()
        setError(`${marker.message} (${marker.startLineNumber}:${marker.startColumn})`)
        return true
    }

    const parseMapper = () => {
        if (!editorRef.current || focusFirstMarker()) return null

        const currentValue = editorRef.current.getValue().trim()
        if (currentValue === '') return {}

        try {
            const result = HostMapperSchema.safeParse(JSON.parse(currentValue))
            if (result.success) return result.data

            const issue = result.error.issues[0]
            setError(`${issue.path.join('.') || 'mapper'}: ${issue.message}`)
        } catch {
            setError(t('base-host-form.invalid-json'))
        }

        return null
    }

    const handleSave = () => {
        const mapper = parseMapper()
        if (mapper === null) return

        form.setFieldValue('mapper', Object.keys(mapper).length === 0 ? undefined : mapper)
        hide()
    }

    const handlePreview = () => {
        if (!hostUuid) {
            setError(t('base-host-form.mapper-preview-save-first'))
            return
        }

        const mapper = parseMapper()
        if (mapper === null) return

        setError(null)
        generatePreview({
            variables: {
                hostUuid,
                mapper,
                templateType: previewType
            }
        })
    }

    const formatValue = (value: PreviewResult['before']) =>
        typeof value === 'string' ? value : JSON.stringify(value, null, 2)
    const previewLanguage = previewType === 'MIHOMO' ? 'yaml' : 'json'

    return (
        <Modal
            {...modalProps}
            classNames={{ header: classes.header }}
            size="95%"
            transitionProps={{ transition: 'fade', duration: 200 }}
            title={
                <BaseOverlayHeader
                    iconColor="teal"
                    IconComponent={TbArrowsExchange}
                    iconVariant="soft"
                    title={t('base-host-form.mapper')}
                />
            }
        >
            <Box className={clsx(classes.container, isFullscreen && fullscreenClasses.overlay)}>
                <Group justify="space-between" wrap="wrap">
                    <Tabs onChange={setActiveTab} value={activeTab}>
                        <Tabs.List>
                            <Tabs.Tab value="mapper">{t('base-host-form.mapper-editor')}</Tabs.Tab>
                            <Tabs.Tab disabled={!preview} value="preview">
                                {t('base-host-form.mapper-preview')}
                            </Tabs.Tab>
                        </Tabs.List>
                    </Tabs>

                    <Group gap="sm">
                        <Select
                            allowDeselect={false}
                            data={PREVIEW_TYPES}
                            onChange={(value) => setPreviewType(value as PreviewType)}
                            value={previewType}
                            w={150}
                        />
                        <Button
                            disabled={!hostUuid}
                            leftSection={<TbPlayerPlay />}
                            loading={isPreviewPending}
                            onClick={handlePreview}
                            variant="light"
                        >
                            {t('base-host-form.mapper-generate-preview')}
                        </Button>
                        <FullscreenToggleButton
                            isFullscreen={isFullscreen}
                            onToggle={toggleFullscreen}
                            size={36}
                        />
                    </Group>
                </Group>

                {error && (
                    <Alert
                        color="red"
                        icon={<TbAlertTriangle />}
                        title={t('config-editor-actions.feature.error')}
                    >
                        {error}
                    </Alert>
                )}

                {activeTab === 'mapper' && (
                    <Paper
                        className={clsx(
                            classes.editorWrapper,
                            isFullscreen && fullscreenClasses.fill
                        )}
                        p={0}
                        style={{ borderColor: error ? 'var(--mantine-color-red-5)' : undefined }}
                        withBorder
                    >
                        <Editor
                            beforeMount={(editorMonaco) => {
                                editorMonaco.editor.defineTheme('GithubDark', {
                                    ...monacoTheme,
                                    base: 'vs-dark'
                                })
                            }}
                            className={classes.monacoEditor}
                            defaultLanguage="json"
                            onChange={() => setError(null)}
                            onMount={(mountedEditor, mountedMonaco) => {
                                editorRef.current = mountedEditor
                                monacoRef.current = mountedMonaco
                            }}
                            options={{
                                automaticLayout: true,
                                fixedOverflowWidgets: true,
                                formatOnPaste: true,
                                formatOnType: true,
                                minimap: { enabled: true },
                                renderValidationDecorations: 'on',
                                scrollBeyondLastLine: false,
                                tabSize: 2,
                                quickSuggestions: {
                                    strings: true,
                                    comments: true,
                                    other: true
                                }
                            }}
                            path="host-mapper://*"
                            theme="GithubDark"
                            value={initialValue}
                        />
                    </Paper>
                )}

                {activeTab === 'preview' && preview && (
                    <Stack className={classes.previewPane} gap="md">
                        {preview.warnings.map((warning) => (
                            <Alert color="yellow" key={warning}>
                                {warning}
                            </Alert>
                        ))}

                        <Grid>
                            <Grid.Col span={{ base: 12, md: 6 }}>
                                <Card h="100%" withBorder>
                                    <Text fw={600} mb="sm">
                                        {t('base-host-form.mapper-before')}
                                    </Text>
                                    <CodeHighlight
                                        className={classes.previewCode}
                                        code={formatValue(preview.before)}
                                        language={previewLanguage}
                                    />
                                </Card>
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, md: 6 }}>
                                <Card h="100%" withBorder>
                                    <Text fw={600} mb="sm">
                                        {t('base-host-form.mapper-after')}
                                    </Text>
                                    <CodeHighlight
                                        className={classes.previewCode}
                                        code={formatValue(preview.after)}
                                        language={previewLanguage}
                                    />
                                </Card>
                            </Grid.Col>
                        </Grid>

                        <Card withBorder>
                            <Text fw={600} mb="sm">
                                {t('base-host-form.mapper-final-fragment')}
                            </Text>
                            <CodeHighlight
                                className={classes.previewCode}
                                code={preview.fragment}
                                language={previewLanguage}
                            />
                        </Card>

                        <Accordion variant="contained">
                            <Accordion.Item value="subscription">
                                <Accordion.Control>
                                    {t('base-host-form.mapper-full-subscription')}
                                </Accordion.Control>
                                <Accordion.Panel>
                                    <CodeHighlight
                                        className={classes.previewCode}
                                        code={preview.subscription}
                                        language={previewLanguage}
                                    />
                                </Accordion.Panel>
                            </Accordion.Item>
                        </Accordion>
                    </Stack>
                )}

                <Group justify="flex-end">
                    <Button onClick={hide} variant="subtle">
                        {t('common.cancel')}
                    </Button>
                    <Button onClick={handleSave} variant="soft">
                        {t('common.save')}
                    </Button>
                </Group>
            </Box>
        </Modal>
    )
})
