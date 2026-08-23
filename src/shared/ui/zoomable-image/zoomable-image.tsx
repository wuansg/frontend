import type { Ref } from 'react'

import { UnstyledButton } from '@mantine/core'
import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { TbRestore, TbZoomIn, TbZoomOut } from 'react-icons/tb'

import classes from './zoomable-image.module.css'

interface IProps {
    alt: string
    className?: string
    ref?: Ref<HTMLImageElement>
    src: string
}

const MIN_SCALE = 0.5
const MAX_SCALE = 4
const SCALE_STEP = 0.25

export function ZoomableImage(props: IProps) {
    const { alt, className, ref, src } = props

    const [scale, setScale] = useState(1)

    useEffect(() => {
        setScale(1)
    }, [src])

    const zoomIn = () => setScale((current) => Math.min(MAX_SCALE, current + SCALE_STEP))
    const zoomOut = () => setScale((current) => Math.max(MIN_SCALE, current - SCALE_STEP))

    return (
        <div className={clsx(classes.root, className)}>
            <div className={classes.surface}>
                <div className={classes.content} style={{ width: `${scale * 100}%` }}>
                    <img alt={alt} className={classes.image} ref={ref} src={src} />
                </div>
            </div>

            <div className={classes.controlBar}>
                <div className={classes.controlGroup}>
                    <UnstyledButton
                        aria-label="Zoom in"
                        className={classes.controlButton}
                        disabled={scale >= MAX_SCALE}
                        onClick={zoomIn}
                    >
                        <TbZoomIn size={16} />
                    </UnstyledButton>

                    <UnstyledButton
                        aria-label="Zoom out"
                        className={classes.controlButton}
                        disabled={scale <= MIN_SCALE}
                        onClick={zoomOut}
                    >
                        <TbZoomOut size={16} />
                    </UnstyledButton>
                </div>

                <span className={classes.controlDivider} />

                <UnstyledButton
                    aria-label="Reset"
                    className={classes.controlButton}
                    disabled={scale === 1}
                    onClick={() => setScale(1)}
                >
                    <TbRestore size={16} />
                </UnstyledButton>
            </div>
        </div>
    )
}
