// Headless component interaction tests. All API, modal and DOM dependencies are mocked.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const dayjs = require('dayjs')
dayjs.extend(require('dayjs/plugin/utc'))

const root = path.resolve(__dirname, '..')
const today = { start: '2026-10-15', end: '2026-10-15' }
const selected = { start: '2026-10-01', end: '2026-10-07' }
const clone = value => JSON.parse(JSON.stringify(value))

function fixture(file, exportName, props = {}) {
    const modals = [], resolutions = [], queries = [], progress = []
    const state = []
    let cursor = 0, resolutionId = 19
    const useState = initial => {
        const index = cursor++
        if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial
        return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value }]
    }
    const topUsers = [{ id: 19, username: 'traffic-user', color: '#123456', total: 300, upload: 100, download: 200 }]
    const stats = { categories: ['2026-10-01'], series: [], topUsers, topNodes: [], topHosts: [], sparklineData: [], pages: [{ users: [{ id: 19, totalBytes: 300 }] }] }
    const tags = new Proxy({}, { get: (_, name) => String(name) })
    const mocks = {
        'react': { useState },
        'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
        'react-i18next': { useTranslation: () => ({ t: key => key, i18n: { language: 'en' } }) },
        '@ebay/nice-modal-react': { create: component => component, useModal: () => ({}) },
        '@mantine/hooks': { useDebouncedState: useState },
        '@mantine/modals': { modals: {} },
        '@mantine/nprogress': { nprogress: { start: () => progress.push('start'), complete: () => progress.push('complete') } },
        '@shared/_modals/show-modal': { showModal: (id, args) => modals.push({ id, args }) },
        '@shared/_modals/use-nice-modal': { useNiceMantineModal: () => ({ modalProps: {} }) },
        '@shared/api/hooks': new Proxy({}, { get: (_, name) => name === 'useResolveUser'
            ? () => ({ mutateAsync: async request => { resolutions.push(request); return { id: resolutionId } } })
            : request => { queries.push({ name, request }); return { data: stats, isLoading: false } } }),
        '@shared/utils/time-utils': { getDefaultDateRange: () => ({ ...today }) },
        '@shared/utils/traffic-usage': { selectTraffic: value => value, selectTrafficSeries: value => value },
        '@entities/dashboard/modal-store': { MODALS: {}, useModalState: () => ({ isOpen: true, internalState: { hostUuid: 'host-fixture' } }), useModalCloseActions: () => [() => {}, () => {}] },
        '@kastov/uuid-color': { colorFromId: () => '#123456' }
    }
    const module = { exports: {} }
    const filename = path.join(root, file)
    const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022 }
    }).outputText
    const req = id => id === 'dayjs' ? dayjs : (mocks[id] ?? tags)
    vm.runInNewContext('(function(require,module,exports){' + output + '\n})', {}, { filename })(req, module, module.exports)
    return {
        modals, resolutions, queries, progress,
        render: () => { cursor = 0; return module.exports[exportName](props) },
        missingUser: () => { resolutionId = null }
    }
}

function find(tree, type) {
    if (Array.isArray(tree)) return tree.flatMap(child => find(child, type))
    if (!tree || typeof tree !== 'object') return []
    return [...(tree.type === type ? [tree] : []), ...Object.values(tree.props ?? {}).flatMap(value => find(value, type))]
}
const only = (tree, type) => {
    const matches = find(tree, type)
    assert.equal(matches.length, 1, 'Expected exactly one ' + type)
    return matches[0].props
}
const clickUser = async (tree, user) => {
    await only(tree, 'TopLeaderboardCardShared').onItemClick(user)
    await new Promise(resolve => setImmediate(resolve))
}

