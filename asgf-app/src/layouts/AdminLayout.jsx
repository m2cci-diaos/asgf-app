import { Outlet } from 'react-router-dom'
import '../admin/index.css'
import '../admin/App.css'

export default function AdminLayout({ children }) {
  return <div className="app-container">{children ?? <Outlet />}</div>
}

