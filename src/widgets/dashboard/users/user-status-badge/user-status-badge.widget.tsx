import { Badge, BadgeProps } from '@mantine/core'
import { TUsersStatus, USERS_STATUS } from '@remnawave/backend-contract'
import { useTranslation } from 'react-i18next'
import { PiClockCountdown, PiClockUser, PiProhibit, PiPulse } from 'react-icons/pi'

import { getUserStatusLabel } from '@shared/constants/forms/user-status.constants'

interface IProps extends Omit<BadgeProps, 'children' | 'color'> {
    status: TUsersStatus
}

export function UserStatusBadge({ status, ...props }: IProps) {
    const { t } = useTranslation()
    let icon: React.ReactNode
    let color: BadgeProps['color'] = 'gray'
    switch (status) {
        case USERS_STATUS.ACTIVE:
            icon = <PiPulse size={16} />
            color = 'teal'
            break
        case USERS_STATUS.DISABLED:
            icon = <PiProhibit size={16} />
            color = 'shaded-gray'
            break
        case USERS_STATUS.EXPIRED:
            icon = <PiClockUser size={16} />
            color = 'red'
            break
        case USERS_STATUS.LIMITED:
            icon = <PiClockCountdown size={16} />
            color = 'orange'
            break
        default:
            break
    }

    return (
        <Badge color={color} leftSection={icon} size="lg" variant="soft" {...props}>
            {getUserStatusLabel(status, t)}
        </Badge>
    )
}
