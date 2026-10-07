import { SegmentedControl } from '@mantine/core'
import { useTranslation } from 'react-i18next'

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
                { value: 'total', label: t('traffic-usage.total') },
                { value: 'upload', label: `↑ ${t('traffic-usage.upload')}` },
                { value: 'download', label: `↓ ${t('traffic-usage.download')}` }
            ]}
            onChange={(value) => onChange(value as TrafficDirection)}
            value={value}
        />
    )
}
