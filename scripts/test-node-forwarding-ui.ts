import assert from 'node:assert/strict'
import process from 'node:process'

import {
    detectForwardingConflicts,
    formatForwardEndpoint,
    inferInboundProtocol,
    isLikelyHostname,
    matchesForwardingRuleFilter,
    normalizeForwardingConfig,
    pickNextListenPort,
    protocolsOverlap,
    summarizeRuleRuntimeTraffic,
    summarizeTotalRuntimeTraffic
} from '../src/shared/ui/forms/nodes/base-node-form/node-forwarding.utils.ts'

assert.equal(protocolsOverlap('TCP', 'UDP'), false)
assert.equal(protocolsOverlap('TCP', 'TCP'), true)
assert.equal(protocolsOverlap('TCP_UDP', 'UDP'), true)

assert.equal(inferInboundProtocol({ tag: 'hy2', type: 'hysteria2', port: 8443 }), 'UDP')
assert.equal(
    inferInboundProtocol({ tag: 'vless-tcp', type: 'vless', network: 'tcp', port: 443 }),
    'TCP'
)
assert.equal(inferInboundProtocol({ tag: 'ss', type: 'shadowsocks', port: 8388 }), 'TCP_UDP')

assert.equal(pickNextListenPort([], []), 54_321)
assert.equal(pickNextListenPort([], [{ tag: 'in-1', type: 'vless', port: 54_321 }]), 54_322)
assert.equal(
    pickNextListenPort(
        [
            {
                id: 'r1',
                name: 'dwhk',
                enabled: true,
                protocol: 'TCP_UDP',
                listenPort: 54_322,
                targetAddress: 'dwhk.mugi.uk',
                targetPort: 54_322
            }
        ],
        [{ tag: 'in-2', type: 'anytls', port: 54_323 }]
    ),
    54_324
)

const conflicts = detectForwardingConflicts(
    {
        enabled: true,
        listenInterface: 'auto',
        rules: [
            {
                id: 'r-tcp',
                name: 'TCP Relay',
                enabled: true,
                protocol: 'TCP',
                listenPort: 54_322,
                targetAddress: 'dwhk.mugi.uk',
                targetPort: 54_322
            },
            {
                id: 'r-udp',
                name: 'UDP Relay',
                enabled: true,
                protocol: 'UDP',
                listenPort: 54_322,
                targetAddress: 'dwhk.mugi.uk',
                targetPort: 54_322
            },
            {
                id: 'r-dup',
                name: 'Duplicate Both',
                enabled: true,
                protocol: 'TCP_UDP',
                listenPort: 54_322,
                targetAddress: 'seednet.mugi.uk',
                targetPort: 54_323
            },
            {
                id: 'r-self-and-inbound',
                name: 'Loopback & Inbound Clash',
                enabled: true,
                protocol: 'TCP',
                listenPort: 443,
                targetAddress: '  ALIHK.MUGI.UK ',
                targetPort: 443
            },
            {
                id: 'r-disabled',
                name: 'Disabled Overlap',
                enabled: false,
                protocol: 'TCP_UDP',
                listenPort: 443,
                targetAddress: 'alihk.mugi.uk',
                targetPort: 443
            }
        ]
    },
    'alihk.mugi.uk',
    [
        { tag: 'vless-reality', type: 'vless', network: 'tcp', port: 443 },
        { tag: 'hy2-udp', type: 'hysteria2', port: 443 }
    ]
)

assert.equal(
    conflicts.get('r-tcp')?.length,
    1,
    'TCP + UDP on same port do not clash, only TCP_UDP clashes'
)
assert.equal(conflicts.get('r-udp')?.length, 1)
assert.equal(conflicts.get('r-dup')?.length, 2)
assert.equal(conflicts.has('r-disabled'), false, 'Disabled rules must not trigger conflicts')
assert.deepEqual(conflicts.get('r-self-and-inbound'), [
    { kind: 'self', address: 'alihk.mugi.uk' },
    { kind: 'inbound', protocol: 'TCP', port: 443, inboundTag: 'vless-reality' }
])

const normalized = normalizeForwardingConfig({
    enabled: true,
    listenInterface: '   ',
    rules: [
        {
            id: 'r1',
            name: '  HK -> TW  ',
            enabled: true,
            protocol: 'TCP_UDP',
            listenPort: 54_322,
            targetAddress: '  SeedNet.Mugi.UK ',
            targetPort: 54_322
        }
    ]
})
assert.deepEqual(normalized, {
    enabled: true,
    listenInterface: 'auto',
    rules: [
        {
            id: 'r1',
            name: 'HK -> TW',
            enabled: true,
            protocol: 'TCP_UDP',
            listenPort: 54_322,
            targetAddress: 'seednet.mugi.uk',
            targetPort: 54_322
        }
    ]
})

assert.equal(formatForwardEndpoint('alihk.mugi.uk', 54_322), 'alihk.mugi.uk:54322')
assert.equal(formatForwardEndpoint('2001:db8::1', 54_322), '[2001:db8::1]:54322')
assert.equal(formatForwardEndpoint('[2001:db8::1]', 54_322), '[2001:db8::1]:54322')
assert.equal(isLikelyHostname('dwhk.mugi.uk'), true)
assert.equal(isLikelyHostname('78.105.182.150'), false)

const runtimeStatus = {
    supported: true,
    state: 'applied' as const,
    rules: [
        {
            id: 'r1',
            resolvedTargetAddress: '203.0.113.10',
            tcp: {
                upload: { packets: 10, bytes: 1000 },
                download: { packets: 20, bytes: 4000 }
            },
            udp: {
                upload: { packets: 5, bytes: 500 },
                download: { packets: 7, bytes: 1500 }
            }
        }
    ]
}
const ruleSummary = summarizeRuleRuntimeTraffic(runtimeStatus.rules[0])
assert.equal(ruleSummary.uploadBytes, 1500)
assert.equal(ruleSummary.downloadBytes, 5500)
assert.equal(ruleSummary.totalBytes, 7000)
assert.equal(ruleSummary.tcpPackets, 30)
assert.equal(ruleSummary.udpPackets, 12)
assert.deepEqual(summarizeTotalRuntimeTraffic(runtimeStatus), {
    uploadBytes: 1500,
    downloadBytes: 5500,
    totalBytes: 7000
})

assert.equal(
    matchesForwardingRuleFilter(normalized.rules[0], '203.0.113.10', 'Seednet TWN', '203.0.113'),
    true
)
assert.equal(
    matchesForwardingRuleFilter(normalized.rules[0], '203.0.113.10', 'Seednet TWN', 'twn'),
    true
)
assert.equal(
    matchesForwardingRuleFilter(normalized.rules[0], '203.0.113.10', 'Seednet TWN', '99999'),
    false
)

process.stdout.write(
    'PASS node forwarding UI helpers: port allocator, conflict detector, normalizer, endpoint formatter, traffic summarizer, and search filter\n'
)
