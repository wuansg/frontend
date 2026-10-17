const assert = require('node:assert/strict')
const { createHash } = require('node:crypto')
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
const png = Buffer.from(source.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/)[1], 'base64')
assert.equal(createHash('sha256').update(png).digest('hex'), '579c7fc9e1022003d88cedc2b4632f90236dfd90c9c280c166d69c147e99e684', 'Keep the official icon unchanged')
assert.equal(png.readUInt32BE(16), 256)
assert.equal(png.readUInt32BE(20), 256)

// Load only this TSX component; render it with the actual Mantine/React SSR runtime.
const m = new Module(filename, module)
m.filename = filename
m.paths = Module._nodeModulePaths(path.dirname(filename))
m._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename)
const { SurgeLogo } = m.exports
for (const colorScheme of ['dark', 'light']) {
    for (const size of [16, 20, 24, 28, '1.5rem']) {
        const html = renderToStaticMarkup(React.createElement(MantineProvider, { forceColorScheme: colorScheme }, React.createElement(SurgeLogo, { size, style: { opacity: 0.75 }, 'data-testid': 'surge-logo' })))
        const cssSize = typeof size === 'number' ? size + 'px' : size
        assert.ok(html.includes('<svg'))
        assert.ok(html.includes('viewBox="0 0 256 256"'))
        assert.ok(html.includes('width:' + cssSize))
        assert.ok(html.includes('height:' + cssSize))
        assert.ok(html.includes('opacity:0.75'))
        assert.ok(html.includes('flex-shrink:0'))
        assert.ok(html.includes('data-testid="surge-logo"'))
        assert.ok(html.includes('<image'))
        assert.ok(html.includes('href="data:image/png;base64,'))
        assert.ok(!html.includes('href="https:'), 'Do not depend on the official server at runtime')
    }
}

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
console.log('PASS official Surge PNG integrity, light/dark SSR, sizes/styles, offline rendering and six consistent icon entry points')
