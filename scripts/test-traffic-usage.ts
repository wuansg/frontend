import assert from 'node:assert/strict'

import {
    selectTraffic,
    selectTrafficSeries,
    summarizeTraffic
} from '../src/shared/utils/traffic-usage.ts'

const entries = [
    {
        id: 'download-heavy',
        total: 200,
        upload: 5,
        download: 195,
        data: [200, 0],
        uploadData: [5, 0],
        downloadData: [195, 0]
    },
    {
        id: 'upload-heavy',
        total: 170,
        upload: 100,
        download: 20,
        data: [150, 20],
        uploadData: [90, 10],
        downloadData: [10, 10]
    },
    {
        id: 'zero',
        total: 0,
        upload: 0,
        download: 0,
        data: [0, 0],
        uploadData: [0, 0],
        downloadData: [0, 0]
    }
]
const original = structuredClone(entries)
assert.equal(selectTraffic(entries, 'total')?.[0].id, 'download-heavy')
assert.equal(selectTraffic(entries, 'upload')?.[0].id, 'upload-heavy')
assert.equal(selectTraffic(entries, 'download')?.[0].id, 'download-heavy')
assert.deepEqual(selectTrafficSeries(entries, 'upload')?.[0].data, [90, 10])
assert.equal(selectTrafficSeries(entries, 'upload')?.[0].total, 100)
assert.deepEqual(entries, original, 'Do not mutate cached API responses')
assert.deepEqual(selectTraffic([], 'upload'), [])
assert.equal(selectTraffic(undefined, 'upload'), undefined)
assert.deepEqual(summarizeTraffic([350, 20, 0], [95, 10, 0], [205, 10, 0]), {
    total: 370,
    upload: 105,
    download: 215,
    directionalAvailable: true,
    undirected: 50,
    inconsistent: false
})
assert.equal(summarizeTraffic([100]).directionalAvailable, false)
assert.equal(summarizeTraffic([100], [], []).directionalAvailable, false)
assert.equal(summarizeTraffic([], [], []).directionalAvailable, true)
assert.equal(summarizeTraffic([0], [0], [0]).undirected, 0)
assert.equal(summarizeTraffic([5], [8], [1]).inconsistent, true)
assert.equal(summarizeTraffic([1e16], [1e16], [1]).inconsistent, false)
console.log(
    'PASS directional display / cache immutability / historical remainder / empty and invalid totals'
)