async function main() {
    const sources = [
        ['src/pages/dashboard/statistic-users/components/statistic-users.component.tsx', 'StatisticUsersPage', {}, false],
        ['src/shared/_modals/nodes/node-usage-stats/node-usage-stats.drawer.tsx', 'NodeUsageStatsDrawer', { nodeUuid: 'node-fixture' }, true],
        ['src/shared/_modals/nodes/nodes-usage-stats/nodes-usage-stats.modal.tsx', 'NodesUsageStatsModal', { nodeUuids: ['node-fixture'] }, true],
        ['src/shared/_modals/internal-squads/internal-squads-usage-drawer/internal-squads-usage.drawer.tsx', 'InternalSquadsUsageDrawer', { squadUuid: 'squad-fixture' }, false],
        ['src/widgets/dashboard/hosts/host-users-usage-statistic/host-users-usage-drawer.widget.tsx', 'HostUsersUsageDrawer', {}, true]
    ]
    for (const [file, name, props, resolves] of sources) {
        const f = fixture(file, name, props)
        let tree = f.render()
        only(tree, 'DatePickerInput').onChange([selected.start, selected.end])
        const direction = find(tree, 'TrafficDirectionControl')[0]
        direction?.props.onChange('upload')
        tree = f.render()
        await clickUser(tree, { name: name === 'InternalSquadsUsageDrawer' ? '19' : 'traffic-user', uuid: '19', total: 300, color: '#123456' })
        const args = { userId: 19, initialRange: selected, ...(direction ? { initialDirection: 'upload' } : {}), ...(name === 'HostUsersUsageDrawer' ? { initialView: 'hosts' } : {}) }
        assert.deepEqual(clone(f.modals), [{ id: 'users_userUsageModal', args }], name + ': must open usage directly with selected filters')
        assert.deepEqual(clone(f.resolutions), resolves ? [{ variables: { username: 'traffic-user' } }] : [])
        if (resolves) {
            assert.deepEqual(f.progress, ['start', 'complete'])
            f.missingUser()
            await clickUser(tree, { name: 'deleted-user' })
            assert.equal(f.modals.length, 1, 'An unresolved user must not open the wrong user')
            assert.deepEqual(f.progress, ['start', 'complete', 'start', 'complete'])
        }
        if (name === 'StatisticUsersPage') {
            only(tree, 'UsersStatisticBarchartWidget').onUserClick(23)
            assert.deepEqual(clone(f.modals.at(-1)), { id: 'users_userUsageModal', args: { ...args, userId: 23 } }, 'Daily chart users must also open usage, not profile')
        }
        assert.ok(!f.modals.some(m => m.id === 'users_viewUserModal'))
        console.log('PASS direct usage navigation: ' + name)
    }
    for (const view of ['nodes', 'hosts']) {
        const f = fixture('src/shared/_modals/users/user-usage-modal/user-usage.modal.tsx', 'UserUsageModal', { userId: 19, initialRange: selected, initialDirection: 'download', initialView: view })
        let tree = f.render()
        assert.deepEqual(clone(only(tree, 'DatePickerInput').value), [selected.start, selected.end])
        assert.equal(only(tree, 'TrafficDirectionControl').value, 'download')
        assert.equal(only(tree, 'SegmentedControl').value, view)
        const active = f.queries.find(q => q.request.rQueryParams.enabled)
        assert.equal(active.name, view === 'nodes' ? 'useGetStatsUserUsage' : 'useGetStatsUserHostsUsage')
        assert.deepEqual(clone(active.request.route), { userId: 19 })
        assert.deepEqual(clone(active.request.query), { ...selected, trafficDirection: 'download', [view === 'nodes' ? 'topNodesLimit' : 'topHostsLimit']: 20 })
        only(tree, 'DatePickerInput').onChange([null, null])
        tree = f.render()
        assert.deepEqual(clone(only(tree, 'DatePickerInput').value), [today.start, today.end], 'Clearing an inherited filter must still reset to today')
    }
    const normal = fixture('src/shared/_modals/users/user-usage-modal/user-usage.modal.tsx', 'UserUsageModal', { userId: 19 }).render()
    assert.deepEqual(clone(only(normal, 'DatePickerInput').value), [today.start, today.end])
    assert.equal(only(normal, 'TrafficDirectionControl').value, 'total')
    assert.equal(only(normal, 'SegmentedControl').value, 'nodes')
    const profileIcon = fixture('src/shared/ui/resolve-user-action-icon/resolve-user-action-icon.shared.tsx', 'ResolveUserActionShared', { userId: 19 })
    only(profileIcon.render(), 'ActionIcon').onClick()
    assert.deepEqual(clone(profileIcon.modals), [{ id: 'users_viewUserModal', args: { userId: 19 } }], 'Non-traffic user profile links must be preserved')
    console.log('PASS user usage initialization, inherited filters, default today, reset and non-traffic profile behavior')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
