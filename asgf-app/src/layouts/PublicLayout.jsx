import { Outlet } from 'react-router-dom'
import Header from '../public/components/Header'
import Footer from '../public/components/Footer'
import ScrollToTop from '../components/ScrollToTop'
import '../public/styles/variables.css'
import '../public/styles/style.css'
import '../public/styles/responsive.css'

export default function PublicLayout() {
  return (
    <>
      <ScrollToTop />
      <Header />
      <main className="public-content" style={{ paddingTop: '90px' }}>
        <Outlet />
      </main>
      <Footer />
    </>
  )
}





