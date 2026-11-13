import {
    ActionIcon,
    Badge,
    Card,
    Center,
    Group,
    ScrollArea,
    Skeleton,
    Stack,
    Text,
    TextInput,
    ThemeIcon
} from '@mantine/core'
import { ReactNode, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PiEmpty } from 'react-icons/pi'
import { TbSearch, TbTrophy, TbX } from 'react-icons/tb'
import { Virtuoso } from 'react-virtuoso'

import styles from './leaderboard-item-card.module.css'
import { LeaderboardItemCardShared } from './leaderboard-item-card.shared'

const LoadingMoreFooter = () => (
    <Stack gap={6}>
        {Array.from({ length: 3 }, (_, i) => (
            <Skeleton height={38} key={`more-${i}`} />
        ))}
    </Stack>
)

export interface ITopLeaderboardItem {
    color: string
    countryCode?: string
    name: string
    total: number
    uuid?: string
}

interface IProps<T extends ITopLeaderboardItem> {
    emptyText: string
    formatValue?: (value: number) => string
    isFetchingMore?: boolean
    isLoading: boolean
    items: T[] | undefined
    maxHeight?: number
    onEndReached?: () => void
    onItemClick?: (item: T) => void
    renderCountryFlag?: (item: T) => ReactNode
    skeletonCount?: number
    wrapper?: (children: ReactNode) => ReactNode
    ordered?: boolean
    virtualized?: boolean
    title?: string
    showRank?: boolean
    showShare?: boolean
    searchable?: boolean
}

