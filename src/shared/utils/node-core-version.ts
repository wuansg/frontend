interface NodeVersions {
    core: 'SING_BOX' | null
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
