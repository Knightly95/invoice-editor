import { NavLink } from 'react-router-dom'
import { Layout, Typography } from 'antd'
import './Navbar.css'

const { Header } = Layout
const { Text } = Typography

export function Navbar(): JSX.Element {
  return (
    <Header className="app-navbar" style={{ background: '#1e1b4b' }}>
      <div className="app-navbar__inner">
        <div className="app-navbar__brand">
          <Text className="app-navbar__logo">Invoice Editor</Text>
        </div>
        <nav className="app-navbar__menu">
          <NavLink
            to="/invoices"
            className={({ isActive }) =>
              `app-navbar__link${isActive ? ' app-navbar__link--active' : ''}`
            }
          >
            Invoices
          </NavLink>
        </nav>
      </div>
    </Header>
  )
}
