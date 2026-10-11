import { Badge, Box, Group, Stack, Table, Text, ThemeIcon, Tooltip } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { TbArrowDown, TbArrowUp, TbWorld } from 'react-icons/tb'

import { type AuditDomain, type AuditRecord, formatAuditBytes } from './audit-api'
import classes from './user-access-audit.module.css'

type Labels = (cn: string, en: string) => string
type Props = { s: Labels; language: string }

function Target({ domain, ip, port }: { domain: string; ip: string; port?: number }) {
    const address = ip.includes(':') ? `[${ip}]` : ip
    return (
        <Stack gap={3} className={classes.target}>
            <Group gap={6} wrap="nowrap" align="start">
                <TbWorld className={classes.targetIcon} size={16} aria-hidden />
                <Text size="sm" fw={600} className={classes.wrap}>
                    {domain || ip || '—'}
                </Text>
            </Group>
            {port !== undefined && (
                <Text size="xs" c="dimmed" className={classes.wrap} ff="monospace">
                    {address ? `${address}:${port}` : `:${port}`}
                </Text>
            )}
        </Stack>
    )
}

function ConnectionState({ record, s }: { record: AuditRecord; s: Labels }) {
    return (
        <Stack gap={5} align="start">
            <Badge color={record.closedAt ? 'gray' : 'cyan'} variant="light" size="sm">
                {record.closedAt ? s('已关闭', 'Closed') : s('最后观察为活跃', 'Last seen active')}
            </Badge>
            {record.partial && (
                <Tooltip label={s('部分记录 / 可能不完整', 'Partial / may be incomplete')}>
                    <Badge color="yellow" variant="light" size="sm">
                        {s('可能不完整', 'Partial')}
                    </Badge>
                </Tooltip>
            )}
        </Stack>
    )
}

function ByteValue({ value, upload }: { value: string; upload: boolean }) {
    const Icon = upload ? TbArrowUp : TbArrowDown
    return (
        <Group gap={5} wrap="nowrap" justify="end" className={classes.byteValue}>
            <Icon size={14} className={upload ? classes.upload : classes.download} aria-hidden />
            <Text size="sm" fw={500} className={classes.numeric}>
                {formatAuditBytes(value)}
            </Text>
        </Group>
    )
}

function Protocol({ record }: { record: AuditRecord }) {
    return (
        <Stack gap={4}>
            <Text size="xs" c="dimmed" className={classes.wrap}>
                {[record.protocol, record.network].filter(Boolean).join(' · ')}
            </Text>
            <Text size="xs" c="dimmed" className={classes.wrap} ff="monospace">
                {record.inbound}
            </Text>
        </Stack>
    )
}

