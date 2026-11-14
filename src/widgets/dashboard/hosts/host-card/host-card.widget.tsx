import { OptimisticSortingPlugin } from '@dnd-kit/dom/sortable'
import { useSortable } from '@dnd-kit/react/sortable'
import { GetHostUsersUsageFeature } from '@features/ui/dashboard/hosts/get-host-users-usage'
import {
    ActionIcon,
    Badge,
    Box,
    Checkbox,
    Group,
    px,
    Stack,
    Text,
    ThemeIcon,
    Tooltip,
    useComputedColorScheme
} from '@mantine/core'
import { useClipboard } from '@mantine/hooks'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import {
    GetConfigProfilesCommand,
    GetHostsCommand,
    GetNodesCommand
} from '@remnawave/backend-contract'
import cx from 'clsx'
import ColorHash from 'color-hash'
import { githubDarkTheme, githubLightTheme, JsonEditor } from 'json-edit-react'
import { CSSProperties, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PiProhibit, PiPulse } from 'react-icons/pi'
import { RiDraggable } from 'react-icons/ri'
import {
    TbAlertCircle,
    TbCirclesRelation,
    TbCloudNetwork,
    TbEyeOff,
    TbFileDescription,
    TbMask,
    TbStar
} from 'react-icons/tb'
import { useNavigate } from 'react-router'

import { showModal } from '@shared/_modals/show-modal'
import { ROUTES } from '@shared/constants'
import { SEARCH_PARAMS } from '@shared/constants/search-params'
import { useIsMobile } from '@shared/hooks'
import { Base64Logo } from '@shared/ui/logos'
import { BaseOverlayHeader } from '@shared/ui/overlays/base-overlay-header'
import { SingleRowOverflowList } from '@shared/ui/single-row-overflow-list'
import { resolveCountryCode } from '@shared/utils/misc/resolve-country-code'
import { openOrNavigate } from '@shared/utils/open-or-navigate'

import classes from './HostCard.module.css'

export interface IProps {
    configProfiles: GetConfigProfilesCommand.Response['response']['configProfiles'] | undefined
    disableReordering?: boolean
    index?: number
    isDragOverlay?: boolean
    isSelected?: boolean
    item: GetHostsCommand.Response['response'][number]
    nodesByUuid: Map<string, GetNodesCommand.Response['response'][number]>
    onSelect?: () => void
    viewOnly?: boolean
}

