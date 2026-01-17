import { createBrowserRouter } from 'react-router-dom'
import publicRoutes from './publicRoutes'
import adminRoutes from './adminRoutes'

const router = createBrowserRouter([
  ...publicRoutes,
  ...adminRoutes,
  {
    path: '*',
    element: (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          fontFamily: 'Inter, system-ui, sans-serif',
          textAlign: 'center',
        }}
      >
        <h1>404</h1>
        <p>La page demandée est introuvable.</p>
        <a href="/" style={{ color: '#0066CC', textDecoration: 'underline' }}>
          Revenir à l’accueil
        </a>
      </div>
    ),
  },
])

export default router
















