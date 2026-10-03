declare global {
    interface Window {
        Go: typeof window.Go
        onWasmInitialized?: () => void
    }
}

export {}
