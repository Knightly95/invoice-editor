import { Button } from 'antd'
import type { ButtonProps } from 'antd'
import { useHref, useLinkClickHandler } from 'react-router-dom'

type LinkButtonProps = Omit<ButtonProps, 'href' | 'onClick'> & {
  /** Route path inside the app, for example `/invoices/new`. */
  to: string
}

/**
 * An Ant Design button that navigates with the router.
 *
 * A plain `href` on `Button` skips the router's `basename`, so the link breaks
 * when the app is served from a sub-path (for example on GitHub Pages). This
 * component resolves the real URL and navigates on the client, while keeping
 * a normal link for "open in new tab".
 */
const LinkButton = ({ to, disabled, ...buttonProps }: LinkButtonProps) => {
  const href = useHref(to)
  const handleClick = useLinkClickHandler<HTMLElement>(to)

  return (
    <Button
      {...buttonProps}
      disabled={disabled}
      href={disabled ? undefined : href}
      onClick={disabled ? undefined : handleClick}
    />
  )
}

export default LinkButton
