import { GetHostUsersUsageFeature } from '@features/ui/dashboard/hosts/get-host-users-usage'
import { Badge, Box, Checkbox, Flex, Group, Stack, Text, Tooltip } from '@mantine/core'
import { useClipboard } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import {
    GetConfigProfilesCommand,
    GetHostsCommand,
    GetNodesCommand
} from '@remnawave/backend-contract'
import { TFunction } from 'i18next'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { PiGlobeSimple, PiLockKeyDuotone, PiLockKeyOpenDuotone } from 'react-icons/pi'
import {
    TbAlertCircle,
    TbCirclesRelation,
    TbCloudNetwork,
    TbEyeOff,
    TbMask,
    TbRoute
} from 'react-icons/tb'

import { showModal } from '@shared/_modals/show-modal'
import { SingboxLogo } from '@shared/ui/logos'
import { resolveCountryCode } from '@shared/utils/misc/resolve-country-code'

import classes from './HostsMatrix.module.css'

export type MatrixHostItem = GetHostsCommand.Response['response'][number]
type ConfigProfileItem = GetConfigProfilesCommand.Response['response']['configProfiles'][number]
type NodeItem = GetNodesCommand.Response['response'][number]
type HostStatusTone = 'gray' | 'red' | 'teal' | 'violet'

interface HostMatrixTileProps {
    configProfile: ConfigProfileItem | undefined
    isSelected: boolean
    item: MatrixHostItem
    nodesByUuid: Map<string, NodeItem>
    onToggleSelect: (hostUuid: string, shiftKey: boolean) => void
}

const isParamSet = (value: unknown): boolean => {
    if (value == null) return false
    if (typeof value === 'string') return value.trim().length > 0
    if (Array.isArray(value)) return value.length > 0
    if (typeof value === 'object') return Object.keys(value as object).length > 0
    return true
}

const getStatusInfo = (
    item: MatrixHostItem,
    isDangling: boolean,
    t: TFunction
): { color: string; dotColor: string; label: string; tone: HostStatusTone } => {
    if (isDangling) {
        return {
            tone: 'red',
            color: 'red',
            dotColor: 'var(--mantine-color-red-5)',
            label: t('host-card.widget.dangling')
        }
    }
    if (item.isDisabled) {
        return {
            tone: 'gray',
            color: 'gray',
            dotColor: 'var(--mantine-color-gray-5)',
            label: t('use-hosts-table-widget.disabled')
        }
    }
    if (item.isHidden) {
        return {
            tone: 'violet',
            color: 'violet',
            dotColor: 'var(--mantine-color-violet-5)',
            label: t('use-hosts-table-widget.hidden')
        }
    }
    return {
        tone: 'teal',
        color: 'teal',
        dotColor: 'var(--mantine-color-teal-5)',
        label: t('use-hosts-table-widget.enabled')
    }
}

