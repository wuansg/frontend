import consola from 'consola/browser'
import { createContext, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { clearQueryClient } from '@shared/api'
import { logoutEvents } from '@shared/emitters'
import { resetAllStores } from '@shared/hocs/store-wrapper'

import { removeToken, useToken } from '@entities/auth'

interface AuthContextValues {
    isAuthenticated: boolean
    isInitialized: boolean
    setIsAuthenticated: (isAuthenticated: boolean) => void
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValues | null>(null)

interface AuthProviderProps {
    children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [isInitialized, setIsInitialized] = useState(false)
    const isLoggingOutRef = useRef(false)
    const token = useToken()

    const logoutUser = useCallback(() => {
        if (isLoggingOutRef.current) {
            return
        }

        try {
            isLoggingOutRef.current = true
            setIsAuthenticated(false)
            removeToken()
            resetAllStores()
            clearQueryClient()
        } finally {
            isLoggingOutRef.current = false
        }
    }, [])

    useEffect(() => {
        const unsubscribe = logoutEvents.subscribe(() => {
            logoutUser()
        })

        return unsubscribe
    }, [logoutUser])

    useEffect(() => {
        ;(async () => {
            if (!token) {
                setIsAuthenticated(false)
                setIsInitialized(true)
                return
            }

            try {
                setIsAuthenticated(true)
                isLoggingOutRef.current = false
            } catch (error) {
                consola.error(error)
                logoutUser()
            } finally {
                setIsInitialized(true)
            }
        })()
    }, [])

    const value = useMemo(
        () => ({ isAuthenticated, isInitialized, setIsAuthenticated }),
        [isAuthenticated, isInitialized]
    )

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
