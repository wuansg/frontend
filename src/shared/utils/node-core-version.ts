interface NodeVersions {
    // Keep XRAY in the input until the published backend contract catches up.
    core: 'SING_BOX' | 'XRAY' | null
    singBox: string | null
}

export function getNodeCoreVersion(versions: NodeVersions): string {
    if (versions.core === null) return '—'
    return versions.singBox ?? '—'
}

export function getNodeCoreDisplay(versions: NodeVersions): string {
    if (versions.core === null) return '—'
    return `sing-box ${getNodeCoreVersion(versions)}`
}