export function AuditConnections({ records, s, language }: Props & { records: AuditRecord[] }) {
    const cards = useMediaQuery('(max-width: 60em)', false, { getInitialValueInEffect: false })
    const time = (value: string) => new Date(value).toLocaleString(language, { hour12: false })
    if (cards) {
        return (
            <Box className={classes.recordCards} data-testid="audit-connection-cards">
                {records.map((r) => (
                    <Box className={classes.recordCard} key={r.id}>
                        <Group justify="space-between" align="start" gap="xs" wrap="nowrap">
                            <Target
                                domain={r.domain}
                                ip={r.destinationIp}
                                port={r.destinationPort}
                            />
                            <ConnectionState record={r} s={s} />
                        </Group>
                        <Stack gap={4} mt="sm">
                            <Text size="sm" className={classes.wrap}>
                                {r.username}{' '}
                                <Text span c="dimmed">
                                    #{r.userId}
                                </Text>
                            </Text>
                            <Text size="xs" c="dimmed" className={classes.wrap}>
                                {r.nodeName}
                            </Text>
                            <Protocol record={r} />
                        </Stack>
                        <Box className={classes.recordTimes}>
                            <Text size="xs" c="dimmed">
                                {s('连接开始', 'Started')}
                            </Text>
                            <Text size="xs" className={classes.numeric}>
                                {time(r.startedAt)}
                            </Text>
                            <Text size="xs" c="dimmed">
                                {s('最后观察', 'Last observed')}
                            </Text>
                            <Text size="xs" className={classes.numeric}>
                                {time(r.observedAt)}
                            </Text>
                        </Box>
                        <Box className={classes.cardTraffic}>
                            <Stack gap={4}>
                                <Text size="xs" c="dimmed">
                                    {s('参考上传', 'Reference upload')}
                                </Text>
                                <ByteValue value={r.upload} upload />
                            </Stack>
                            <Stack gap={4}>
                                <Text size="xs" c="dimmed">
                                    {s('参考下载', 'Reference download')}
                                </Text>
                                <ByteValue value={r.download} upload={false} />
                            </Stack>
                        </Box>
                    </Box>
                ))}
            </Box>
        )
    }
    return (
        <Box className={classes.tableFrame}>
            <Table.ScrollContainer minWidth={900}>
                <Table
                    highlightOnHover
                    verticalSpacing="md"
                    horizontalSpacing="md"
                    className={classes.table}
                >
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th className={classes.userCell}>
                                {s('用户 / 节点', 'User / node')}
                            </Table.Th>
                            <Table.Th className={classes.targetCell}>
                                {s('网站 / 目标', 'Domain / target')}
                            </Table.Th>
                            <Table.Th className={classes.timeCell}>
                                {s('连接时间', 'Connection time')}
                            </Table.Th>
                            <Table.Th ta="right">{s('上传', 'Upload')}</Table.Th>
                            <Table.Th ta="right">{s('下载', 'Download')}</Table.Th>
                            <Table.Th>{s('状态', 'State')}</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {records.map((r) => (
                            <Table.Tr key={r.id}>
                                <Table.Td className={classes.userCell}>
                                    <Text size="sm" fw={500} className={classes.wrap}>
                                        {r.username}
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                        #{r.userId}
                                    </Text>
                                    <Text size="xs" c="dimmed" mt={5} className={classes.wrap}>
                                        {r.nodeName}
                                    </Text>
                                </Table.Td>
                                <Table.Td className={classes.targetCell}>
                                    <Stack gap={8}>
                                        <Target
                                            domain={r.domain}
                                            ip={r.destinationIp}
                                            port={r.destinationPort}
                                        />
                                        <Protocol record={r} />
                                    </Stack>
                                </Table.Td>
                                <Table.Td className={classes.timeCell}>
                                    <Text size="xs" className={classes.numeric}>
                                        {time(r.startedAt)}
                                    </Text>
                                    <Text size="xs" c="dimmed" mt={5}>
                                        {s('最后观察', 'Last observed')}
                                    </Text>
                                    <Text size="xs" c="dimmed" className={classes.numeric}>
                                        {time(r.observedAt)}
                                    </Text>
                                </Table.Td>
                                <Table.Td>
                                    <ByteValue value={r.upload} upload />
                                </Table.Td>
                                <Table.Td>
                                    <ByteValue value={r.download} upload={false} />
                                </Table.Td>
                                <Table.Td>
                                    <ConnectionState record={r} s={s} />
                                </Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
            </Table.ScrollContainer>
        </Box>
    )
}

export function AuditRanking({ domains, s }: { domains: AuditDomain[]; s: Labels }) {
    const cards = useMediaQuery('(max-width: 60em)', false, { getInitialValueInEffect: false })
    const total = (r: AuditDomain) =>
        formatAuditBytes((BigInt(r.upload) + BigInt(r.download)).toString())
    const rank = (index: number) => (
        <ThemeIcon color={index < 3 ? 'indigo' : 'gray'} variant="light" radius="md" size={26}>
            <Text size="xs" fw={600}>
                {index + 1}
            </Text>
        </ThemeIcon>
    )
    if (cards) {
        return (
            <Stack gap="sm" data-testid="audit-ranking-cards">
                {domains.map((r, i) => (
                    <Box className={classes.recordCard} key={`${r.domain}-${r.destinationIp}`}>
                        <Group justify="space-between" align="start" wrap="nowrap">
                            <Group gap="sm" wrap="nowrap" align="start" className={classes.target}>
                                {rank(i)}
                                <Stack gap={4} className={classes.target}>
                                    <Target domain={r.domain} ip={r.destinationIp} />
                                    <Text size="xs" c="dimmed">
                                        {r.connections} {s('个连接', 'connections')}
                                    </Text>
                                </Stack>
                            </Group>
                            <Text size="sm" fw={600} className={classes.numeric}>
                                {total(r)}
                            </Text>
                        </Group>
                        <Box className={classes.cardTraffic}>
                            <Stack gap={4}>
                                <Text size="xs" c="dimmed">
                                    {s('参考上传', 'Reference upload')}
                                </Text>
                                <ByteValue value={r.upload} upload />
                            </Stack>
                            <Stack gap={4}>
                                <Text size="xs" c="dimmed">
                                    {s('参考下载', 'Reference download')}
                                </Text>
                                <ByteValue value={r.download} upload={false} />
                            </Stack>
                        </Box>
                    </Box>
                ))}
            </Stack>
        )
    }
    return (
        <Box className={classes.tableFrame}>
            <Table.ScrollContainer minWidth={760}>
                <Table
                    highlightOnHover
                    verticalSpacing="md"
                    horizontalSpacing="md"
                    className={classes.table}
                >
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th className={classes.rankingTarget}>
                                {s('排名 / 目标', 'Rank / target')}
                            </Table.Th>
                            <Table.Th ta="right">{s('连接数', 'Connections')}</Table.Th>
                            <Table.Th ta="right">{s('上传', 'Upload')}</Table.Th>
                            <Table.Th ta="right">{s('下载', 'Download')}</Table.Th>
                            <Table.Th ta="right">{s('参考总量', 'Reference total')}</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {domains.map((r, i) => (
                            <Table.Tr key={`${r.domain}-${r.destinationIp}`}>
                                <Table.Td className={classes.targetCell}>
                                    <Group gap="sm" wrap="nowrap" align="start">
                                        {rank(i)}
                                        <Target domain={r.domain} ip={r.destinationIp} />
                                    </Group>
                                </Table.Td>
                                <Table.Td ta="right" className={classes.numeric}>
                                    {r.connections}
                                </Table.Td>
                                <Table.Td>
                                    <ByteValue value={r.upload} upload />
                                </Table.Td>
                                <Table.Td>
                                    <ByteValue value={r.download} upload={false} />
                                </Table.Td>
                                <Table.Td ta="right">
                                    <Text size="sm" fw={600} className={classes.numeric}>
                                        {total(r)}
                                    </Text>
                                </Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
            </Table.ScrollContainer>
        </Box>
    )
}
