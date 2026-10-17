import { Box, BoxProps, ElementProps } from '@mantine/core'

interface LogoProps
    extends ElementProps<'svg', keyof BoxProps>, Omit<BoxProps, 'children' | 'ref'> {
    size?: number | string
}

// Monochrome rendition of Surge's official ring and waveform, matching the other client logos.
// https://nssurge.com/static/media/surge-mac-icon.b58bcbd47e5747ba3284.png
export function SurgeLogo({ size = 20, style, ...props }: LogoProps) {
    return (
        <Box
            aria-hidden="true"
            component="svg"
            fill="none"
            focusable="false"
            preserveAspectRatio="xMidYMid meet"
            stroke="currentColor"
            style={{
                width: size,
                height: size,
                display: 'inline-block',
                verticalAlign: 'middle',
                flexShrink: 0,
                ...style
            }}
            viewBox="0 0 256 256"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <circle cx="128" cy="128" r="118" strokeWidth="18" />
            <path
                d="M74 145v14 M101 122v56 M128 83v84 M155 71v57 M182 91v15"
                strokeLinecap="round"
                strokeWidth="16"
            />
        </Box>
    )
}