export function HostCardWidget(props: IProps) {
    const {
        nodesByUuid,
        item,
        configProfiles,
        index = 0,
        isSelected,
        onSelect,
        isDragOverlay = false,
        viewOnly = false,
        disableReordering = false
    } = props

    const { t } = useTranslation()
    const navigate = useNavigate()
    const clipboard = useClipboard({ timeout: 500 })
    const colorScheme = useComputedColorScheme('dark')

    const [isHovered, setIsHovered] = useState(false)
    const isMobile = useIsMobile()

    const configProfile = configProfiles?.find(
        (profile) => profile.uuid === item.inbound.configProfileUuid
    )

    const inboundTag = configProfile?.inbounds.find(
        (inbound) => inbound.uuid === item.inbound.configProfileInboundUuid
    )?.tag

    const isDangling = !configProfile?.uuid || !inboundTag

    const sortable = useSortable({
        id: item.uuid,
        index,
        disabled: isDragOverlay || disableReordering || viewOnly,
        plugins: (defaults) => defaults.filter((plugin) => plugin !== OptimisticSortingPlugin)
    })

    const isDragging = !isDragOverlay && sortable.isDragging
    const { ref, handleRef } = sortable

    const style: CSSProperties = {
        opacity: isDragging ? 0 : 1,
        zIndex: isDragging ? 1000 : 'auto',
        position: 'relative'
    }

    const sortedTags = useMemo(
        () => [...(item.tags ?? [])].sort((a, b) => a.localeCompare(b)),
        [item.tags]
    )

    const linkedNodes = useMemo(
        () =>
            item.nodes
                .map((nodeId) => nodesByUuid.get(nodeId))
                .filter((n): n is NonNullable<typeof n> => Boolean(n)),
        [item.nodes, nodesByUuid]
    )

    const handleEdit = () => {
        if (viewOnly) return
        showModal('hosts_editHostDrawer', {
            host: item
        })
    }

    const addressLabel = item.port ? `${item.address}:${item.port}` : item.address

    const handleCopyAddress = (event: React.MouseEvent) => {
        event.stopPropagation()
        clipboard.copy(addressLabel)
        notifications.show({
            message: addressLabel,
            title: t('node-card.widget.copied'),
            color: 'teal'
        })
    }

    if (!configProfiles) {
        return null
    }

    const isHostActive = !item.isDisabled
    const statusTone = isDangling
        ? 'red'
        : !isHostActive
          ? 'gray'
          : item.isHidden
            ? 'violet'
            : 'teal'

    const ch = new ColorHash({
        lightness: colorScheme === 'dark' ? [0.68, 0.68, 0.68] : [0.38, 0.38, 0.38]
    })

    const isParamSet = (value: unknown): boolean => {
        if (value == null) return false
        if (typeof value === 'string') return value.trim().length > 0
        if (Array.isArray(value)) return value.length > 0
        if (typeof value === 'object') return Object.keys(value as object).length > 0
        return true
    }

    const hasFinalMask = isParamSet(item.finalMask)
    const hasMuxParams = isParamSet(item.muxParams)
    const serverDescription = item.serverDescription?.trim() || ''
    const hasExcludedSquads = item.excludedInternalSquads.length > 0
    const jsonTheme = colorScheme === 'dark' ? githubDarkTheme : githubLightTheme

    const statusBadgeNode = !isHostActive ? (
        <Tooltip label={t('use-hosts-table-widget.disabled')}>
            <ThemeIcon color="gray" size="md" style={{ flexShrink: 0 }} variant="light">
                <PiProhibit size={15} />
            </ThemeIcon>
        </Tooltip>
    ) : item.isHidden ? (
        <Tooltip label={t('use-hosts-table-widget.hidden')}>
            <ThemeIcon color="violet" size="md" style={{ flexShrink: 0 }} variant="light">
                <TbEyeOff size={15} />
            </ThemeIcon>
        </Tooltip>
    ) : (
        <Tooltip label={t('use-hosts-table-widget.enabled')}>
            <ThemeIcon color="teal" size="md" style={{ flexShrink: 0 }} variant="light">
                <PiPulse size={15} />
            </ThemeIcon>
        </Tooltip>
    )

    if (isMobile) {
        return (
            <Box
                className={cx(classes.item, classes.mobileItem, {
                    [classes.itemDragging]: isDragging || isHovered,
                    [classes.selectedItem]: isSelected
                })}
                data-drag-overlay={isDragOverlay}
                data-status-tone={statusTone}
                ref={isDragOverlay ? undefined : ref}
                style={style}
            >
                <Stack gap={8}>
                    <Group justify="space-between" wrap="nowrap">
                        <Group gap="xs" miw={0} style={{ flex: 1 }} wrap="nowrap">
                            {!viewOnly && (
                                <Checkbox
                                    checked={isSelected}
                                    color="cyan"
                                    onChange={(e) => {
                                        e.stopPropagation()
                                        onSelect?.()
                                    }}
                                    size="sm"
                                    styles={{
                                        input: { cursor: 'pointer' }
                                    }}
                                />
                            )}
                            {!viewOnly && !disableReordering && (
                                <Box
                                    className={classes.mobileDragHandle}
                                    onClick={(e) => e.stopPropagation()}
                                    ref={isDragOverlay ? undefined : handleRef}
                                >
                                    <RiDraggable size={px('1.1rem')} />
                                </Box>
                            )}
                            {statusBadgeNode}
                            <Text className={classes.hostName} fw={600} size="sm">
                                {item.remark}
                            </Text>
                        </Group>

                        <Group gap={4} onClick={(e) => e.stopPropagation()} wrap="nowrap">
                            <GetHostUsersUsageFeature
                                hostRemark={item.remark}
                                hostUuid={item.uuid}
                            />
                        </Group>
                    </Group>

                    <Box
                        className={cx(classes.contentArea, {
                            [classes.contentAreaReadOnly]: viewOnly
                        })}
                        onClick={(e) => {
                            e.stopPropagation()
                            handleEdit()
                        }}
                        onTouchEnd={() => setIsHovered(false)}
                        onTouchStart={() => setIsHovered(true)}
                    >
                        <Stack gap={6}>
                            <Text
                                c="dimmed"
                                className={classes.mobileAddress}
                                onClick={handleCopyAddress}
                                size="xs"
                                title={t('node-card.widget.copy-address')}
                            >
                                {addressLabel}
                            </Text>

                            <Group gap={6} justify="space-between" wrap="wrap">
                                <Badge
                                    autoContrast
                                    color={configProfile?.uuid ? ch.hex(configProfile.uuid) : 'red'}
                                    leftSection={
                                        configProfile?.uuid ? (
                                            <Base64Logo size={12} />
                                        ) : (
                                            <TbAlertCircle size={12} />
                                        )
                                    }
                                    size="sm"
                                    style={{ paddingLeft: 0 }}
                                    variant="transparent"
                                >
                                    {configProfile?.name || t('host-card.widget.dangling')}
                                    {item.inbound.configProfileInboundUuid && (
                                        <>
                                            <span style={{ margin: '0 5px', opacity: 0.5 }}>›</span>
                                            <span style={{ opacity: 0.8 }}>
                                                {inboundTag ||
                                                    t('host-card.widget.unknown-inbound')}
                                            </span>
                                        </>
                                    )}
                                </Badge>

                                {linkedNodes.length > 0 && (
                                    <Group gap={3} wrap="nowrap">
                                        {linkedNodes.slice(0, 3).map((node) => (
                                            <span
                                                key={node.uuid}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center'
                                                }}
                                            >
                                                {resolveCountryCode(node.countryCode, 14)}
                                            </span>
                                        ))}
                                        {linkedNodes.length > 3 && (
                                            <Text c="dimmed" size="xs">
                                                +{linkedNodes.length - 3}
                                            </Text>
                                        )}
                                    </Group>
                                )}
                            </Group>

                            {sortedTags.length > 0 && (
                                <SingleRowOverflowList
                                    data={sortedTags}
                                    gap={4}
                                    maxVisibleItems={3}
                                    renderItem={(tag) => (
                                        <Badge color="gray" key={tag} size="xs" variant="light">
                                            {tag}
                                        </Badge>
                                    )}
                                    renderOverflow={(items) => (
                                        <Badge color="gray" size="xs" variant="light">
                                            +{items.length}
                                        </Badge>
                                    )}
                                />
                            )}
                        </Stack>
                    </Box>
                </Stack>
            </Box>
        )
    }

    return (
        <Box
            className={cx(classes.item, {
                [classes.itemDragging]: isDragging || isHovered,
                [classes.selectedItem]: isSelected
            })}
            data-drag-overlay={isDragOverlay}
            data-status-tone={statusTone}
            ref={isDragOverlay ? undefined : ref}
            style={style}
        >
            <Group gap="md" w="100%" wrap="nowrap">
                {!viewOnly && (
                    <Group gap="xs" wrap="nowrap">
                        <Checkbox
                            checked={isSelected}
                            color="cyan"
                            onChange={onSelect}
                            size="sm"
                            styles={{ input: { cursor: 'pointer' } }}
                        />
                        {!disableReordering && (
                            <Box
                                className={classes.dragHandle}
                                ref={isDragOverlay ? undefined : handleRef}
                            >
                                <RiDraggable size="20px" />
                            </Box>
                        )}
                    </Group>
                )}

                <Stack
                    className={cx(classes.contentArea, {
                        [classes.contentAreaReadOnly]: viewOnly
                    })}
                    flex={1}
                    gap={6}
                    miw={0}
                    onClick={handleEdit}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    <Group
                        gap="sm"
                        justify="space-between"
                        miw={0}
                        style={{ overflow: 'hidden' }}
                        wrap="nowrap"
                    >
                        <Group
                            gap="sm"
                            miw={0}
                            style={{ flexShrink: 1, overflow: 'hidden' }}
                            wrap="nowrap"
                        >
                            {statusBadgeNode}

                            <Text fw={600} size="sm" style={{ flexShrink: 0 }} truncate>
                                {item.remark}
                            </Text>
                            <Text
                                c="dimmed"
                                className={classes.hostAddress}
                                onClick={handleCopyAddress}
                                style={{ flexShrink: 1, minWidth: 0 }}
                                title={t('node-card.widget.copy-address')}
                                truncate
                            >
                                {addressLabel}
                            </Text>
                        </Group>

                        <Group
                            gap={6}
                            onClick={(e) => e.stopPropagation()}
                            style={{ flexShrink: 0 }}
                            wrap="nowrap"
                        >
                            <GetHostUsersUsageFeature
                                hostRemark={item.remark}
                                hostUuid={item.uuid}
                            />

                            {hasExcludedSquads && (
                                <Tooltip label={t('base-host-form.excluded-internal-squads')}>
                                    <ThemeIcon color="yellow" size={28} variant="light">
                                        <TbCirclesRelation size={16} />
                                    </ThemeIcon>
                                </Tooltip>
                            )}

                            {hasMuxParams && (
                                <Tooltip label={t('host-card.widget.mux-params')}>
                                    <ActionIcon
                                        color="teal"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            modals.open({
                                                children: (
                                                    <JsonEditor
                                                        collapse={3}
                                                        data={JSON.parse(
                                                            JSON.stringify(item.muxParams)
                                                        )}
                                                        indent={2}
                                                        maxWidth="100%"
                                                        rootName=""
                                                        theme={jsonTheme}
                                                        viewOnly
                                                    />
                                                ),
                                                title: (
                                                    <BaseOverlayHeader
                                                        iconColor="teal"
                                                        IconComponent={TbCloudNetwork}
                                                        iconVariant="soft"
                                                        title={t('host-card.widget.mux-params')}
                                                    />
                                                ),
                                                size: 'xl'
                                            })
                                        }}
                                        size={28}
                                        variant="light"
                                    >
                                        <TbCloudNetwork size={16} />
                                    </ActionIcon>
                                </Tooltip>
                            )}

                            {hasFinalMask && (
                                <Tooltip label={t('host-card.widget.final-mask')}>
                                    <ActionIcon
                                        color="cyan"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            modals.open({
                                                children: (
                                                    <JsonEditor
                                                        collapse={3}
                                                        data={JSON.parse(
                                                            JSON.stringify(item.finalMask)
                                                        )}
                                                        indent={2}
                                                        maxWidth="100%"
                                                        rootName=""
                                                        theme={jsonTheme}
                                                        viewOnly
                                                    />
                                                ),
                                                title: (
                                                    <BaseOverlayHeader
                                                        iconColor="cyan"
                                                        IconComponent={TbMask}
                                                        iconVariant="soft"
                                                        title={t('host-card.widget.final-mask')}
                                                    />
                                                ),
                                                size: 'xl'
                                            })
                                        }}
                                        size={28}
                                        variant="light"
                                    >
                                        <TbMask size={16} />
                                    </ActionIcon>
                                </Tooltip>
                            )}
                        </Group>
                    </Group>

                    <Group
                        gap="xs"
                        justify="space-between"
                        miw={0}
                        style={{ overflow: 'hidden' }}
                        wrap="nowrap"
                    >
                        <Group
                            gap={4}
                            miw={0}
                            style={{ flexShrink: 1, overflow: 'hidden' }}
                            wrap="nowrap"
                        >
                            <Badge
                                autoContrast
                                color={configProfile?.uuid ? ch.hex(configProfile.uuid) : 'red'}
                                leftSection={
                                    configProfile?.uuid ? (
                                        <Base64Logo size={12} />
                                    ) : (
                                        <TbAlertCircle size={12} />
                                    )
                                }
                                size="md"
                                style={{
                                    paddingLeft: 0
                                }}
                                variant="transparent"
                            >
                                {configProfile?.name || t('host-card.widget.dangling')}
                                {item.inbound.configProfileInboundUuid && (
                                    <>
                                        <span style={{ margin: '0 6px', opacity: 0.5 }}>›</span>
                                        <span style={{ opacity: 0.8 }}>
                                            {inboundTag || t('host-card.widget.unknown-inbound')}
                                        </span>
                                    </>
                                )}
                            </Badge>

                            <SingleRowOverflowList
                                data={sortedTags}
                                gap={4}
                                maxVisibleItems={3}
                                renderItem={(tag) => (
                                    <Badge
                                        autoContrast
                                        color={ch.hex(tag)}
                                        key={tag}
                                        leftSection={<TbStar size={11} />}
                                        size="sm"
                                        variant="transparent"
                                    >
                                        {tag}
                                    </Badge>
                                )}
                                renderOverflow={(items) => (
                                    <Tooltip
                                        label={
                                            <Stack gap={4}>
                                                {items.map((tag) => (
                                                    <Badge
                                                        color={ch.hex(tag)}
                                                        fullWidth
                                                        key={tag}
                                                        leftSection={<TbStar size={11} />}
                                                        size="sm"
                                                        variant="transparent"
                                                    >
                                                        {tag}
                                                    </Badge>
                                                ))}
                                            </Stack>
                                        }
                                        multiline
                                        position="top"
                                    >
                                        <Badge color="gray" size="sm" variant="transparent">
                                            +{items.length}
                                        </Badge>
                                    </Tooltip>
                                )}
                            />

                            {serverDescription && (
                                <Badge
                                    color="gray"
                                    leftSection={<TbFileDescription size={12} />}
                                    size="sm"
                                    style={{
                                        fontStyle: 'italic',
                                        fontWeight: 500
                                    }}
                                    variant="transparent"
                                >
                                    {serverDescription}
                                </Badge>
                            )}
                        </Group>

                        <Group gap="xs" style={{ flexShrink: 0 }} wrap="nowrap">
                            <SingleRowOverflowList
                                data={linkedNodes}
                                gap={4}
                                maxVisibleItems={3}
                                renderItem={(node) => (
                                    <Badge
                                        color="gray"
                                        key={`${node.uuid}|${item.uuid}`}
                                        leftSection={resolveCountryCode(node.countryCode, 16)}
                                        onClick={(event) => {
                                            event.stopPropagation()
                                            openOrNavigate(
                                                `${ROUTES.DASHBOARD.MANAGEMENT.NODES}?${SEARCH_PARAMS.NODE}=${node.uuid}`,
                                                navigate
                                            )
                                        }}
                                        size="sm"
                                        style={{ cursor: 'pointer' }}
                                        variant="light"
                                    >
                                        {node.name}
                                    </Badge>
                                )}
                                renderOverflow={(items) => (
                                    <Tooltip
                                        label={
                                            <Stack gap={4}>
                                                {items.map((node) => (
                                                    <Badge
                                                        color="gray"
                                                        fullWidth
                                                        key={`${node.uuid}|${item.uuid}`}
                                                        leftSection={resolveCountryCode(
                                                            node.countryCode,
                                                            16
                                                        )}
                                                        variant="light"
                                                    >
                                                        {node.name}
                                                    </Badge>
                                                ))}
                                            </Stack>
                                        }
                                        multiline
                                        position="top"
                                    >
                                        <Badge color="gray" size="sm" variant="light">
                                            +{items.length}
                                        </Badge>
                                    </Tooltip>
                                )}
                            />
                        </Group>
                    </Group>
                </Stack>
            </Group>
        </Box>
    )
}
