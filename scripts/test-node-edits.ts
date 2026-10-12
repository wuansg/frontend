import assert from 'node:assert/strict'

import { nodeDirtyFields } from '../src/shared/_modals/nodes/edit-node-modal/node-dirty-fields.ts'
const initial = {
    uuid: 'node',
    name: 'Fixture',
    address: 'fixture.invalid',
    port: 2222,
    providerUuid: undefined as string | undefined | null,
    configProfile: { activeConfigProfileUuid: 'profile', activeInbounds: ['b', 'a'] }
}
assert.deepEqual(nodeDirtyFields(initial, initial), {})
assert.deepEqual(
    nodeDirtyFields(initial, { ...initial, name: ' Fixture ', address: ' fixture.invalid ' }),
    {}
)
assert.deepEqual(
    nodeDirtyFields(initial, {
        ...initial,
        configProfile: { activeConfigProfileUuid: 'profile', activeInbounds: ['a', 'b'] }
    }),
    {}
)
assert.deepEqual(nodeDirtyFields(initial, { ...initial, name: ' Renamed ' }), { name: 'Renamed' })
assert.deepEqual(nodeDirtyFields(initial, { ...initial, providerUuid: null }), {
    providerUuid: null
})
assert.deepEqual(nodeDirtyFields(initial, { ...initial, port: 3333 }), { port: 3333 })
assert.deepEqual(
    nodeDirtyFields(initial, {
        ...initial,
        configProfile: { activeConfigProfileUuid: 'profile', activeInbounds: [] }
    }),
    { configProfile: { activeConfigProfileUuid: 'profile', activeInbounds: [] } }
)
const pureForwarding = {
    ...initial,
    configProfile: { activeConfigProfileUuid: '', activeInbounds: [] }
}
assert.deepEqual(
    nodeDirtyFields(pureForwarding, { ...pureForwarding, name: 'Forwarder' }),
    { name: 'Forwarder' },
    'No unused empty profile may enter a metadata update'
)
const saved = { ...initial, name: 'Renamed' }
assert.deepEqual(
    nodeDirtyFields(saved, { ...saved, name: 'Fixture' }),
    { name: 'Fixture' },
    'After saving, returning to the earlier name is a real change'
)
console.log(
    'PASS node dirty fields: no-op/trim, metadata-only, nullable clear, order-independent inbounds, runtime changes, coreless metadata and reset baseline'
)
