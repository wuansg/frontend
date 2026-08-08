interface NodeVersions {
    core: 'SING_BOX' | 'XRAY'
    singBox: string | null
    xray: string
}

export function getNodeCoreVersion(versions: NodeVersions): string {
    return versions.core === 'SING_BOX' ? (versions.singBox ?? '—') : versions.xray
}

export function getNodeCoreDisplay(versions: NodeVersions): string {
    const coreName = versions.core === 'SING_BOX' ? 'sing-box' : 'Xray'

    return `${coreName} ${getNodeCoreVersion(versions)}`
}
