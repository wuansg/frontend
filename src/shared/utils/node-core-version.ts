interface NodeVersions {
    core: 'SING_BOX' | 'XRAY' | null
    singBox: string | null
    xray: string
}

export function getNodeCoreVersion(versions: NodeVersions): string {
    if (versions.core === null) return '—'
    return versions.core === 'SING_BOX' ? (versions.singBox ?? '—') : versions.xray
}

export function getNodeCoreDisplay(versions: NodeVersions): string {
    if (versions.core === null) return '—'
    const coreName = versions.core === 'SING_BOX' ? 'sing-box' : 'Xray'

    return `${coreName} ${getNodeCoreVersion(versions)}`
}
