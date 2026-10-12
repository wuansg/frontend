export function nodeDirtyFields<T extends Record<string, unknown>>(
    initial: T,
    current: T
): Partial<T> {
    const normalized = (key: string, value: unknown): unknown => {
        if ((key === 'name' || key === 'address') && typeof value === 'string') return value.trim()
        if (key === 'configProfile' && value && typeof value === 'object') {
            const profile = value as { activeConfigProfileUuid?: string; activeInbounds?: string[] }
            return {
                activeConfigProfileUuid: profile.activeConfigProfileUuid ?? '',
                activeInbounds: [...(profile.activeInbounds ?? [])].sort()
            }
        }
        return value
    }
    return Object.fromEntries(
        Object.entries(current)
            .filter(
                ([key, value]) =>
                    key !== 'uuid' &&
                    JSON.stringify(normalized(key, value)) !==
                        JSON.stringify(normalized(key, initial[key]))
            )
            .map(([key, value]) => [key, normalized(key, value)])
    ) as Partial<T>
}
