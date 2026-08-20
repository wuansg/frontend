export interface IProps {
    isConnected: boolean
    isConnecting: boolean
    isDisabled: boolean
    nodeUuid: string
    runtimeMode?: 'CORE_ACTIVE' | 'FORWARDING_ONLY' | 'IDLE' | 'DEGRADED' | null
    style?: React.CSSProperties
}
