import { ActionIcon, Collapse, Divider, Group, UnstyledButton } from '@mantine/core'
import { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { TbChevronDown } from 'react-icons/tb'

import { SectionCardRoot } from './section-card.root'
import { SectionCardSection } from './section-card.section'

interface ISectionCardCollapsibleProps {
    /** Controls kept visible next to the toggle, e.g. status badges. */
    aside?: ReactNode
    children: ReactNode
    expanded: boolean
    header: ReactNode
    onToggle: () => void
}

/**
 * A section card whose body folds under its header. The body stays mounted
 * while folded, so form inputs inside keep their state.
 */
export function SectionCardCollapsible({
    aside,
    children,
    expanded,
    header,
    onToggle
}: ISectionCardCollapsibleProps) {
    const { t } = useTranslation()

    return (
        <SectionCardRoot>
            <SectionCardSection>
                <Group gap="xs" justify="space-between" wrap="nowrap">
                    <UnstyledButton
                        aria-expanded={expanded}
                        onClick={onToggle}
                        style={{ flex: 1, minWidth: 0 }}
                    >
                        {header}
                    </UnstyledButton>

                    <Group gap={6} style={{ flexShrink: 0 }} wrap="nowrap">
                        {aside}
                        <ActionIcon
                            aria-expanded={expanded}
                            aria-label={t(expanded ? 'common.collapse' : 'common.expand')}
                            color="gray"
                            onClick={onToggle}
                            size="md"
                            variant="subtle"
                        >
                            <TbChevronDown
                                size={16}
                                style={{
                                    transform: expanded ? 'rotate(180deg)' : undefined,
                                    transition: 'transform 150ms ease'
                                }}
                            />
                        </ActionIcon>
                    </Group>
                </Group>

                <Collapse expanded={expanded}>
                    <Divider my="md" style={{ opacity: 0.3 }} />
                    {children}
                </Collapse>
            </SectionCardSection>
        </SectionCardRoot>
    )
}
