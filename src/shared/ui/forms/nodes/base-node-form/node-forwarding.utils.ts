import type { NodeForwardingConfig, NodeForwardingStatus } from '@shared/api/hooks'

export interface InboundPortLike {
    tag: string
    type: string
    network?: string | null
    port?: number | null
    rawInbound?: unknown
}

export interface InboundPortConflict {
    port: number
    protocol: 'TCP' | 'TCP_UDP' | 'UDP'
    tags: [string, string]
}

export type ForwardingConflict =
    | {
          kind: 'rule'
          protocol: NodeForwardingConfig['rules'][number]['protocol']
          port: number
          otherRuleName: string
      }
    | {
          kind: 'inbound'
          protocol: NodeForwardingConfig['rules'][number]['protocol']
          port: number
          inboundTag: string
      }
    | {
          kind: 'self'
          address: string
      }

export interface RuleRuntimeTrafficSummary {
    uploadBytes: number
    downloadBytes: number
    totalBytes: number
    tcpUploadBytes: number
    tcpDownloadBytes: number
    tcpPackets: number
    udpUploadBytes: number
    udpDownloadBytes: number
    udpPackets: number
}

export function protocolsOverlap(left: string, right: string): boolean {
    return left === 'TCP_UDP' || right === 'TCP_UDP' || left === right
}

const WILDCARD_LISTEN_ADDRESSES = new Set(['', '0.0.0.0', '::', '::0', '[::]'])

function rawInboundString(rawInbound: unknown, key: string): null | string {
    if (!rawInbound || typeof rawInbound !== 'object') return null
    const value = (rawInbound as Record<string, unknown>)[key]
    return typeof value === 'string' ? value.trim().toLowerCase() : null
}

// Mirrors inboundListenerProtocol in the backend (inbound-listener-conflicts.util.ts).
export function inferInboundProtocol(inbound: InboundPortLike): 'TCP' | 'TCP_UDP' | 'UDP' {
    const rawNetwork = rawInboundString(inbound.rawInbound, 'network')
    if (rawNetwork === 'tcp') return 'TCP'
    if (rawNetwork === 'udp') return 'UDP'
    const network = inbound.network?.toLowerCase()
    if (network === 'quic' || network === 'kcp' || network === 'udp') return 'UDP'
    if (
        network === 'tcp' ||
        network === 'raw' ||
        network === 'ws' ||
        network === 'grpc' ||
        network === 'httpupgrade' ||
        network === 'splithttp' ||
        network === 'xhttp'
    ) {
        return 'TCP'
    }
    const type = inbound.type.toLowerCase()
    if (['hysteria', 'hysteria2', 'quic', 'tuic'].includes(type)) return 'UDP'
    if (
        ['anytls', 'http', 'naive', 'shadowtls', 'snell', 'trojan', 'vless', 'vmess'].includes(type)
    ) {
        return 'TCP'
    }
    return 'TCP_UDP'
}

/**
 * Inbounds that would listen on the same port and transport on one node. Both
 * sockets bind (SO_REUSEPORT), and the kernel spreads new connections across
 * them, so clients fail at random instead of the core failing to start.
 */
export function detectInboundPortConflicts(inbounds: InboundPortLike[]): InboundPortConflict[] {
    const conflicts: InboundPortConflict[] = []
    for (let i = 0; i < inbounds.length; i++) {
        const left = inbounds[i]
        if (typeof left.port !== 'number') continue
        const leftProtocol = inferInboundProtocol(left)
        const leftListen = rawInboundString(left.rawInbound, 'listen') ?? ''
        for (const right of inbounds.slice(i + 1)) {
            if (right.port !== left.port) continue
            const rightProtocol = inferInboundProtocol(right)
            if (!protocolsOverlap(leftProtocol, rightProtocol)) continue
            const rightListen = rawInboundString(right.rawInbound, 'listen') ?? ''
            if (
                !WILDCARD_LISTEN_ADDRESSES.has(leftListen) &&
                !WILDCARD_LISTEN_ADDRESSES.has(rightListen) &&
                leftListen !== rightListen
            ) {
                continue
            }
            conflicts.push({
                port: left.port,
                protocol: leftProtocol === 'TCP_UDP' ? rightProtocol : leftProtocol,
                tags: [left.tag, right.tag]
            })
        }
    }
    return conflicts
}

export function detectForwardingConflicts(
    config: NodeForwardingConfig,
    nodeAddress?: string | null,
    activeInbounds: InboundPortLike[] = []
): Map<string, ForwardingConflict[]> {
    const conflicts = new Map<string, ForwardingConflict[]>()
    const pushConflict = (ruleId: string, item: ForwardingConflict) => {
        const list = conflicts.get(ruleId) ?? []
        list.push(item)
        conflicts.set(ruleId, list)
    }

    const normalizedNodeAddress = nodeAddress?.trim().toLowerCase() ?? ''
    const enabledRules = config.rules.filter((rule) => rule.enabled)

    for (let i = 0; i < enabledRules.length; i++) {
        const left = enabledRules[i]
        for (let j = i + 1; j < enabledRules.length; j++) {
            const right = enabledRules[j]
            if (
                left.listenPort === right.listenPort &&
                protocolsOverlap(left.protocol, right.protocol)
            ) {
                pushConflict(left.id, {
                    kind: 'rule',
                    protocol: left.protocol,
                    port: left.listenPort,
                    otherRuleName: right.name || `#${j + 1}`
                })
                pushConflict(right.id, {
                    kind: 'rule',
                    protocol: right.protocol,
                    port: right.listenPort,
                    otherRuleName: left.name || `#${i + 1}`
                })
            }
        }

        const target = left.targetAddress.trim().toLowerCase()
        if (normalizedNodeAddress && target && target === normalizedNodeAddress) {
            pushConflict(left.id, {
                kind: 'self',
                address: nodeAddress!.trim()
            })
        }

        for (const inbound of activeInbounds) {
            if (
                typeof inbound.port === 'number' &&
                inbound.port === left.listenPort &&
                protocolsOverlap(left.protocol, inferInboundProtocol(inbound))
            ) {
                pushConflict(left.id, {
                    kind: 'inbound',
                    protocol: left.protocol,
                    port: left.listenPort,
                    inboundTag: inbound.tag
                })
            }
        }
    }

    return conflicts
}

