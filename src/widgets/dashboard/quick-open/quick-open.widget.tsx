import {
    ActionIcon,
    Badge,
    Button,
    Center,
    Group,
    Loader,
    Stack,
    TagsInput,
    Text,
    Tooltip
} from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { createSpotlight, Spotlight, useSpotlight } from '@mantine/spotlight'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { TbEdit, TbSearch, TbTags } from 'react-icons/tb'
import { useNavigate } from 'react-router'

import { instance, queryClient } from '@shared/api'

export type ManagementEntityType =
    | 'node'
    | 'host'
    | 'config-profile'
    | 'node-plugin'
    | 'shared-list'
    | 'subscription-template'
    | 'subpage-config'
    | 'internal-squad'
    | 'external-squad'

interface CatalogItem {
    type: ManagementEntityType
    id: string
    name: string
    tags: string[]
    href: string
    description: null | string
}

const [quickOpenStore, quickOpenActions] = createSpotlight()

export function QuickOpenWidget() {
    const navigate = useNavigate()
    const state = useSpotlight(quickOpenStore)
    const [query, setQuery] = useState('')
    const [debouncedQuery] = useDebouncedValue(query, 250)
    const parsed = useMemo(() => parseQuery(debouncedQuery), [debouncedQuery])
    const search = useQuery({
        queryKey: ['management-catalog', parsed],
        enabled: state.opened,
        staleTime: 10_000,
        queryFn: async () => {
            const response = await instance.get<{ response: { items: CatalogItem[] } }>(
                '/api/management/catalog/search',
                { params: { q: parsed.query, tag: parsed.tag, types: parsed.types, limit: 30 } }
            )
            return response.data.response.items
        }
    })

    const actions = (search.data ?? []).map((item) => ({
        id: `${item.type}:${item.id}`,
        label: item.name,
        description: item.description ?? item.type,
        keywords: [...item.tags, item.type],
        leftSection: <Badge variant="light">{typeLabel(item.type)}</Badge>,
        rightSection: (
            <Group gap={4} wrap="nowrap">
                {item.tags.slice(0, 2).map((tag) => (
                    <Badge color="gray" key={tag} size="xs" variant="outline">
                        {tag}
                    </Badge>
                ))}
                {item.type !== 'shared-list' && (
                    <ActionIcon
                        aria-label="Edit tags"
                        onClick={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            openTagsEditor(item)
                        }}
                        size="sm"
                        variant="subtle"
                    >
                        <TbEdit size={14} />
                    </ActionIcon>
                )}
            </Group>
        ),
        onClick: () => navigate(item.href)
    }))

    return (
        <>
            <Tooltip label="Quick Open (Ctrl/⌘ + K)" position="left">
                <ActionIcon
                    aria-label="Open management search"
                    onClick={quickOpenActions.open}
                    pos="fixed"
                    radius="xl"
                    size="lg"
                    style={{ bottom: 20, right: 20, zIndex: 190 }}
                    variant="filled"
                >
                    <TbSearch size={18} />
                </ActionIcon>
            </Tooltip>
            <Spotlight
                actions={actions}
                centered
                filter={(_value, items) => items}
                limit={30}
                maxHeight={430}
                nothingFound={
                    <Center h={180}>
                        <Stack align="center" gap="xs">
                            <TbSearch color="var(--mantine-color-gray-5)" size={32} />
                            <Text c="dimmed" size="sm">
                                No matching management objects
                            </Text>
                        </Stack>
                    </Center>
                }
                onQueryChange={setQuery}
                overlayProps={{ backgroundOpacity: 0.65, blur: 1 }}
                query={query}
                scrollable
                searchProps={{
                    leftSection: <TbSearch size={18} />,
                    rightSection: search.isFetching ? <Loader size="xs" /> : undefined,
                    placeholder: 'Quick Open — name, #tag, or type:node'
                }}
                shortcut={['mod + K']}
                store={quickOpenStore}
            />
        </>
    )
}

function openTagsEditor(item: CatalogItem) {
    modals.open({
        title: `Tags — ${item.name}`,
        children: <TagsEditor item={item} />
    })
}

function TagsEditor({ item }: { item: CatalogItem }) {
    const [tags, setTags] = useState(item.tags)
    const [saving, setSaving] = useState(false)
    const tagsQuery = useQuery({
        queryKey: ['management-tags', item.type],
        queryFn: async () => {
            const response = await instance.get<{ response: { tags: string[] } }>(
                `/api/management/catalog/${item.type}/tags`
            )
            return response.data.response.tags
        }
    })

    const save = async () => {
        setSaving(true)
        try {
            await instance.patch(`/api/management/catalog/${item.type}/${item.id}/tags`, { tags })
            await queryClient.invalidateQueries({ queryKey: ['management-catalog'] })
            await queryClient.invalidateQueries({ queryKey: ['management-tags', item.type] })
            notifications.show({ color: 'teal', message: 'Tags updated', title: 'Success' })
            modals.closeAll()
        } catch (error) {
            notifications.show({
                color: 'red',
                message: error instanceof Error ? error.message : 'Failed to update tags',
                title: 'Tag update failed'
            })
        } finally {
            setSaving(false)
        }
    }

    return (
        <Stack>
            <TagsInput
                data={tagsQuery.data ?? []}
                leftSection={<TbTags size={16} />}
                maxTags={20}
                onChange={setTags}
                value={tags}
            />
            <Button loading={saving} onClick={save}>
                Save tags
            </Button>
        </Stack>
    )
}

function parseQuery(value: string): { query: string; tag?: string; types?: string } {
    const parts = value.trim().split(/\s+/).filter(Boolean)
    let tag: string | undefined
    let types: string | undefined
    const query: string[] = []
    for (const part of parts) {
        if (part.startsWith('#') && part.length > 1) tag = part.slice(1)
        else if (part.startsWith('type:') && part.length > 5) types = normalizeType(part.slice(5))
        else query.push(part)
    }
    return { query: query.join(' '), tag, types }
}

function normalizeType(value: string): string {
    const aliases: Record<string, ManagementEntityType> = {
        node: 'node',
        host: 'host',
        profile: 'config-profile',
        plugin: 'node-plugin',
        list: 'shared-list',
        template: 'subscription-template',
        subpage: 'subpage-config',
        squad: 'internal-squad'
    }
    return aliases[value.toLowerCase()] ?? value.toLowerCase()
}

function typeLabel(type: ManagementEntityType): string {
    return type
        .split('-')
        .map((part) => part[0].toUpperCase() + part.slice(1))
        .join(' ')
}
