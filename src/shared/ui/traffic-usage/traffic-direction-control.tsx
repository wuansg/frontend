import { Center, Group, SegmentedControl, Text } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { TbArrowDown, TbArrowsUpDown, TbArrowUp } from 'react-icons/tb'

import { TrafficDirection } from '@shared/utils/traffic-usage'

export function TrafficDirectionControl({
    value,
    onChange
}: {
    value: TrafficDirection
    onChange: (value: TrafficDirection) => void
}) {
    const { t } = useTranslation()
    return (
        <SegmentedControl
            aria-label={t('traffic-usage.direction')}
            data={[
                {
                    value: 'total',
                    label: (
                        <Center>
                            <Group gap={6} wrap="nowrap">
                                <TbArrowsUpDown size={15} />
                                <Text fw={600} size="sm" span>
                                    {t('traffic-usage.total')}
                                </Text>
                            </Group>
                        </Center>
                    )
                },
                {
                    value: 'upload',
                    label: (
                        <Center>
                            <Group gap={5} wrap="nowrap">
                                <TbArrowUp size={15} />
                                <Text fw={600} size="sm" span>
                                    {t('traffic-usage.upload')}
                                </Text>
                            </Group>
                        </Center>
                    )
                },
                {
                    value: 'download',
                    label: (
                        <Center>
                            <Group gap={5} wrap="nowrap">
                                <TbArrowDown size={15} />
                                <Text fw={600} size="sm" span>
                                    {t('traffic-usage.download')}
                                </Text>
                            </Group>
                        </Center>
                    )
                }
            ]}
            fullWidth
            onChange={(next) => onChange(next as TrafficDirection)}
            radius="md"
            size="sm"
            value={value}
        />
    )
}
