export type TrafficDirection = 'total' | 'upload' | 'download'

interface DirectionalTraffic {
    total: number
    upload: number
    download: number
}

export function selectTraffic<T extends DirectionalTraffic>(
    items: T[] | undefined,
    direction: TrafficDirection
): T[] | undefined {
    return items
        ?.map((item) => ({ ...item, total: item[direction] }))
        .filter((item) => item.total > 0)
        .sort((a, b) => b.total - a.total)
}

export function selectTrafficSeries<
    T extends DirectionalTraffic & { data: number[]; uploadData: number[]; downloadData: number[] }
>(items: T[] | undefined, direction: TrafficDirection): T[] | undefined {
    return selectTraffic(items, direction)?.map((item) => ({
        ...item,
        data:
            direction === 'upload'
                ? item.uploadData
                : direction === 'download'
                  ? item.downloadData
                  : item.data
    }))
}

export function summarizeTraffic(
    totalData: number[] = [],
    uploadData?: number[],
    downloadData?: number[]
) {
    const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)
    const total = sum(totalData)
    const upload = sum(uploadData ?? [])
    const download = sum(downloadData ?? [])
    const directionalAvailable =
        uploadData?.length === totalData.length && downloadData?.length === totalData.length
    // Summation of large byte counters can differ by a final floating-point bit.
    const remainder = total - upload - download
    const tolerance = Math.max(1, Math.abs(total) * Number.EPSILON * 8)
    return {
        total,
        upload,
        download,
        directionalAvailable,
        undirected: directionalAvailable && remainder > tolerance ? remainder : 0,
        inconsistent: directionalAvailable && remainder < -tolerance
    }
}