export const HostMatrixTile = memo((props: HostMatrixTileProps) => {
    const { configProfile, isSelected, item, nodesByUuid, onToggleSelect } = props
    const { t } = useTranslation()
    const clipboard = useClipboard({ timeout: 500 })

    const inbound = useMemo(
        () =>
            configProfile?.inbounds.find(
                (entry) => entry.uuid === item.inbound.configProfileInboundUuid
            ),
        [configProfile, item.inbound.configProfileInboundUuid]
    )

    const isDangling = !configProfile || !inbound
    const statusInfo = useMemo(() => getStatusInfo(item, isDangling, t), [isDangling, item, t])

    const addressLabel = item.port ? `${item.address}:${item.port}` : item.address

    const sniDisplay = useMemo(() => {
        if (item.keepSniBlank) return t('hosts-matrix.widget.sni-blank')
        if (item.overrideSniFromAddress) return item.address
        return item.sni || item.host || '—'
    }, [item.address, item.host, item.keepSniBlank, item.overrideSniFromAddress, item.sni, t])

    const linkedNodes = useMemo(
        () =>
            item.nodes
                .map((nodeUuid) => nodesByUuid.get(nodeUuid))
                .filter((node): node is NodeItem => Boolean(node)),
        [item.nodes, nodesByUuid]
    )

    const sortedTags = useMemo(
        () => [...(item.tags ?? [])].sort((a, b) => a.localeCompare(b)),
        [item.tags]
    )

    const hasMux = isParamSet(item.muxParams)
    const hasFinalMask = isParamSet(item.finalMask)
    const hasMapper =
        Boolean(item.mapper?.mihomo?.length) ||
        Boolean(item.mapper?.base64?.length) ||
        Boolean(item.mapper?.singbox?.length)
    const hasExcludedSquads = item.excludedInternalSquads.length > 0

    const handleCopy = (event: React.MouseEvent) => {
        event.stopPropagation()
        clipboard.copy(addressLabel)
        notifications.show({
            message: addressLabel,
            title: t('node-card.widget.copied'),
            color: 'teal'
        })
    }

    const handleOpenEdit = () => {
        showModal('hosts_editHostDrawer', { host: item })
    }

    return (
        <Box
            className={classes.tile}
            data-selected={isSelected}
            data-status-tone={statusInfo.tone}
            onClick={handleOpenEdit}
        >
            {/* Header Row: Checkbox + Remark | Status Pill + Usage Drawer */}
            <Flex align="center" gap={8} justify="space-between" miw={0}>
                <Flex align="center" gap={7} miw={0} style={{ flex: 1 }}>
                    <Box
                        onClick={(event) => {
                            event.stopPropagation()
                            onToggleSelect(item.uuid, event.shiftKey)
                        }}
                        style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}
                    >
                        <Checkbox
                            aria-label={t('hosts-matrix.widget.select-host', {
                                name: item.remark
                            })}
                            checked={isSelected}
                            color="cyan"
                            onChange={() => {}}
                            radius="xs"
                            size="xs"
                            styles={{ input: { cursor: 'pointer' } }}
                        />
                    </Box>

                    <Text className={classes.remarkText} fw={600} size="sm" title={item.remark}>
                        {item.remark}
                    </Text>
                </Flex>

                <Flex
                    align="center"
                    gap={4}
                    onClick={(event) => event.stopPropagation()}
                    style={{ flexShrink: 0 }}
                >
                    <Badge
                        color={statusInfo.color}
                        leftSection={
                            isDangling ? (
                                <TbAlertCircle size={11} />
                            ) : item.isHidden && !item.isDisabled ? (
                                <TbEyeOff size={11} />
                            ) : (
                                <span
                                    className={classes.statusDot}
                                    style={{ backgroundColor: statusInfo.dotColor }}
                                />
                            )
                        }
                        size="xs"
                        variant="light"
                    >
                        {statusInfo.label}
                    </Badge>

                    <GetHostUsersUsageFeature hostRemark={item.remark} hostUuid={item.uuid} />
                </Flex>
            </Flex>

            {/* Sub-header Row: Address:Port | Security Layer + ALPN + Fingerprint */}
            <Flex align="center" gap={6} justify="space-between" miw={0}>
                <Flex align="center" gap={5} miw={0} style={{ flex: 1 }}>
                    <PiGlobeSimple className={classes.icon} size={12} />
                    <Text
                        c="dimmed"
                        className={classes.addressText}
                        onClick={handleCopy}
                        size="xs"
                        title={t('node-card.widget.copy-address')}
                    >
                        {addressLabel}
                    </Text>
                </Flex>

                <Flex align="center" gap={4} style={{ flexShrink: 0 }}>
                    <Badge
                        color={
                            item.securityLayer === 'TLS'
                                ? 'teal'
                                : item.securityLayer === 'NONE'
                                  ? 'orange'
                                  : 'gray'
                        }
                        leftSection={
                            item.securityLayer === 'NONE' ? (
                                <PiLockKeyOpenDuotone size={10} />
                            ) : (
                                <PiLockKeyDuotone size={10} />
                            )
                        }
                        size="xs"
                        variant="light"
                    >
                        {item.securityLayer === 'DEFAULT'
                            ? t('hosts-matrix.widget.security-default')
                            : item.securityLayer}
                    </Badge>

                    {item.alpn && (
                        <Badge color="cyan" size="xs" variant="light">
                            {item.alpn}
                        </Badge>
                    )}
                </Flex>
            </Flex>

            {/* 2-Cell Route & TLS Strip */}
            <div className={classes.routeStrip}>
                <div className={classes.routeCell}>
                    <Flex align="center" gap={4} miw={0}>
                        {isDangling ? (
                            <TbAlertCircle
                                color="var(--mantine-color-red-5)"
                                size={12}
                                style={{ flexShrink: 0 }}
                            />
                        ) : (
                            <SingboxLogo
                                size={12}
                                style={{
                                    color: 'var(--mantine-color-teal-5)',
                                    flexShrink: 0
                                }}
                            />
                        )}
                        <Text
                            c={isDangling ? 'red' : undefined}
                            fw={600}
                            size="xs"
                            truncate
                            title={configProfile?.name || t('host-card.widget.dangling')}
                        >
                            {configProfile?.name || t('host-card.widget.dangling')}
                        </Text>
                    </Flex>
                    <Text
                        c="dimmed"
                        size="11px"
                        truncate
                        title={inbound?.tag || t('host-card.widget.unknown-inbound')}
                    >
                        {inbound
                            ? `${inbound.tag}${inbound.type ? ` · ${inbound.type.toUpperCase()}` : ''}`
                            : t('host-card.widget.unknown-inbound')}
                    </Text>
                </div>

                <div className={classes.routeCell}>
                    <Text c="dimmed" size="10px">
                        {item.fingerprint ? `SNI · ${item.fingerprint}` : 'SNI / Host'}
                    </Text>
                    <Text fw={500} size="xs" title={sniDisplay} truncate>
                        {sniDisplay}
                    </Text>
                </div>
            </div>

            {/* Footer Block: Linked Nodes + Feature Pills + Tags */}
            <div className={classes.footerBlock}>
                <Flex align="center" gap={6} justify="space-between" miw={0}>
                    {linkedNodes.length > 0 ? (
                        <Tooltip
                            label={
                                <Stack gap={4}>
                                    {linkedNodes.map((node) => (
                                        <Group gap={6} key={node.uuid} wrap="nowrap">
                                            {resolveCountryCode(node.countryCode, 14)}
                                            <Text size="xs">{node.name}</Text>
                                        </Group>
                                    ))}
                                </Stack>
                            }
                            multiline
                            position="top"
                        >
                            <Group
                                gap={5}
                                miw={0}
                                style={{ flex: 1, overflow: 'hidden' }}
                                wrap="nowrap"
                            >
                                <Group gap={3} style={{ flexShrink: 0 }} wrap="nowrap">
                                    {linkedNodes.slice(0, 3).map((node) => (
                                        <span
                                            key={node.uuid}
                                            style={{ display: 'inline-flex', alignItems: 'center' }}
                                        >
                                            {resolveCountryCode(node.countryCode, 14)}
                                        </span>
                                    ))}
                                </Group>
                                <Text c="dimmed" className={classes.tabular} size="11px" truncate>
                                    {linkedNodes.length === 1
                                        ? linkedNodes[0].name
                                        : t('hosts-matrix.widget.linked-nodes', {
                                              count: linkedNodes.length
                                          })}
                                </Text>
                            </Group>
                        </Tooltip>
                    ) : (
                        <Text c="dimmed" size="11px" truncate>
                            {t('hosts-matrix.widget.no-linked-nodes')}
                        </Text>
                    )}

                    <Flex align="center" gap={4} style={{ flexShrink: 0 }}>
                        {hasExcludedSquads && (
                            <Tooltip label={t('base-host-form.excluded-internal-squads')}>
                                <Badge color="yellow" px={5} size="xs" variant="light">
                                    <TbCirclesRelation size={11} />
                                </Badge>
                            </Tooltip>
                        )}
                        {hasMux && (
                            <Badge
                                color="teal"
                                leftSection={<TbCloudNetwork size={10} />}
                                size="xs"
                                variant="light"
                            >
                                Mux
                            </Badge>
                        )}
                        {hasFinalMask && (
                            <Badge
                                color="cyan"
                                leftSection={<TbMask size={10} />}
                                size="xs"
                                variant="light"
                            >
                                Mask
                            </Badge>
                        )}
                        {hasMapper && (
                            <Badge
                                color="indigo"
                                leftSection={<TbRoute size={10} />}
                                size="xs"
                                variant="light"
                            >
                                Mapper
                            </Badge>
                        )}
                    </Flex>
                </Flex>

                {(sortedTags.length > 0 || item.serverDescription) && (
                    <Flex align="center" gap={4} justify="space-between" miw={0}>
                        <Flex
                            align="center"
                            gap={4}
                            miw={0}
                            style={{ flex: 1, overflow: 'hidden' }}
                        >
                            {sortedTags.slice(0, 3).map((tag) => (
                                <Badge
                                    color="gray"
                                    key={tag}
                                    size="xs"
                                    style={{ flexShrink: 0 }}
                                    variant="light"
                                >
                                    {tag}
                                </Badge>
                            ))}
                            {sortedTags.length > 3 && (
                                <Badge
                                    color="gray"
                                    size="xs"
                                    style={{ flexShrink: 0 }}
                                    variant="light"
                                >
                                    +{sortedTags.length - 3}
                                </Badge>
                            )}
                        </Flex>

                        {item.serverDescription && (
                            <Text
                                c="dimmed"
                                fs="italic"
                                maw="45%"
                                size="11px"
                                title={item.serverDescription}
                                truncate
                            >
                                {item.serverDescription}
                            </Text>
                        )}
                    </Flex>
                )}
            </div>
        </Box>
    )
})