export function TopLeaderboardCardShared<T extends ITopLeaderboardItem>(props: IProps<T>) {
    const {
        items,
        onItemClick,
        isLoading,
        emptyText,
        renderCountryFlag,
        maxHeight,
        skeletonCount = 5,
        formatValue,
        wrapper,
        ordered = true,
        onEndReached,
        isFetchingMore,
        virtualized = false,
        title,
        showRank = false,
        showShare = false,
        searchable = false
    } = props

    const { t } = useTranslation()
    const [searchQuery, setSearchQuery] = useState('')

    let maxTraffic = 1
    let sumTraffic = 0
    if (items && items.length > 0) {
        if (ordered) {
            maxTraffic = items[0].total
        } else {
            maxTraffic = items.reduce((max, item) => Math.max(max, item.total), 1)
        }
        if (showShare) {
            sumTraffic = items.reduce((sum, item) => sum + Math.max(0, item.total), 0)
        }
    }

    const normalizedQuery = searchQuery.trim().toLowerCase()
    const indexedItems = (items ?? []).map((item, idx) => ({
        item,
        rank: ordered && showRank ? idx + 1 : undefined,
        sharePercent:
            showShare && sumTraffic > 0 ? (Math.max(0, item.total) / sumTraffic) * 100 : undefined
    }))

    const visibleItems = normalizedQuery
        ? indexedItems.filter(({ item }) => item.name.toLowerCase().includes(normalizedQuery))
        : indexedItems

    const showSearchInput = searchable && ((items?.length ?? 0) >= 6 || searchQuery.length > 0)

    const content = (
        <Stack gap={6}>
            {visibleItems.map(({ item, rank, sharePercent }) => (
                <LeaderboardItemCardShared
                    color={item.color}
                    countryFlag={renderCountryFlag?.(item)}
                    formatValue={formatValue}
                    key={item.uuid ?? item.name}
                    name={item.name}
                    onItemClick={onItemClick ? () => onItemClick(item) : undefined}
                    rank={rank}
                    sharePercent={sharePercent}
                    total={item.total}
                    uuid={item.uuid}
                    value={maxTraffic}
                />
            ))}
        </Stack>
    )

    const rawMinHeight = skeletonCount * 38 + (skeletonCount - 1) * 6
    const contentMinHeight = maxHeight ? Math.min(rawMinHeight, maxHeight) : rawMinHeight

    const innerContent = (
        <Stack gap={0} style={{ flex: 1 }}>
            {(title || showSearchInput) && (
                <Group
                    align="center"
                    className={styles.cardHeader}
                    gap="xs"
                    justify="space-between"
                    wrap="wrap"
                >
                    {title && (
                        <Group gap="xs" style={{ minWidth: 0 }} wrap="nowrap">
                            <ThemeIcon color="cyan" radius="md" size="md" variant="light">
                                <TbTrophy size={16} />
                            </ThemeIcon>
                            <Text fw={650} size="sm" truncate>
                                {title}
                            </Text>
                            {!isLoading && items && (
                                <Badge
                                    className={styles.tabular}
                                    color="cyan"
                                    radius="sm"
                                    size="xs"
                                    variant="light"
                                >
                                    {visibleItems.length}
                                </Badge>
                            )}
                        </Group>
                    )}

                    {showSearchInput && (
                        <TextInput
                            leftSection={<TbSearch size={14} />}
                            onChange={(event) => setSearchQuery(event.currentTarget.value)}
                            placeholder={t('traffic-usage.search-placeholder')}
                            radius="md"
                            rightSection={
                                searchQuery ? (
                                    <ActionIcon
                                        color="gray"
                                        onClick={() => setSearchQuery('')}
                                        size="xs"
                                        variant="subtle"
                                    >
                                        <TbX size={12} />
                                    </ActionIcon>
                                ) : undefined
                            }
                            size="xs"
                            style={{ flex: '0 1 180px', minWidth: 140 }}
                            value={searchQuery}
                        />
                    )}
                </Group>
            )}

            <Stack gap="sm" mih={contentMinHeight} style={{ flex: 1 }}>
                {isLoading && (
                    <Stack gap={6}>
                        {Array.from({ length: Math.min(skeletonCount, 8) }, (_, i) => (
                            <Skeleton height={38} key={i} radius="sm" />
                        ))}
                    </Stack>
                )}

                {!isLoading && visibleItems.length > 0 && virtualized && (
                    <Virtuoso
                        components={{ Footer: isFetchingMore ? LoadingMoreFooter : undefined }}
                        computeItemKey={(_, entry) => entry.item.uuid ?? entry.item.name}
                        data={visibleItems}
                        endReached={onEndReached}
                        increaseViewportBy={200}
                        itemContent={(_, { item, rank, sharePercent }) => (
                            <div style={{ paddingBottom: 6 }}>
                                <LeaderboardItemCardShared
                                    color={item.color}
                                    countryFlag={renderCountryFlag?.(item)}
                                    formatValue={formatValue}
                                    name={item.name}
                                    onItemClick={onItemClick ? () => onItemClick(item) : undefined}
                                    rank={rank}
                                    sharePercent={sharePercent}
                                    total={item.total}
                                    uuid={item.uuid}
                                    value={maxTraffic}
                                />
                            </div>
                        )}
                        style={{ height: maxHeight ?? 400 }}
                    />
                )}

                {!isLoading && visibleItems.length > 0 && !virtualized && (
                    <>
                        {maxHeight ? (
                            <ScrollArea.Autosize
                                mah={maxHeight}
                                scrollbars="y"
                                styles={{ content: { minWidth: 0 }, scrollbar: { width: '8px' } }}
                                type="hover"
                            >
                                {content}
                            </ScrollArea.Autosize>
                        ) : (
                            content
                        )}
                    </>
                )}

                {!isLoading && visibleItems.length === 0 && (
                    <Center flex={1} py="md">
                        <Stack align="center" gap={8}>
                            <ThemeIcon color="gray" radius="xl" size="xl" variant="light">
                                <PiEmpty size={22} />
                            </ThemeIcon>
                            <Text c="dimmed" size="sm">
                                {emptyText}
                            </Text>
                        </Stack>
                    </Center>
                )}
            </Stack>
        </Stack>
    )

    const defaultWrapper = (children: ReactNode) => (
        <Card className={styles.card} p="md" radius="md">
            {children}
        </Card>
    )

    return wrapper ? wrapper(innerContent) : defaultWrapper(innerContent)
}
