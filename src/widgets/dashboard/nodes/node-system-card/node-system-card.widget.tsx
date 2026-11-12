import { ActionIcon, Badge, Group, Progress, Stack, Text, Tooltip } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { GetNodeCommand } from '@remnawave/backend-contract'
import { memo, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
    PiArrowDownDuotone,
    PiArrowUpDuotone,
    PiCpuDuotone,
    PiDesktopTowerDuotone,
    PiLinuxLogoDuotone,
    PiNetworkDuotone,
    PiTimerDuotone
} from 'react-icons/pi'
import { TbCamera } from 'react-icons/tb'

import { BaseOverlayHeader } from '@shared/ui/overlays/base-overlay-header'
import { SectionCard } from '@shared/ui/section-card'
import {
    prettifyBytesUtil,
    prettySiBytesUtil,
    prettySiRealtimeBytesUtil
} from '@shared/utils/bytes'
import { copyScreenshotToClipboard } from '@shared/utils/copy-screenshot.util'
import { formatDurationUtil } from '@shared/utils/time-utils'

import classes from './node-system-card.module.css'

interface IProps {
    node: GetNodeCommand.Response['response']
}

export const NodeSystemCardWidget = memo((props: IProps) => {
    const { node } = props
    const { t } = useTranslation()
    const cardRef = useRef<HTMLDivElement | null>(null)

    const [copying, setCopying] = useState(false)

    const copy = async () => {
        setCopying(true)
        try {
            if (!cardRef.current) throw new Error('cardRef')
            await copyScreenshotToClipboard(cardRef.current)
        } catch (error) {
            notifications.show({
                color: 'red',
                message: `${error instanceof Error ? error.message : 'Unknown error'}`,
                title: 'Error'
            })
        } finally {
            setCopying(false)
        }
    }

    const system = node.system

    const memoryData = useMemo(() => {
        if (!system) return null

        const total = system.info.memoryTotal
        const free = system.stats.memoryFree
        const used = total - free
        const percentage = total > 0 ? Math.round((used / total) * 100) : 0

        let color = 'teal'
        if (percentage > 90) color = 'red'
        else if (percentage > 70) color = 'yellow'

        return {
            total: prettifyBytesUtil(total) || '0 B',
            free: prettifyBytesUtil(free) || '0 B',
            used: prettifyBytesUtil(used) || '0 B',
            percentage,
            color
        }
    }, [system])

    const systemUptime = useMemo(() => {
        if (!system) return null
        return formatDurationUtil(Math.floor(system.stats.uptime))
    }, [system])

    const interfaceData = useMemo(() => {
        if (!system?.stats.interface) return null

        const { interface: iface } = system.stats

        return {
            name: iface.interface,
            rxSpeed: prettySiRealtimeBytesUtil(iface.rxBytesPerSec, true, true),
            txSpeed: prettySiRealtimeBytesUtil(iface.txBytesPerSec, true, true),
            rxTotal: prettySiBytesUtil(iface.rxTotal) || '0 B',
            txTotal: prettySiBytesUtil(iface.txTotal) || '0 B'
        }
    }, [system])

    if (!system) return null

    const { info } = system
    const nonLoopbackInterfaces = info.networkInterfaces.filter((iface) => iface !== 'lo')
    const visibleInterfaces = nonLoopbackInterfaces.slice(0, 3)
    const restInterfaces = nonLoopbackInterfaces.length - 3

    return (
        <div className={classes.wrapper}>
            <Tooltip label={t('node-system-card.widget.copy-screenshot')}>
                <ActionIcon
                    aria-label={t('node-system-card.widget.copy-screenshot')}
                    className={classes.screenshotButton}
                    color="gray"
                    loading={copying}
                    radius="md"
                    size="md"
                    variant="subtle"
                    onClick={copy}
                >
                    <TbCamera size={16} />
                </ActionIcon>
            </Tooltip>

            <SectionCard.Root gap="sm" ref={cardRef} style={{ overflow: 'hidden' }}>
                <SectionCard.Section>
                    <Group align="center" justify="space-between" pr={34} wrap="nowrap">
                        <BaseOverlayHeader
                            iconColor="violet"
                            IconComponent={PiDesktopTowerDuotone}
                            iconSize={20}
                            iconVariant="soft"
                            subtitle={`${info.platform} / ${info.arch} · ${info.cpus} vCPU`}
                            title={t('node-system-card.widget.system-info')}
                            titleOrder={5}
                            truncateTitle
                        />

                        <Tooltip label={t('node-system-card.widget.system-uptime')}>
                            <Badge
                                color="teal"
                                leftSection={<PiTimerDuotone size={13} />}
                                size="sm"
                                style={{ fontVariantNumeric: 'tabular-nums' }}
                                variant="light"
                            >
                                {systemUptime}
                            </Badge>
                        </Tooltip>
                    </Group>
                </SectionCard.Section>

                <SectionCard.Section>
                    <Stack gap="xs">
                        <div className={classes.memorySection}>
                            <Stack gap={6}>
                                <Group gap={6} justify="space-between" wrap="nowrap">
                                    <Text
                                        c="dimmed"
                                        fw={600}
                                        lh={1}
                                        lts={0.6}
                                        size="10px"
                                        tt="uppercase"
                                    >
                                        {t('node-system-card.widget.memory')}
                                    </Text>
                                    <Text className={classes.memoryValues}>
                                        {memoryData?.used} / {memoryData?.total}{' '}
                                        <span className={classes.memoryPercent}>
                                            ({memoryData?.percentage}%)
                                        </span>
                                    </Text>
                                </Group>

                                <Progress
                                    color={memoryData?.color ?? 'teal'}
                                    radius="xl"
                                    size="sm"
                                    value={memoryData?.percentage ?? 0}
                                />
                            </Stack>
                        </div>

                        {interfaceData && (
                            <div className={classes.interfaceSection}>
                                <Stack gap={6}>
                                    <Group gap={6} justify="space-between">
                                        <Text
                                            c="dimmed"
                                            fw={600}
                                            lh={1}
                                            lts={0.6}
                                            size="10px"
                                            tt="uppercase"
                                        >
                                            {t('node-system-card.widget.interface')}
                                        </Text>
                                        <Badge color="cyan" size="xs" variant="soft">
                                            {interfaceData.name}
                                        </Badge>
                                    </Group>

                                    <Group grow>
                                        <Stack gap={1}>
                                            <Text className={classes.statLabel} component="div">
                                                <Group gap={4}>
                                                    <PiArrowDownDuotone
                                                        color="var(--mantine-color-teal-5)"
                                                        size={12}
                                                    />
                                                    RX
                                                </Group>
                                            </Text>
                                            <Text className={classes.statValue}>
                                                {interfaceData.rxSpeed}
                                            </Text>
                                            <Text
                                                c="dimmed"
                                                size="10px"
                                                style={{ fontVariantNumeric: 'tabular-nums' }}
                                            >
                                                {t('node-system-card.widget.total')}:{' '}
                                                {interfaceData.rxTotal}
                                            </Text>
                                        </Stack>
                                        <Stack gap={1}>
                                            <Text className={classes.statLabel} component="div">
                                                <Group gap={4}>
                                                    <PiArrowUpDuotone
                                                        color="var(--mantine-color-cyan-5)"
                                                        size={12}
                                                    />
                                                    TX
                                                </Group>
                                            </Text>
                                            <Text className={classes.statValue}>
                                                {interfaceData.txSpeed}
                                            </Text>
                                            <Text
                                                c="dimmed"
                                                size="10px"
                                                style={{ fontVariantNumeric: 'tabular-nums' }}
                                            >
                                                {t('node-system-card.widget.total')}:{' '}
                                                {interfaceData.txTotal}
                                            </Text>
                                        </Stack>
                                    </Group>
                                </Stack>
                            </div>
                        )}

                        <div className={classes.infoSection}>
                            <Stack gap={6}>
                                <Text
                                    c="dimmed"
                                    fw={600}
                                    lh={1}
                                    lts={0.6}
                                    size="10px"
                                    tt="uppercase"
                                >
                                    {t('node-system-card.widget.system')}
                                </Text>

                                <Stack gap={1} style={{ minWidth: 0, overflow: 'hidden' }}>
                                    <Text className={classes.statLabel} component="div">
                                        <Group gap={4}>
                                            <PiCpuDuotone size={12} />
                                            CPU
                                        </Group>
                                    </Text>
                                    <Tooltip label={`${info.cpus} x ${info.cpuModel}`}>
                                        <Text className={classes.statValue}>
                                            {info.cpus} x {info.cpuModel}
                                        </Text>
                                    </Tooltip>
                                </Stack>

                                <Group grow style={{ overflow: 'hidden' }}>
                                    <Stack gap={1} style={{ minWidth: 0 }}>
                                        <Text className={classes.statLabel} component="div">
                                            <Group gap={4}>
                                                <PiLinuxLogoDuotone size={12} />
                                                {t('node-system-card.widget.kernel')}
                                            </Group>
                                        </Text>
                                        <Text className={classes.statValue}>{info.release}</Text>
                                    </Stack>
                                    {nonLoopbackInterfaces.length > 0 && (
                                        <Stack gap={1} style={{ minWidth: 0 }}>
                                            <Text className={classes.statLabel} component="div">
                                                <Group gap={4}>
                                                    <PiNetworkDuotone size={12} />
                                                    {t('node-system-card.widget.network')}
                                                </Group>
                                            </Text>
                                            <Tooltip
                                                disabled={nonLoopbackInterfaces.length <= 3}
                                                label={nonLoopbackInterfaces.join(', ')}
                                            >
                                                <Text className={classes.statValue}>
                                                    {restInterfaces > 0
                                                        ? `${visibleInterfaces.join(', ')} +${restInterfaces}`
                                                        : visibleInterfaces.join(', ')}
                                                </Text>
                                            </Tooltip>
                                        </Stack>
                                    )}
                                </Group>
                            </Stack>
                        </div>
                    </Stack>
                </SectionCard.Section>
            </SectionCard.Root>
        </div>
    )
})
