import { Button, Stack } from '@mantine/core'
import { UsersMetrics } from '@widgets/dashboard/users/users-metrics'
import { UserTableWidget } from '@widgets/dashboard/users/users-table'
import { useTranslation } from 'react-i18next'
import { PiUsersDuotone } from 'react-icons/pi'
import { TbPlus } from 'react-icons/tb'

import { showModal } from '@shared/_modals/show-modal'
import { Page } from '@shared/ui/page'
import { PageHeaderShared } from '@shared/ui/page-header'

export default function UsersPageComponent() {
    const { t } = useTranslation()

    return (
        <Page title={t('constants.users')}>
            <Stack gap="sm">
                <PageHeaderShared
                    actions={
                        <Button
                            color="teal"
                            leftSection={<TbPlus size={18} />}
                            onClick={() => showModal('users_createUserModal')}
                            size="sm"
                            variant="filled"
                        >
                            {t('action-group.feature.new-user')}
                        </Button>
                    }
                    icon={<PiUsersDuotone size={24} />}
                    mb={0}
                    title={t('constants.users')}
                    wrapActions
                />

                <UsersMetrics />

                <UserTableWidget />
            </Stack>
        </Page>
    )
}
