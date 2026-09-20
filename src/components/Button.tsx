import { Button as BaseButton } from '@base-ui/react/button'
import type { ComponentProps } from 'react'
import './Button.css'

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger'
export type ButtonShape = 'full' | 'neat'

export type ButtonProps = Omit<ComponentProps<typeof BaseButton>, 'className'> & {
  className?: string
  iconOnly?: boolean
  shape?: ButtonShape
  variant?: ButtonVariant
}

export function Button({
  className = '',
  iconOnly = false,
  shape = 'full',
  variant = 'primary',
  ...props
}: ButtonProps) {
  return (
    <BaseButton
      className={`lars-button lars-button--${variant} lars-button--${shape}${iconOnly ? ' lars-button--icon-only' : ''}${className ? ` ${className}` : ''}`}
      {...props}
    />
  )
}
