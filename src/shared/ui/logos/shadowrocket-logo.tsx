import type { IconBaseProps } from 'react-icons'

import { TbRocket } from 'react-icons/tb'

// Shadowrocket has no monochrome brand mark; a rocket keeps it recognisable next to the
// other client logos.
export function ShadowrocketLogo({ size = 20, style, ...props }: IconBaseProps) {
    return (
        <TbRocket
            aria-hidden="true"
            focusable="false"
            size={size}
            style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
            {...props}
        />
    )
}
