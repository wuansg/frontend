const assert=require('node:assert/strict')
const {chromium}=require(process.env.PLAYWRIGHT_CORE_PATH||'playwright-core')
const fixture=require('./fixtures/forwarding-topology.json')
const url=process.env.TOPOLOGY_TEST_URL||'http://127.0.0.1:5173/scripts/fixtures/forwarding-topology.html'
const endpoint=new URL(url)
assert(['127.0.0.1','localhost'].includes(endpoint.hostname),'Browser fixture must stay on loopback')
async function setup(browser,width,options={}) {
    const context=await browser.newContext({viewport:{width,height:1100},timezoneId:'America/Los_Angeles'})
    const queries=[],errors=[],writes=[]
    const payload=structuredClone(fixture)
    payload.hosts[0].remark='<script>not-executable</script> '+ '长入口名称'.repeat(8)
    payload.nodes[0].name='Hong Kong / '+'节点名称'.repeat(8)
    if(options.empty){payload.nodes=[];payload.hosts=[];payload.rules=[];payload.orphanUsage=[]}
    if(options.loop){payload.rules[1].targetNodeUuids=[payload.nodes[1].uuid];payload.rules[1].targetPort=1234}
    await context.route('**/*',async route=>{
        const request=route.request(),target=new URL(request.url())
        if(target.origin!==endpoint.origin)return route.abort()
        if(!target.pathname.startsWith('/api/'))return route.continue()
        assert.equal(request.headers().authorization,'Bearer topology-fixture-only')
        if(request.method()!=='GET')writes.push(request.method())
        assert.equal(target.pathname,'/api/nodes/forwarding/topology')
        queries.push(Object.fromEntries(target.searchParams))
        return route.fulfill({status:options.error?500:200,contentType:'application/json',body:JSON.stringify(options.error?{message:'fixture-only'}:{response:payload})})
    })
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message))
    await page.clock.install({time:new Date('2026-10-17T10:00:00Z')})
    const target=new URL(url);if(options.light)target.searchParams.set('theme','light');if(options.en)target.searchParams.set('lang','en')
    await page.goto(target.href)
    return {page,context,queries,errors,writes,payload}
}
async function fits(page,width) {
    const measured=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}))
    assert(measured.scroll<=width+1,`No viewport overflow at ${width}: ${JSON.stringify(measured)}`)
    const graph=await page.getByTestId('topology-path').first().boundingBox()
    assert(graph.x>=0&&graph.x+graph.width<=width+1)
}
async function main() {
    const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']})
    try {
        for(const width of [1280,768,390,320]) {
            const f=await setup(browser,width);const {page}=f
            await page.getByText('关联至配置核心入站',{exact:true}).waitFor()
            assert.equal(await page.getByTestId('topology-hop').count(),3)
            await page.getByText('8 PiB',{exact:true}).first().waitFor()
            await page.getByText('共享入站归因，不代表独占用量',{exact:true}).waitFor()
            assert.equal(await page.locator('script').filter({hasText:/^not-executable$/}).count(),0)
            assert.deepEqual(f.queries[0],{start:'2026-10-17',end:'2026-10-17'})
            await fits(page,width)
            if(width<640) {
                const date=await page.getByLabel('用量日期（UTC）',{exact:true}).first().boundingBox()
                assert(date.width>=width-50,'Mobile date filter must use the full row, not a squeezed desktop column')
            }
            await page.screenshot({path:`${process.env.TOPOLOGY_SCREENSHOT_DIR||'/tmp'}/forwarding-topology-${width}.png`,fullPage:true})
            await page.getByRole('combobox',{name:'选择入口 / 转发规则',exact:true}).click()
            await page.getByRole('option',{name:/Unknown CDN alias/}).click()
            await page.getByText('入口节点未确认；不会用 Host 逻辑绑定替代实际入口',{exact:true}).first().waitFor()
            assert.equal(await page.getByTestId('topology-hop').count(),0,'Unknown entry must not invent a direct hop to the bound core')
            await page.getByRole('combobox',{name:'范围',exact:true}).click()
            await page.getByRole('option',{name:'转发规则链路',exact:true}).click()
            await page.getByText('关联至配置核心入站',{exact:true}).waitFor()
            await page.getByRole('combobox',{name:'筛选节点',exact:true}).click()
            await page.getByRole('option',{name:'fixture-node-2',exact:true}).click()
            assert.equal(await page.getByTestId('topology-hop').count(),2)
            await page.getByText('节点与规则明细',{exact:false}).click()
            await page.getByText('规则区间用量',{exact:true}).waitFor()
            await fits(page,width)
            await page.getByLabel('用量日期（UTC）',{exact:true}).first().click()
            await page.getByText(/7\s*天/,{exact:true}).click()
            await page.waitForTimeout(100)
            assert(f.queries.some(q=>q.start==='2026-10-11'&&q.end==='2026-10-17'),'Date quick presets must request the selected UTC range')
            assert.equal(f.writes.length,0);assert.deepEqual(f.errors,[])
            await f.context.close()
        }
        for(const options of [{light:true,en:true},{empty:true},{error:true},{loop:true}]) {
            const f=await setup(browser,390,options)
            if(options.error)await f.page.getByText('无法读取拓扑',{exact:true}).waitFor()
            else if(options.empty)await f.page.getByText(/当前范围没有 Host 或转发规则/).waitFor()
            else if(options.loop)await f.page.getByText('发现转发循环',{exact:true}).first().waitFor()
            else await f.page.getByText('Linked to configured core inbound',{exact:true}).waitFor()
            assert.deepEqual(f.errors,[]);assert.equal(f.writes.length,0)
            await f.context.close()
        }
        console.log('PASS real browser topology: four widths, dark/light, Chinese/English, branch and unknown entry semantics, BigInt/shared usage, filters, date shortcuts, loop/empty/error, escaped labels and GET-only requests')
    } finally {await browser.close()}
}
main().catch(e=>{console.error(e);process.exitCode=1})
