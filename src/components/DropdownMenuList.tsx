import type { ComponentPropsWithRef, ReactNode } from 'react'
import { useDropdownGlide } from './useDropdownGlide'
import './Input.css'

type ListProps = Pick<ComponentPropsWithRef<'div'>, 'ref' | 'className' | 'children'>

/** Shared presentation for selection dropdowns and action menus; Base UI owns their semantics. */
export function DropdownMenuList({
  children,
  items,
  itemRole = 'option',
  renderList = (props) => <div {...props} />,
}: {
  children: ReactNode
  items: readonly unknown[]
  itemRole?: 'option' | 'menuitem'
  renderList?: (props: ListProps) => ReactNode
}) {
  const { listRef, highlightRef } = useDropdownGlide(items, itemRole)
  return renderList({
    ref: listRef,
    className: 'lars-input__list',
    children: <>
      <div ref={highlightRef} className="lars-input__option-glide" aria-hidden="true" />
      {children}
    </>,
  })
}
