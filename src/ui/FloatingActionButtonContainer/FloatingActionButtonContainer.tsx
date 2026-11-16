import { PropsWithChildren } from 'react'
import './FloatingActionButtonContainer.css'

const FloatingActionButtonContainer = ({ children }: PropsWithChildren) => {
  return <div className="fab-container">{children}</div>
}

export default FloatingActionButtonContainer
