import AdminProtectedLayout from '../admin/components/AdminProtectedLayout'
import AdminLoginPage from '../admin/pages/AdminLoginPage'
import AdminDashboard from '../admin/pages/AdminDashboard'

const adminRoutes = [
  {
    path: '/admin/login',
    element: <AdminLoginPage />,
  },
  {
    path: '/admin',
    element: <AdminProtectedLayout />,
    children: [
      {
        index: true,
        element: <AdminDashboard />,
      },
    ],
  },
]

export default adminRoutes





