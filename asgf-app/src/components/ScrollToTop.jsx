import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

function ScrollToTop() {
  const { pathname } = useLocation()
  const prevPathname = useRef(pathname)

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
  }, [])

  // useLayoutEffect pour s'exécuter avant le rendu visuel
  useLayoutEffect(() => {
    // Si le pathname a changé, forcer le scroll vers le haut
    if (prevPathname.current !== pathname) {
      // RÉACTIVER LE SCROLL EN PRIORITÉ
      document.body.style.removeProperty('overflow')
      document.body.style.removeProperty('overflow-y')
      document.body.style.removeProperty('overflow-x')
      document.documentElement.style.removeProperty('overflow')
      document.documentElement.style.removeProperty('overflow-y')
      document.documentElement.style.removeProperty('overflow-x')
      document.body.style.overflowY = 'auto'
      document.documentElement.style.overflowY = 'auto'
      
      // Scroll immédiat vers le haut - méthode agressive
      window.scrollTo(0, 0)
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      
      // Forcer aussi le scroll du document
      if (document.documentElement) {
        document.documentElement.scrollTop = 0
        document.documentElement.scrollLeft = 0
      }
      if (document.body) {
        document.body.scrollTop = 0
        document.body.scrollLeft = 0
      }
      
      // Forcer le scroll de tous les conteneurs possibles
      const scrollableElements = document.querySelectorAll('html, body, main, [data-scroll-container]')
      scrollableElements.forEach(el => {
        if (el) {
          el.scrollTop = 0
          el.scrollLeft = 0
        }
      })
      
      prevPathname.current = pathname
    }
  }, [pathname])

  // Double vérification avec useEffect pour s'assurer que le scroll est bien effectué
  useEffect(() => {
    // RÉACTIVER LE SCROLL EN PRIORITÉ ABSOLUE
    const enableScroll = () => {
      document.body.style.removeProperty('overflow')
      document.body.style.removeProperty('overflow-y')
      document.body.style.removeProperty('overflow-x')
      document.documentElement.style.removeProperty('overflow')
      document.documentElement.style.removeProperty('overflow-y')
      document.documentElement.style.removeProperty('overflow-x')
      document.body.style.overflowY = 'auto'
      document.documentElement.style.overflowY = 'auto'
    }
    
    const scrollToTop = () => {
      // Toujours réactiver le scroll avant de scroller
      enableScroll()
      
      window.scrollTo(0, 0)
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      
      if (document.documentElement) {
        document.documentElement.scrollTop = 0
        document.documentElement.scrollLeft = 0
      }
      if (document.body) {
        document.body.scrollTop = 0
        document.body.scrollLeft = 0
      }
      
      const scrollableElements = document.querySelectorAll('html, body, main')
      scrollableElements.forEach(el => {
        if (el) {
          el.scrollTop = 0
          el.scrollLeft = 0
        }
      })
    }

    // Réactiver le scroll immédiatement
    enableScroll()
    scrollToTop()

    // Réactiver le scroll après plusieurs frames pour s'assurer que c'est persistant
    const timeouts = []
    timeouts.push(setTimeout(enableScroll, 0))
    timeouts.push(setTimeout(enableScroll, 10))
    timeouts.push(setTimeout(enableScroll, 50))
    timeouts.push(setTimeout(enableScroll, 100))
    timeouts.push(setTimeout(enableScroll, 200))
    timeouts.push(setTimeout(scrollToTop, 0))
    timeouts.push(setTimeout(scrollToTop, 10))
    timeouts.push(setTimeout(scrollToTop, 50))
    timeouts.push(setTimeout(scrollToTop, 100))
    timeouts.push(setTimeout(scrollToTop, 200))
    
    // Scroll après le prochain frame de rendu (double RAF pour être sûr)
    requestAnimationFrame(() => {
      enableScroll()
      requestAnimationFrame(() => {
        enableScroll()
        requestAnimationFrame(() => {
          enableScroll()
          scrollToTop()
        })
      })
    })

    return () => {
      timeouts.forEach(id => clearTimeout(id))
    }
  }, [pathname])

  return null
}

export default ScrollToTop

