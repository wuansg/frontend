import type { ForwardingTopology } from './topology.schema'

type Rule = ForwardingTopology['rules'][number]
type Host = ForwardingTopology['hosts'][number]
export type TopologyHop = {
    nodeUuid: string
    port: number
    ruleKey: string | null
    inboundTag: string | null
}
export type TopologyPath = {
    hops: TopologyHop[]
    outcome:
        | 'CORE'
        | 'UNRESOLVED_ENTRY'
        | 'UNKNOWN_TARGET'
        | 'NO_LISTENER'
        | 'LOOP'
        | 'LIMIT'
        | 'DISABLED'
        | 'UNEXPECTED_INBOUND'
        | 'TRANSPORT_MISMATCH'
    address: string
    port: number
    ambiguous: boolean
}
type Transport = 'TCP' | 'UDP' | 'TCP_UDP' | 'UNKNOWN'
const protocols = (value: Transport): string[] =>
    value === 'TCP' || value === 'UDP' ? [value] : ['TCP', 'UDP']
const intersect = (left: string[], right: Transport) =>
    left.filter((p) => protocols(right).includes(p))

/** Configured connectivity, never packet tracing or a claim of end-to-end availability. */
export function traceTopology(
    data: ForwardingTopology,
    source: { host: Host } | { rule: Rule }
): TopologyPath[] {
    const maxPaths = 16,
        maxHops = 12
    const results: TopologyPath[] = []
    const nodeMap = new Map(data.nodes.map((n) => [n.uuid, n]))
    const byNode = new Map<string, Rule[]>()
    for (const r of data.rules) {
        if (!byNode.has(r.nodeUuid)) byNode.set(r.nodeUuid, [])
        byNode.get(r.nodeUuid)!.push(r)
    }
    const expected = 'host' in source ? source.host : null
    let budget = 512,
        limited = false
    const finish = (path: TopologyPath) => {
        if (results.length >= maxPaths - 1) {
            limited = true
            return
        }
        results.push(path)
    }
    const walk = (
        ids: string[],
        address: string,
        port: number,
        wire: string[],
        hops: TopologyHop[],
        visited: Set<string>,
        ambiguous: boolean
    ) => {
        if (--budget < 0 || hops.length >= maxHops) {
            finish({ hops, outcome: 'LIMIT', address, port, ambiguous })
            return
        }
        if (!ids.length) {
            finish({
                hops,
                outcome: hops.length ? 'UNKNOWN_TARGET' : 'UNRESOLVED_ENTRY',
                address,
                port,
                ambiguous
            })
            return
        }
        for (const id of ids) {
            if (results.length >= maxPaths - 1) {
                limited = true
                break
            }
            const node = nodeMap.get(id)
            if (!node) continue
            const candidates = (byNode.get(id) ?? []).filter(
                (r) => r.listenPort === port && intersect(wire, r.protocol).length
            )
            const inbounds = node.inbounds.filter(
                (i) => i.port === port && intersect(wire, i.transport).length
            )
            const active = candidates.filter((r) => r.enabled)
            const branched = ambiguous || ids.length > 1 || active.length + inbounds.length > 1
            if (node.disabled) {
                finish({
                    hops: [...hops, { nodeUuid: id, port, ruleKey: null, inboundTag: null }],
                    outcome: 'DISABLED',
                    address,
                    port,
                    ambiguous: branched
                })
                continue
            }
            for (const inbound of inbounds) {
                const bound =
                    !expected ||
                    (expected.inboundUuid === inbound.uuid && expected.boundNodeUuids.includes(id))
                finish({
                    hops: [...hops, { nodeUuid: id, port, ruleKey: null, inboundTag: inbound.tag }],
                    outcome: bound ? 'CORE' : 'UNEXPECTED_INBOUND',
                    address,
                    port,
                    ambiguous: branched
                })
            }
            for (const rule of active) {
                const next = [...hops, { nodeUuid: id, port, ruleKey: rule.key, inboundTag: null }]
                if (visited.has(rule.key)) {
                    finish({ hops: next, outcome: 'LOOP', address, port, ambiguous: branched })
                    continue
                }
                walk(
                    rule.targetNodeUuids,
                    rule.targetAddress,
                    rule.targetPort,
                    intersect(wire, rule.protocol),
                    next,
                    new Set([...visited, rule.key]),
                    branched || rule.targetMatch === 'AMBIGUOUS'
                )
            }
            if (!active.length && !inbounds.length) {
                const transportMismatch =
                    node.inbounds.some((i) => i.port === port) ||
                    (byNode.get(id) ?? []).some((r) => r.listenPort === port && r.enabled)
                finish({
                    hops: [
                        ...hops,
                        {
                            nodeUuid: id,
                            port,
                            ruleKey: candidates[0]?.key ?? null,
                            inboundTag: null
                        }
                    ],
                    outcome: candidates.length
                        ? 'DISABLED'
                        : transportMismatch
                          ? 'TRANSPORT_MISMATCH'
                          : 'NO_LISTENER',
                    address,
                    port,
                    ambiguous: branched
                })
            }
        }
    }
    if ('host' in source) {
        const h = source.host
        if (h.disabled)
            return [
                {
                    hops: [],
                    outcome: 'DISABLED',
                    address: h.address,
                    port: h.port,
                    ambiguous: false
                }
            ]
        walk(
            h.entryNodeUuids,
            h.address,
            h.port,
            protocols(h.transport),
            [],
            new Set(),
            h.entryMatch === 'AMBIGUOUS'
        )
    } else {
        const r = source.rule
        const hops = [
            { nodeUuid: r.nodeUuid, port: r.listenPort, ruleKey: r.key, inboundTag: null }
        ]
        if (!r.enabled || nodeMap.get(r.nodeUuid)?.disabled)
            return [
                {
                    hops,
                    outcome: 'DISABLED',
                    address: r.targetAddress,
                    port: r.targetPort,
                    ambiguous: false
                }
            ]
        walk(
            r.targetNodeUuids,
            r.targetAddress,
            r.targetPort,
            protocols(r.protocol),
            hops,
            new Set([r.key]),
            r.targetMatch === 'AMBIGUOUS'
        )
    }
    if (limited) results.push({ hops: [], outcome: 'LIMIT', address: '', port: 0, ambiguous: true })
    return results
}

export function topologyBytes(value: string): string {
    const n = BigInt(value)
    let scale = 1n,
        unit = 0
    const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB']
    while (unit < units.length - 1 && n >= scale * 1024n) {
        scale *= 1024n
        unit++
    }
    return unit === 0 ? `${n} B` : `${Number((n * 100n) / scale) / 100} ${units[unit]}`
}
export const endpointLabel = (address: string, port: number) =>
    `${address.includes(':') && !address.startsWith('[') ? `[${address}]` : address}:${port}`
