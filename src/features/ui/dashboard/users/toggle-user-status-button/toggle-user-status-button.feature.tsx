import { Loader, Menu } from '@mantine/core'
import { GetUserByIdCommand, USERS_STATUS } from '@remnawave/backend-contract'
import { useTranslation } from 'react-i18next'
import { PiCellSignalFullDuotone, PiCellSignalSlashDuotone } from 'react-icons/pi'

import { queryClient } from '@shared/api'
import { useDisableUser, useEnableUser, usersQueryKeys } from '@shared/api/hooks'

interface IProps {
    user: GetUserByIdCommand.Response['response']
}

export function ToggleUserStatusButtonFeature(props: IProps) {
    const { t } = useTranslation()

    const { user } = props
    const { id } = user

    const { mutate: disableUser, isPending: isDisableUserPending } = useDisableUser({
        mutationFns: {
            onSuccess: (data) => {
                queryClient.setQueryData(usersQueryKeys.getUserById({ userId: id }).queryKey, data)
            }
        }
    })

    const { mutate: enableUser, isPending: isEnableUserPending } = useEnableUser({
        mutationFns: {
            onSuccess: (data) => {
                queryClient.setQueryData(usersQueryKeys.getUserById({ userId: id }).queryKey, data)
            }
        }
    })

    const isDisabled = user.status === USERS_STATUS.DISABLED
    const color = isDisabled ? 'teal' : 'red'
    const buttonLabel = isDisabled ? t('common.enable') : t('common.disable')
    const icon = isDisabled ? (
        <PiCellSignalFullDuotone size="16px" />
    ) : (
        <PiCellSignalSlashDuotone size="16px" />
    )

    const handleToggleUserStatus = async () => {
        if (user.status !== USERS_STATUS.DISABLED) {
            disableUser({ route: { userId: id } })
        } else {
            enableUser({ route: { userId: id } })
        }
    }

    return (
        <Menu.Item
            color={color}
            leftSection={
                isDisableUserPending || isEnableUserPending ? (
                    <Loader color={color} size="1rem" />
                ) : (
                    icon
                )
            }
            onClick={handleToggleUserStatus}
        >
            {buttonLabel}
        </Menu.Item>
    )
}