export function pickNextListenPort(
    rules: NodeForwardingConfig['rules'],
    activeInbounds: InboundPortLike[] = [],
    defaultBasePort = 54_321
): number {
    const used = new Set<number>()
    for (const rule of rules) {
        if (
            Number.isInteger(rule.listenPort) &&
            rule.listenPort >= 1 &&
            rule.listenPort <= 65_535
        ) {
            used.add(rule.listenPort)
        }
    }
    for (const inbound of activeInbounds) {
        if (typeof inbound.port === 'number' && inbound.port >= 1 && inbound.port <= 65_535) {
            used.add(inbound.port)
        }
    }

    const validRulePorts = rules
        .map((rule) => rule.listenPort)
        .filter((port) => Number.isInteger(port) && port >= 1 && port < 65_535)
    const startPort = validRulePorts.length > 0 ? Math.max(...validRulePorts) + 1 : defaultBasePort

    for (let candidate = startPort; candidate <= 65_535; candidate++) {
        if (!used.has(candidate)) return candidate
    }
    for (let candidate = defaultBasePort; candidate < startPort; candidate++) {
        if (!used.has(candidate)) return candidate
    }
    for (let candidate = 10_000; candidate <= 65_535; candidate++) {
        if (!used.has(candidate)) return candidate
    }
    return defaultBasePort
}

export function normalizeForwardingConfig(config: NodeForwardingConfig): NodeForwardingConfig {
    return {
        enabled: config.enabled,
        listenInterface: config.listenInterface.trim() || 'auto',
        rules: config.rules.map((rule) => ({
            ...rule,
            name: rule.name.trim(),
            targetAddress: rule.targetAddress.trim().toLowerCase()
        }))
    }
}

export function formatForwardEndpoint(host: string, port: number): string {
    const trimmed = host.trim()
    if (!trimmed) return `:${port}`
    return trimmed.includes(':') && !trimmed.startsWith('[')
        ? `[${trimmed}]:${port}`
        : `${trimmed}:${port}`
}

export function isLikelyHostname(address: string): boolean {
    const trimmed = address.trim()
    return trimmed.length > 0 && /[a-z]/i.test(trimmed)
}

export function summarizeRuleRuntimeTraffic(
    ruleStatus?: NodeForwardingStatus['rules'][number]
): RuleRuntimeTrafficSummary {
    const tcpUploadBytes = ruleStatus?.tcp?.upload.bytes ?? 0
    const tcpDownloadBytes = ruleStatus?.tcp?.download.bytes ?? 0
    const tcpPackets =
        (ruleStatus?.tcp?.upload.packets ?? 0) + (ruleStatus?.tcp?.download.packets ?? 0)
    const udpUploadBytes = ruleStatus?.udp?.upload.bytes ?? 0
    const udpDownloadBytes = ruleStatus?.udp?.download.bytes ?? 0
    const udpPackets =
        (ruleStatus?.udp?.upload.packets ?? 0) + (ruleStatus?.udp?.download.packets ?? 0)
    const uploadBytes = tcpUploadBytes + udpUploadBytes
    const downloadBytes = tcpDownloadBytes + udpDownloadBytes
    return {
        uploadBytes,
        downloadBytes,
        totalBytes: uploadBytes + downloadBytes,
        tcpUploadBytes,
        tcpDownloadBytes,
        tcpPackets,
        udpUploadBytes,
        udpDownloadBytes,
        udpPackets
    }
}

export function summarizeTotalRuntimeTraffic(status?: NodeForwardingStatus): {
    uploadBytes: number
    downloadBytes: number
    totalBytes: number
} {
    if (!status?.rules.length) {
        return { uploadBytes: 0, downloadBytes: 0, totalBytes: 0 }
    }
    let uploadBytes = 0
    let downloadBytes = 0
    for (const rule of status.rules) {
        const item = summarizeRuleRuntimeTraffic(rule)
        uploadBytes += item.uploadBytes
        downloadBytes += item.downloadBytes
    }
    return {
        uploadBytes,
        downloadBytes,
        totalBytes: uploadBytes + downloadBytes
    }
}

export function matchesForwardingRuleFilter(
    rule: NodeForwardingConfig['rules'][number],
    resolvedTargetAddress: string | undefined,
    targetNodeName: string | undefined,
    rawQuery: string
): boolean {
    const query = rawQuery.trim().toLowerCase()
    if (!query) return true
    return (
        rule.name.toLowerCase().includes(query) ||
        rule.targetAddress.toLowerCase().includes(query) ||
        String(rule.listenPort).includes(query) ||
        String(rule.targetPort).includes(query) ||
        rule.protocol.toLowerCase().includes(query) ||
        Boolean(resolvedTargetAddress?.toLowerCase().includes(query)) ||
        Boolean(targetNodeName?.toLowerCase().includes(query))
    )
}
