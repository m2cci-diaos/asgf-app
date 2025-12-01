import React, { useState, useEffect, useCallback } from 'react'
import { fetchCalendarEvents } from '../services/api'

const CalendarContent = () => {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [view, setView] = useState('month') // 'month', 'week', 'day'

  const loadEvents = useCallback(async () => {
    setLoading(true)
    try {
      const eventsData = await fetchCalendarEvents()
      setEvents(eventsData)
    } catch (err) {
      console.error('Erreur chargement événements:', err)
      alert('Erreur lors du chargement des événements: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []
    
    // Jours du mois précédent
    const prevMonth = new Date(year, month - 1, 0)
    const daysInPrevMonth = prevMonth.getDate()
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, daysInPrevMonth - i),
        isCurrentMonth: false,
      })
    }

    // Jours du mois actuel
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      })
    }

    // Jours du mois suivant pour compléter la grille
    const remainingDays = 42 - days.length
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      })
    }

    return days
  }

  const getEventsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0]
    return events.filter(event => {
      const eventDate = new Date(event.start).toISOString().split('T')[0]
      return eventDate === dateStr
    })
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const formatTime = (date) => {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + direction)
      return newDate
    })
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const days = getDaysInMonth(currentDate)
  const monthName = currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const weekDays = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

  return (
    <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: '#0f172a' }}>
              📅 Calendrier des Événements
            </h1>
            <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '14px' }}>
              Vue d'ensemble de tous les événements (formations, webinaires, réunions)
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={() => navigateMonth(-1)}
              style={{
                padding: '8px 16px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                background: 'white',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              ← Précédent
            </button>
            <button
              onClick={goToToday}
              style={{
                padding: '8px 16px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                background: 'white',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Aujourd'hui
            </button>
            <button
              onClick={() => navigateMonth(1)}
              style={{
                padding: '8px 16px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                background: 'white',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Suivant →
            </button>
          </div>
        </div>

        {/* Calendar */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}>
          {/* Month Header */}
          <div style={{
            padding: '20px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            textAlign: 'center',
          }}>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800 }}>
              {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
            </h2>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              Chargement des événements...
            </div>
          ) : (
            <>
              {/* Week Days Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                borderBottom: '2px solid #e2e8f0',
              }}>
                {weekDays.map(day => (
                  <div
                    key={day}
                    style={{
                      padding: '12px',
                      textAlign: 'center',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#475569',
                      background: '#f8fafc',
                    }}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
              }}>
                {days.map((day, index) => {
                  const dayEvents = getEventsForDate(day.date)
                  const isToday = day.date.toDateString() === new Date().toDateString()

                  return (
                    <div
                      key={index}
                      style={{
                        minHeight: '120px',
                        border: '1px solid #e2e8f0',
                        padding: '8px',
                        background: day.isCurrentMonth ? 'white' : '#f8fafc',
                        position: 'relative',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (day.isCurrentMonth) {
                          e.currentTarget.style.background = '#f8fafc'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (day.isCurrentMonth) {
                          e.currentTarget.style.background = 'white'
                        }
                      }}
                      onClick={() => {
                        if (dayEvents.length > 0) {
                          setSelectedEvent(dayEvents[0])
                        }
                      }}
                    >
                      <div style={{
                        fontSize: '14px',
                        fontWeight: isToday ? 800 : 600,
                        color: isToday ? '#3b82f6' : day.isCurrentMonth ? '#0f172a' : '#94a3b8',
                        marginBottom: '4px',
                        padding: isToday ? '2px 6px' : '0',
                        background: isToday ? '#dbeafe' : 'transparent',
                        borderRadius: isToday ? '4px' : '0',
                        display: 'inline-block',
                      }}>
                        {day.date.getDate()}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {dayEvents.slice(0, 3).map((event, idx) => (
                          <div
                            key={idx}
                            style={{
                              fontSize: '11px',
                              padding: '4px 6px',
                              borderRadius: '4px',
                              background: event.color || '#3b82f6',
                              color: 'white',
                              fontWeight: 600,
                              cursor: 'pointer',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedEvent(event)
                            }}
                            title={event.title}
                          >
                            {formatTime(new Date(event.start))} {event.title.substring(0, 20)}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div style={{
                            fontSize: '11px',
                            color: '#64748b',
                            fontWeight: 600,
                          }}>
                            +{dayEvents.length - 3} autre(s)
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Event Details Modal */}
        {selectedEvent && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={() => setSelectedEvent(null)}
          >
            <div
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '24px',
                maxWidth: '500px',
                width: '90%',
                maxHeight: '80vh',
                overflow: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                  Détails de l'événement
                </h3>
                <button
                  onClick={() => setSelectedEvent(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: '#64748b',
                  }}
                >
                  ×
                </button>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Titre</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                  {selectedEvent.title}
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Date</div>
                <div style={{ fontSize: '14px', color: '#0f172a' }}>
                  {formatDate(new Date(selectedEvent.start))}
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Heure</div>
                <div style={{ fontSize: '14px', color: '#0f172a' }}>
                  {formatTime(new Date(selectedEvent.start))} - {formatTime(new Date(selectedEvent.end))}
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Type</div>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    background: `${selectedEvent.color}20`,
                    color: selectedEvent.color,
                  }}
                >
                  {selectedEvent.type === 'formation' ? 'Formation' : 
                   selectedEvent.type === 'webinaire' ? 'Webinaire' : 
                   selectedEvent.type === 'reunion' ? 'Réunion' : selectedEvent.type}
                </span>
              </div>

              {selectedEvent.data && (
                <div style={{ marginTop: '16px', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>Informations supplémentaires</div>
                  <pre style={{
                    margin: 0,
                    fontSize: '11px',
                    color: '#0f172a',
                    overflow: 'auto',
                    maxHeight: '200px',
                  }}>
                    {JSON.stringify(selectedEvent.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Legend */}
        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
        }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
            Légende
          </div>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: '#4f46e5' }}></div>
              <span style={{ fontSize: '13px', color: '#64748b' }}>Formations</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: '#06b6d4' }}></div>
              <span style={{ fontSize: '13px', color: '#64748b' }}>Webinaires</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: '#22c55e' }}></div>
              <span style={{ fontSize: '13px', color: '#64748b' }}>Réunions</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CalendarContent


