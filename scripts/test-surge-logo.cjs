const assert = require('node:assert/strict')
const fs = require('node:fs')
const Module = require('node:module')
const path = require('node:path')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const { MantineProvider } = require('@mantine/core')
const ts = require('typescript')
const root = path.resolve(__dirname, '..')
const filename = path.join(root, 'src/shared/ui/logos/surge-logo.tsx')
const source = fs.readFileSync(filename, 'utf8')
assert.ok(!source.includes('data:image/'), 'Use vector geometry, not a fixed-color bitmap')

// Load only this TSX component; render it with the actual Mantine/React SSR runtime.
const m = new Module(filename, module)
m.filename = filename
m.paths = Module._nodeModulePaths(path.dirname(filename))
m._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename)
const { SurgeLogo } = m.exports
for (const colorScheme of ['dark', 'light']) {
    for (const size of [16, 20, 24, 28, '1.5rem']) {
        const color = colorScheme === 'dark' ? '#c1c2c5' : '#495057'
        const html = renderToStaticMarkup(React.createElement(MantineProvider, { forceColorScheme: colorScheme }, React.createElement('span', { style: { color } }, React.createElement(SurgeLogo, { size, style: { opacity: 0.75 }, 'data-testid': 'surge-logo' }))))
        const svg = html.match(/<svg\b[^>]*>[\s\S]*?<\/svg>/)[0]
        const cssSize = typeof size === 'number' ? size + 'px' : size
        assert.ok(html.includes('<svg'))
        assert.ok(html.includes('viewBox="0 0 256 256"'))
        assert.ok(html.includes('width:' + cssSize))
        assert.ok(html.includes('height:' + cssSize))
        assert.ok(html.includes('opacity:0.75'))
        assert.ok(html.includes('flex-shrink:0'))
        assert.ok(html.includes('data-testid="surge-logo"'))
        assert.ok(html.includes('color:' + color))
        assert.ok(svg.includes('stroke="currentColor"'), 'Inherit the same color as neighboring icons')
        assert.ok(svg.includes('fill="none"'), 'Keep the background transparent')
        assert.ok(svg.includes('<circle cx="128" cy="128" r="118" stroke-width="18"'))
        assert.ok(svg.includes('d="M74 145v14 M101 122v56 M128 83v84 M155 71v57 M182 91v15"'))
        assert.ok(svg.includes('stroke-linecap="round"'))
        assert.ok(!/<(?:image|filter|mask)\b|\bhref=|#[0-9a-f]{3,8}\b|rgba?\(/i.test(svg), 'No bitmap, external asset, filter or hardcoded color')
    }
}
const overridden = renderToStaticMarkup(React.createElement(MantineProvider, null, React.createElement(SurgeLogo, { size: 24, style: { color: 'rebeccapurple', width: '2rem' } })))
assert.ok(overridden.includes('stroke="currentColor"'))
assert.ok(overridden.includes('color:rebeccapurple'))
assert.ok(overridden.includes('width:2rem'))
const themed = renderToStaticMarkup(React.createElement(MantineProvider, null, React.createElement(SurgeLogo, { c: 'red' })))
assert.ok(themed.includes('stroke="currentColor"'))
assert.ok(themed.includes('color:var(--mantine-color-red-text)'))

function nodes(node, predicate) {
    const result = predicate(node) ? [node] : []
    ts.forEachChild(node, child => { result.push(...nodes(child, predicate)) })
    return result
}
const files = [
    'src/app/layouts/dashboard/main-layout/menu-sections/desktop-menu-sections.ts',
    'src/app/layouts/dashboard/main-layout/menu-sections/mobile-menu-sections.ts',
    'src/shared/ui/get-core-logo-from-type.tsx',
    'src/widgets/dashboard/templates/templates-grid/templates-grid.widget.tsx',
    'src/shared/_modals/external-squads/external-squads-drawer/tabs/external-squads-templates.tab.widget.tsx',
    'src/shared/ui/forms/hosts/base-host-form/base-host-form.tsx'
]
for (const file of files) {
    const contents = fs.readFileSync(path.join(root, file), 'utf8')
    const ast = ts.createSourceFile(file, contents, ts.ScriptTarget.Latest, true)
    const surgeEntry = nodes(ast, node => {
        if (ts.isCaseClause(node)) return (node.expression.getText(ast) === "'SURGE'" || node.expression.getText(ast) === 'SUBSCRIPTION_TEMPLATE_TYPE.SURGE') && node.statements.some(s => ts.isReturnStatement(s) && s.expression && (ts.isJsxElement(s.expression) || ts.isJsxSelfClosingElement(s.expression)))
        if (ts.isPropertyAssignment(node)) return node.name.getText(ast) === '[SUBSCRIPTION_TEMPLATE_TYPE.SURGE]' && ts.isObjectLiteralExpression(node.initializer) && node.initializer.properties.some(p => ts.isPropertyAssignment(p) && p.name.getText(ast) === 'icon')
        if (ts.isObjectLiteralExpression(node)) return node.properties.some(p => ts.isPropertyAssignment(p) && p.name.getText(ast) === 'id' && p.initializer.getText(ast) === "'surge'")
        return false
    })
    assert.ok(surgeEntry.length > 0, 'Find Surge entry: ' + file)
    assert.ok(surgeEntry.every(node => /\bSurgeLogo\b/.test(node.getText(ast))), 'Use the shared official Surge logo: ' + file)
}
assert.ok(fs.readFileSync(path.join(root, 'src/shared/ui/logos/index.ts'), 'utf8').includes("export * from './surge-logo'"))
console.log('PASS monochrome Surge ring/waveform, inherited colors, light/dark SSR, sizes/styles, offline rendering and six consistent icon entry points')
