import { Accordion, Code, Text, ThemeIcon } from '@mantine/core'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { PiNetworkSlash } from 'react-icons/pi'

import surface from '@shared/ui/node-panel-surface.module.css'

import { IProps } from './interfaces'

export const ModalAccordionWidget = (props: IProps) => {
    const { t } = useTranslation()

    const { node } = props

    if (!node || !node.lastStatusMessage) {
        return null
    }

    return (
        <Accordion key={node.uuid} radius="md" variant="separated">
            <Accordion.Item className={clsx(surface.subPanel, surface.accentError)} value="error">
                <Accordion.Control
                    icon={
                        <ThemeIcon color="red" radius="md" size="md" variant="light">
                            <PiNetworkSlash size={16} />
                        </ThemeIcon>
                    }
                >
                    <Text c="red.3" fw={600} size="sm">
                        {t('error-accordeon.widget.last-error-message')}
                    </Text>
                </Accordion.Control>
                <Accordion.Panel>
                    <Code
                        block
                        color="var(--mantine-color-red-light)"
                        fz="xs"
                        style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                    >
                        {node.lastStatusMessage}
                    </Code>
                </Accordion.Panel>
            </Accordion.Item>
        </Accordion>
    )
}
