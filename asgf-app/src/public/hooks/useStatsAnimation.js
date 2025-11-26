import { useEffect, useRef } from 'react'

export function useStatsAnimation() {
  const sectionRef = useRef(null)

  useEffect(() => {
    const animateStats = () => {
      const stats = document.querySelectorAll('#stats .mission-card h3')
      stats.forEach(stat => {
        const text = stat.textContent
        const target = parseInt(text.replace(/[^0-9]/g, ''))
        
        if (target && !stat.dataset.animated) {
          stat.dataset.animated = 'true'
          let current = 0
          const increment = target / 50
          const timer = setInterval(() => {
            current += increment
            if (current >= target) {
              stat.textContent = text.replace(/[0-9]+/, target)
              clearInterval(timer)
            } else {
              stat.textContent = text.replace(/[0-9]+/, Math.floor(current))
            }
          }, 30)
        }
      })
    }

    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateStats()
        }
      })
    }, observerOptions)

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current)
      }
      observer.disconnect()
    }
  }, [])

  return sectionRef
}

