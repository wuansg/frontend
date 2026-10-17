const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const Module=require('node:module')
const ts=require('typescript')
const root=path.resolve(__dirname,'..')
function load(file) {
    const name=path.join(root,file),m=new Module(name,module)
    m.filename=name;m.paths=Module._nodeModulePaths(path.dirname(name))
    m._compile(ts.transpileModule(fs.readFileSync(name,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,name)
    return m.exports
}
const {traceTopology,topologyBytes,endpointLabel}=load('src/pages/dashboard/forwarding-topology/topology-paths.ts')
const {ForwardingTopologySchema}=load('src/pages/dashboard/forwarding-topology/topology.schema.ts')
const fixture=require('./fixtures/forwarding-topology.json')
const data=ForwardingTopologySchema.parse(fixture)
const run=(d=data,host=d.hosts[0])=>traceTopology(d,{host})
let paths=run()
assert.equal(paths.length,1)
assert.equal(paths[0].outcome,'CORE')
assert.deepEqual(paths[0].hops.map(h=>h.nodeUuid),data.nodes.map(n=>n.uuid))
assert.equal(run(data,data.hosts[1])[0].outcome,'UNRESOLVED_ENTRY')
assert.equal(traceTopology(data,{rule:data.rules[1]})[0].outcome,'CORE')
assert.equal(traceTopology(data,{rule:data.rules[1]})[0].hops.length,2)
const direct={...data.hosts[0],address:data.nodes[2].address,port:443,entryNodeUuids:[data.nodes[2].uuid]}
assert.equal(run(data,direct)[0].outcome,'CORE')
assert.equal(run(data,direct)[0].hops.length,1)
let changed=structuredClone(data)
changed.rules[1].targetNodeUuids=[data.nodes[1].uuid];changed.rules[1].targetPort=1234
assert.equal(run(changed)[0].outcome,'LOOP')
changed=structuredClone(data);changed.nodes[1].disabled=true
assert.equal(run(changed)[0].outcome,'DISABLED')
changed=structuredClone(data);changed.rules[0].enabled=false
assert.equal(run(changed)[0].outcome,'DISABLED')
changed=structuredClone(data);changed.rules[1].targetNodeUuids=[]
assert.equal(run(changed)[0].outcome,'UNKNOWN_TARGET')
changed=structuredClone(data);changed.rules[1].targetPort=9443
assert.equal(run(changed)[0].outcome,'NO_LISTENER')
changed=structuredClone(data);changed.hosts[0].transport='TCP';changed.nodes[2].inbounds[0].transport='UDP'
assert.equal(run(changed)[0].outcome,'TRANSPORT_MISMATCH')
changed=structuredClone(data);changed.hosts[0].boundNodeUuids=[]
assert.equal(run(changed)[0].outcome,'UNEXPECTED_INBOUND')
changed=structuredClone(data);changed.rules[0].targetNodeUuids.push(data.nodes[2].uuid);changed.rules[0].targetMatch='AMBIGUOUS'
assert(run(changed).every(p=>p.ambiguous),'Never collapse ambiguous targets into a single confident path')
changed=structuredClone(data);changed.nodes[2].inbounds=Array.from({length:50},(_,i)=>({...changed.nodes[2].inbounds[0],tag:'many-'+i}))
assert.equal(run(changed).length,16);assert.equal(run(changed).at(-1).outcome,'LIMIT')
changed=structuredClone(data);changed.hosts[0].disabled=true
assert.equal(run(changed)[0].outcome,'DISABLED')
assert.equal(topologyBytes('9007199254740993'),'8 PiB')
assert.equal(topologyBytes('1024'),'1 KiB')
assert.equal(endpointLabel('2001:db8::1',443),'[2001:db8::1]:443')
assert.equal(ForwardingTopologySchema.safeParse({...fixture,nodes:[{...fixture.nodes[0],quota:{...fixture.nodes[0].quota,used:123}}]}).success,false)
for(const file of ['src/app/router/router.tsx','src/shared/constants/routes.ts','src/app/layouts/dashboard/main-layout/menu-sections/desktop-menu-sections.ts','src/app/layouts/dashboard/main-layout/menu-sections/mobile-menu-sections.ts'])
    assert(fs.readFileSync(path.join(root,file),'utf8').includes('FORWARDING_TOPOLOGY'),file+' must expose the topology route')
console.log('PASS topology wire validation, multi-hop/direct rules, unknown entries/targets, loops, disabled paths, transport/binding mismatch, ambiguity, branch cap, BigInt and desktop/mobile navigation')
