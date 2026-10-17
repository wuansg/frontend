import { instance } from '@shared/api/axios'

import { ForwardingTopologySchema } from './topology.schema'

export const topologyAPI = {
    get: async (params: { start: string; end: string }, signal?: AbortSignal) =>
        ForwardingTopologySchema.parse(
            (await instance.get('/api/nodes/forwarding/topology', { params, signal })).data.response
        )
}
