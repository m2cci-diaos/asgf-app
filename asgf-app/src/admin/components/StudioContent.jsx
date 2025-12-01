import React, { useState, useEffect, useRef, useCallback } from 'react'
import html2canvas from 'html2canvas'
import { QRCodeSVG } from 'qrcode.react'

// Import du logo avec Vite
import logoASGFImage from '../img/Logo_officiel_ASGF.png'
const logoASGF = logoASGFImage

const COLORS = ["#4f46e5", "#06b6d4", "#22c55e", "#ef4444", "#f59e0b", "#0ea5e9", "#a855f7", "#14b8a6"]
const TEXT_ALIGN_OPTIONS = [
  { value: 'left', label: 'Gauche', icon: '⬅️' },
  { value: 'center', label: 'Centré', icon: '↔️' },
  { value: 'right', label: 'Droite', icon: '➡️' },
  { value: 'justify', label: 'Justifié', icon: '⬌' }
]
const FONT_SIZES = [28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 68, 72]

const StudioContent = () => {
  const postRef = useRef(null)
  const [eventType, setEventType] = useState('WEBINAIRE')
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0])
  const [theme, setTheme] = useState("Résilience logistique en Afrique : comment digitaliser sa chaîne d'approvisionnement ?")
  const [subtitle, setSubtitle] = useState('Organisé par le Pôle Formations — AGSF')
  const [qrLink, setQrLink] = useState('https://www.agsf.sn/evenements/webinaire-logistique')
  const [accentColor, setAccentColor] = useState(COLORS[0])
  const [bgMap, setBgMap] = useState('france_senegal')
  const [textAlign, setTextAlign] = useState('left')
  const [fontSize, setFontSize] = useState(38)
  const [textColor, setTextColor] = useState('#0f172a')
  const [speakers, setSpeakers] = useState([
    { name: 'Serigne Omar DIAO', role: 'Ingénieur Géomaticien', photo: '' },
    { name: '', role: '', photo: '' },
    { name: '', role: '', photo: '' }
  ])
  const [exportSize, setExportSize] = useState({ width: 800, height: 800 })
  const [generating, setGenerating] = useState(false)
  const [toast, setToast] = useState({ show: false, message: '' })
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 1100)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Format date for display
  const formatDate = useCallback((dateString) => {
    if (!dateString) return { day: '17', monthYear: 'OCTOBRE 2025' }
    const d = new Date(dateString + 'T00:00:00')
    const day = d.toLocaleDateString('fr-FR', { day: '2-digit' })
    const monthYear = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase()
    return { day, monthYear }
  }, [])

  const dateDisplay = formatDate(eventDate)


  const fileToSquareDataURL = (file, callback) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const size = Math.min(img.width, img.height)
        const sx = (img.width - size) / 2
        const sy = (img.height - size) / 2
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = size
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, sx, sy, size, size, 0, 0, size, size)
        callback(canvas.toDataURL('image/png'))
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  }

  const handleSpeakerPhoto = (index, e) => {
    const file = e.target.files?.[0]
    if (!file) return
    fileToSquareDataURL(file, (dataUrl) => {
      const newSpeakers = [...speakers]
      newSpeakers[index].photo = dataUrl
      setSpeakers(newSpeakers)
    })
  }

  const updateSpeaker = (index, field, value) => {
    const newSpeakers = [...speakers]
    newSpeakers[index][field] = value
    setSpeakers(newSpeakers)
  }

  // Generate image
  const generateImage = async () => {
    if (!postRef.current) return
    
    setGenerating(true)
    const node = postRef.current
    const { width, height } = exportSize

    // Temporarily resize for export
    const prevWidth = node.offsetWidth
    const prevHeight = node.offsetHeight
    node.style.width = `${width}px`
    node.style.height = `${height}px`

    try {
      const canvas = await html2canvas(node, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
        allowTaint: true
      })

      const link = document.createElement('a')
      const type = eventType.toLowerCase().replace(/[^a-z0-9]/g, '_')
      const date = eventDate || new Date().toISOString().slice(0, 10)
      link.download = `AGSF_${type}_${date}_${width}x${height}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()

      showToast('✅ Image téléchargée')
    } catch (err) {
      console.error(err)
      showToast('❌ Erreur pendant la génération')
    } finally {
      // Restore preview size
      node.style.width = `${prevWidth}px`
      node.style.height = `${prevHeight}px`
      setGenerating(false)
    }
  }

  const showToast = (message) => {
    setToast({ show: true, message })
    setTimeout(() => setToast({ show: false, message: '' }), 1800)
  }

  const resetForm = () => {
    setEventType('WEBINAIRE')
    setEventDate(new Date().toISOString().split('T')[0])
    setTheme("Résilience logistique en Afrique : comment digitaliser sa chaîne d'approvisionnement ?")
    setSubtitle('Organisé par le Pôle Formations — AGSF')
    setQrLink('https://www.agsf.sn/evenements/webinaire-logistique')
    setAccentColor(COLORS[0])
    setBgMap('france_senegal')
    setTextAlign('left')
    setFontSize(38)
    setTextColor('#0f172a')
    setSpeakers([
      { name: 'Serigne Omar DIAO', role: 'Ingénieur Géomaticien', photo: '' },
      { name: '', role: '', photo: '' },
      { name: '', role: '', photo: '' }
    ])
    setExportSize({ width: 800, height: 800 })
  }

  // Image pour les contours France-Sénégal
  const getMapImage = () => {
    if (bgMap === 'france_senegal') {
      return (
        <img
          src="/assets/images/Contours_France_senegal.png"
          alt="Contours France Sénégal"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            opacity: 0.07,
            zIndex: 1,
            pointerEvents: 'none',
            filter: 'brightness(3) contrast(0.6) saturate(0.3)'
          }}
        />
      )
    }
    return null
  }

  const mapImage = getMapImage()

  // Styles réutilisables
  const inputStyle = {
    width: '100%',
    height: '44px',
    borderRadius: '12px',
    border: '1px solid rgba(148,163,184,.3)',
    background: 'rgba(15,23,42,.4)',
    color: '#f1f5f9',
    padding: '0 14px',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit'
  }

  const inputFocusStyle = {
    borderColor: accentColor,
    background: 'rgba(15,23,42,.6)',
    boxShadow: `0 0 0 3px ${accentColor}20`
  }

  const labelStyle = {
    display: 'block',
    margin: '12px 0 8px',
    fontSize: '12px',
    fontWeight: 700,
    color: '#cbd5e1',
    letterSpacing: '0.02em'
  }

  const sectionTitleStyle = {
    margin: '24px 0 14px',
    fontSize: '13px',
    color: '#94a3b8',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '.15em',
    paddingBottom: '8px',
    borderBottom: '1px solid rgba(148,163,184,.15)'
  }

  return (
    <div style={{
      padding: '1.5rem',
      background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      minHeight: '100vh',
      color: '#e5e7eb',
      fontFamily: '"Inter", "Montserrat", system-ui, -apple-system, sans-serif',
      position: 'relative'
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 20% 50%, rgba(79,70,229,.08) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(6,182,212,.06) 0%, transparent 50%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Topbar */}
      <div style={{
        maxWidth: '1440px',
        margin: '24px auto 0',
        padding: '16px 24px',
        borderRadius: '20px',
        background: 'linear-gradient(135deg, rgba(79,70,229,.25), rgba(6,182,212,.2))',
        border: '1px solid rgba(99,102,241,.4)',
        boxShadow: '0 10px 40px rgba(0,0,0,.4), 0 0 0 1px rgba(255,255,255,.05) inset',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        marginBottom: '24px',
        position: 'relative',
        zIndex: 1,
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, rgba(255,255,255,.2), rgba(255,255,255,.1))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,.2)'
        }}>
          <span style={{ fontSize: '24px' }}>🎨</span>
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, letterSpacing: '.3px', color: '#f8fafc' }}>
            Studio Communication — AGSF
          </h1>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.6)', marginTop: '2px', fontWeight: 600 }}>
            Générateur d'images pour événements
          </div>
        </div>
      </div>

      <div style={{
        maxWidth: '1440px',
        margin: '0 auto 40px',
        padding: '0 8px',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '400px 1fr',
        gap: '20px'
      }}>
        {/* Control Panel */}
        <aside
          style={{
            position: isMobile ? 'static' : 'sticky',
            top: isMobile ? 'auto' : '18px',
            background: 'rgba(30,41,59,0.7)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(148,163,184,0.2)',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: '0 20px 60px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.05) inset',
            height: 'fit-content',
            maxHeight: isMobile ? 'none' : 'calc(100vh - 100px)',
            overflowY: isMobile ? 'visible' : 'auto',
            zIndex: 1,
          }}
        >
          <h2 style={sectionTitleStyle}>
            Informations Générales
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={labelStyle}>
                Type d'annonce
              </label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                style={inputStyle}
                onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
                onBlur={(e) => Object.assign(e.target.style, inputStyle)}
              >
                <option value="WEBINAIRE">Webinaire</option>
                <option value="FORMATION">Formation</option>
                <option value="ATELIER">Atelier</option>
                <option value="ÉVÉNEMENT">Événement</option>
                <option value="NOUVEAU MEMBRE">Nouveau membre</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>
                Date
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                style={inputStyle}
                onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
                onBlur={(e) => Object.assign(e.target.style, inputStyle)}
              />
            </div>
          </div>

          <label style={labelStyle}>
            Titre / Thème principal
          </label>
          <textarea
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="Ex: Résilience logistique en Afrique : comment digitaliser sa chaîne d'approvisionnement ?"
            style={{
              ...inputStyle,
              height: '80px',
              padding: '12px 14px',
              resize: 'vertical',
              minHeight: '80px'
            }}
            onFocus={(e) => Object.assign(e.target.style, { ...inputStyle, ...inputFocusStyle, height: '80px', padding: '12px 14px' })}
            onBlur={(e) => Object.assign(e.target.style, { ...inputStyle, height: '80px', padding: '12px 14px' })}
          />

          <label style={labelStyle}>
            Sous-titre (optionnel)
          </label>
          <input
            type="text"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Organisé par le Pôle Formations — AGSF"
            style={inputStyle}
            onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
            onBlur={(e) => Object.assign(e.target.style, inputStyle)}
          />

          <label style={labelStyle}>
            Lien pour le QR code
          </label>
          <input
            type="text"
            value={qrLink}
            onChange={(e) => setQrLink(e.target.value)}
            placeholder="https://www.agsf.sn/..."
            style={inputStyle}
            onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
            onBlur={(e) => Object.assign(e.target.style, inputStyle)}
          />

          <label style={labelStyle}>
            Couleur d'accent
          </label>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {COLORS.map((color) => (
              <div
                key={color}
                onClick={() => {
                  setAccentColor(color)
                  showToast(`Couleur: ${color}`)
                }}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  border: accentColor === color ? `3px solid ${color}` : '2px solid rgba(148,163,184,.3)',
                  background: color,
                  cursor: 'pointer',
                  boxShadow: accentColor === color 
                    ? `0 0 0 4px ${color}30, 0 4px 12px ${color}40` 
                    : '0 2px 8px rgba(0,0,0,.2)',
                  transition: 'all 0.2s ease',
                  transform: accentColor === color ? 'scale(1.1)' : 'scale(1)',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  if (accentColor !== color) {
                    e.target.style.transform = 'scale(1.05)'
                    e.target.style.boxShadow = `0 4px 12px ${color}30`
                  }
                }}
                onMouseLeave={(e) => {
                  if (accentColor !== color) {
                    e.target.style.transform = 'scale(1)'
                    e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,.2)'
                  }
                }}
              >
                {accentColor === color && (
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: '#fff',
                    fontSize: '16px',
                    fontWeight: 'bold'
                  }}>✓</div>
                )}
              </div>
            ))}
          </div>

          <div>
            <label style={labelStyle}>
              Carte de fond (optionnel)
            </label>
            <select
              value={bgMap}
              onChange={(e) => setBgMap(e.target.value)}
              style={inputStyle}
              onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
              onBlur={(e) => Object.assign(e.target.style, inputStyle)}
            >
              <option value="none">Aucune</option>
              <option value="france_senegal">Contours France Sénégal</option>
            </select>
          </div>

          <h2 style={sectionTitleStyle}>
            Style du Titre
          </h2>

          <label style={labelStyle}>
            Justification du texte
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
            {TEXT_ALIGN_OPTIONS.map((option) => {
              const isSelected = textAlign === option.value
              return (
                <div
                  key={option.value}
                  onClick={() => {
                    setTextAlign(option.value)
                    showToast(`Alignement: ${option.label}`)
                  }}
                  style={{
                    padding: '12px 8px',
                    borderRadius: '10px',
                    border: isSelected
                      ? `2px solid ${accentColor}`
                      : '1px solid rgba(148,163,184,.3)',
                    background: isSelected
                      ? `${accentColor}20`
                      : 'rgba(15,23,42,.4)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = accentColor
                      e.currentTarget.style.background = `${accentColor}15`
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'rgba(148,163,184,.3)'
                      e.currentTarget.style.background = 'rgba(15,23,42,.4)'
                    }
                  }}
                >
                  <span style={{ fontSize: '20px' }}>{option.icon}</span>
                  <span style={{ fontSize: '11px', color: isSelected ? accentColor : '#cbd5e1', fontWeight: 600 }}>
                    {option.label}
                  </span>
                </div>
              )
            })}
          </div>

          <label style={labelStyle}>
            Taille de police: {fontSize}px
          </label>
          <input
            type="range"
            min="28"
            max="72"
            step="4"
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            style={{
              width: '100%',
              height: '8px',
              borderRadius: '4px',
              background: 'rgba(15,23,42,.4)',
              outline: 'none',
              marginBottom: '16px',
              cursor: 'pointer',
              WebkitAppearance: 'none',
              appearance: 'none'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginTop: '-12px', marginBottom: '16px' }}>
            <span>28px</span>
            <span>72px</span>
          </div>

          <label style={labelStyle}>
            Couleur du texte
          </label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
            <input
              type="color"
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              style={{
                width: '60px',
                height: '44px',
                borderRadius: '10px',
                border: '1px solid rgba(148,163,184,.3)',
                cursor: 'pointer',
                background: 'transparent'
              }}
            />
            <input
              type="text"
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              placeholder="#0f172a"
              style={{
                flex: 1,
                ...inputStyle
              }}
              onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
              onBlur={(e) => Object.assign(e.target.style, inputStyle)}
            />
          </div>

          {[1, 2, 3].map((num) => (
            <div key={num} style={{ marginBottom: '20px' }}>
              <h2 style={sectionTitleStyle}>
                Intervenant {num} {num === 1 ? '(principal)' : '(optionnel)'}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={labelStyle}>Nom</label>
                  <input
                    type="text"
                    value={speakers[num - 1].name}
                    onChange={(e) => updateSpeaker(num - 1, 'name', e.target.value)}
                    placeholder={num === 1 ? "Ex: Serigne Omar DIAO" : ""}
                    style={inputStyle}
                    onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
                    onBlur={(e) => Object.assign(e.target.style, inputStyle)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Rôle</label>
                  <input
                    type="text"
                    value={speakers[num - 1].role}
                    onChange={(e) => updateSpeaker(num - 1, 'role', e.target.value)}
                    placeholder={num === 1 ? "Ingénieur Géomaticien" : ""}
                    style={inputStyle}
                    onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
                    onBlur={(e) => Object.assign(e.target.style, inputStyle)}
                  />
                </div>
              </div>
              <label style={labelStyle}>Photo</label>
              <div style={{
                position: 'relative',
                borderRadius: '12px',
                border: '2px dashed rgba(148,163,184,.3)',
                background: 'rgba(15,23,42,.3)',
                padding: '12px',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                marginBottom: '4px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = accentColor
                e.currentTarget.style.background = `rgba(15,23,42,.5)`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(148,163,184,.3)'
                e.currentTarget.style.background = 'rgba(15,23,42,.3)'
              }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleSpeakerPhoto(num - 1, e)}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0,
                    cursor: 'pointer',
                    width: '100%',
                    height: '100%'
                  }}
                />
                <div style={{ textAlign: 'center', color: '#cbd5e1', fontSize: '13px' }}>
                  {speakers[num - 1].photo ? '✓ Photo chargée' : '📷 Cliquez pour uploader'}
                </div>
              </div>
            </div>
          ))}

          <h2 style={sectionTitleStyle}>
            Export
          </h2>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px', marginBottom: '20px' }}>
            {[
              { w: 1080, h: 1080, label: 'Carré', size: '1080×1080', icon: '⬜' },
              { w: 1080, h: 1920, label: 'Story', size: '1080×1920', icon: '📱' },
              { w: 1350, h: 1080, label: 'Paysage', size: '1350×1080', icon: '🖼️' },
              { w: 800, h: 800, label: 'Aperçu', size: '800×800', icon: '👁️' }
            ].map((preset) => {
              const isSelected = exportSize.width === preset.w && exportSize.height === preset.h
              return (
                <div
                  key={preset.label}
                  onClick={() => {
                    setExportSize({ width: preset.w, height: preset.h })
                    showToast(`Format: ${preset.size}`)
                  }}
                  style={{
                    border: isSelected
                      ? `2px solid ${accentColor}`
                      : '1px solid rgba(148,163,184,.3)',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: isSelected
                      ? `${accentColor}20`
                      : 'rgba(15,23,42,.4)',
                    transition: 'all 0.2s ease',
                    transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                    color: isSelected ? accentColor : '#cbd5e1',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    minWidth: '80px'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.transform = 'scale(1.02)'
                      e.currentTarget.style.borderColor = accentColor
                      e.currentTarget.style.background = `${accentColor}15`
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.transform = 'scale(1)'
                      e.currentTarget.style.borderColor = 'rgba(148,163,184,.3)'
                      e.currentTarget.style.background = 'rgba(15,23,42,.4)'
                    }
                  }}
                >
                  <span style={{ fontSize: '16px' }}>{preset.icon}</span>
                  <span>{preset.label}</span>
                  <span style={{ fontSize: '10px', opacity: 0.7 }}>{preset.size}</span>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(148,163,184,.15)' }}>
            <button
              onClick={resetForm}
              style={{
                flex: 1,
                height: '48px',
                border: '1px solid rgba(148,163,184,.4)',
                borderRadius: '12px',
                background: 'rgba(15,23,42,.4)',
                color: '#e2e8f0',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(148,163,184,.15)'
                e.currentTarget.style.borderColor = 'rgba(148,163,184,.6)'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(15,23,42,.4)'
                e.currentTarget.style.borderColor = 'rgba(148,163,184,.4)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <span>🔄</span>
              <span>Réinitialiser</span>
            </button>
            <button
              onClick={generateImage}
              disabled={generating}
              style={{
                flex: 2,
                height: '48px',
                border: 'none',
                borderRadius: '12px',
                background: generating ? 'rgba(148,163,184,.4)' : `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`,
                color: '#fff',
                fontWeight: 800,
                cursor: generating ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: generating ? 'none' : `0 4px 16px ${accentColor}40`
              }}
              onMouseEnter={(e) => {
                if (!generating) {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = `0 6px 20px ${accentColor}50`
                }
              }}
              onMouseLeave={(e) => {
                if (!generating) {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = `0 4px 16px ${accentColor}40`
                }
              }}
            >
              {generating ? (
                <>
                  <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span>
                  <span>Génération en cours...</span>
                </>
              ) : (
                <>
                  <span>✨</span>
                  <span>Générer l'image (PNG)</span>
                </>
              )}
            </button>
          </div>
        </aside>

        {/* Preview */}
        <section style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'flex-start',
          position: 'relative',
          zIndex: 1
        }}>
          <div style={{
            position: 'relative',
            padding: '20px',
            background: 'rgba(30,41,59,.4)',
            backdropFilter: 'blur(10px)',
            borderRadius: '24px',
            border: '1px solid rgba(148,163,184,.2)',
            boxShadow: '0 20px 60px rgba(0,0,0,.4)'
          }}>
            {generating && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(15,23,42,.9)',
                backdropFilter: 'blur(8px)',
                borderRadius: '24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
                zIndex: 10,
                color: '#f1f5f9'
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  border: `4px solid ${accentColor}30`,
                  borderTopColor: accentColor,
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                <div style={{ fontSize: '16px', fontWeight: 700 }}>Génération de l'image...</div>
                <div style={{ fontSize: '12px', opacity: 0.7 }}>Veuillez patienter</div>
              </div>
            )}
            <div
              ref={postRef}
              style={{
                width: isMobile ? '720px' : '800px',
                height: isMobile ? '720px' : '800px',
                position: 'relative',
                borderRadius: '22px',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #f8fafc, #eef2ff)',
                boxShadow: '0 25px 60px rgba(0,0,0,.45), 0 0 0 1px rgba(255,255,255,.1)',
                color: '#0b1324',
                transform: isMobile ? 'scale(0.9)' : 'none',
                transformOrigin: 'top center',
                transition: 'transform 0.3s ease'
              }}
            >
            {/* Background */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              <div style={{
                position: 'absolute',
                width: '380px',
                height: '380px',
                top: '-120px',
                right: '-120px',
                borderRadius: '50%',
                filter: 'blur(60px)',
                opacity: 0.12,
                background: accentColor
              }}></div>
              <div style={{
                position: 'absolute',
                width: '320px',
                height: '320px',
                bottom: '-120px',
                left: '-120px',
                borderRadius: '50%',
                filter: 'blur(60px)',
                opacity: 0.12,
                background: COLORS[(COLORS.indexOf(accentColor) + 1) % COLORS.length] || '#06b6d4'
              }}></div>
              {bgMap !== 'none' && mapImage}
            </div>

            {/* Canvas Content */}
            <div style={{
              position: 'relative',
              zIndex: 5,
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              padding: '36px'
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                  <img
                    src={logoASGF}
                    alt="Logo ASGF"
                    style={{
                      width: '150px',
                      height: '150px',
                      objectFit: 'contain',
                      borderRadius: '14px',
                      background: '#fff',
                      padding: '8px',
                      border: '3px solid #fff',
                      boxShadow: '0 8px 25px rgba(0,0,0,0.2)'
                    }}
                  />
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    lineHeight: 1.4,
                    textAlign: 'left',
                    color: '#0b1324'
                  }}>
                    Association des Sénégalais<br />Géomaticiens de France
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '48px', fontWeight: 900, color: accentColor, lineHeight: 1 }}>
                    {dateDisplay.day}
                  </div>
                  <div style={{ marginTop: '4px', fontSize: '16px', fontWeight: 800, color: '#0b1324' }}>
                    {dateDisplay.monthYear}
                  </div>
                </div>
              </div>

              {/* Body */}
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '0 6px 190px'
              }}>
                <div style={{
                  alignSelf: 'flex-start',
                  background: accentColor,
                  color: '#fff',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 900,
                  letterSpacing: '.06em',
                  marginBottom: '10px'
                }}>
                  {eventType}
                </div>
                <h1 style={{
                  margin: '10px 0 0',
                  fontSize: `${fontSize}px`,
                  fontWeight: 900,
                  letterSpacing: '-.02em',
                  lineHeight: 1.2,
                  color: textColor,
                  hyphens: 'auto',
                  textAlign: textAlign,
                  whiteSpace: 'pre-line',
                  maxWidth: textAlign === 'center' ? '100%' : '90%',
                  marginBottom: '10px',
                  width: '100%'
                }}>
                  {theme || 'Titre de votre événement, atelier ou formation'}
                </h1>
                {subtitle && (
                  <div style={{
                    marginTop: '10px',
                    fontSize: '14px',
                    color: '#334155',
                    maxWidth: '80%'
                  }}>
                    {subtitle}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{
                position: 'absolute',
                left: '32px',
                right: '32px',
                bottom: '28px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end'
              }}>
                <div style={{ display: 'flex', gap: '22px' }}>
                  {speakers.map((speaker, idx) => speaker.name && (
                    <div key={idx} style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      maxWidth: '180px',
                      textAlign: 'center'
                    }}>
                      {speaker.photo ? (
                        <img
                          src={speaker.photo}
                          alt={speaker.name}
                          style={{
                            width: '150px',
                            height: '150px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            background: '#e2e8f0',
                            border: '5px solid #fff',
                            boxShadow: '0 10px 28px rgba(0,0,0,.18)',
                            marginBottom: '12px',
                            outline: `4px solid ${accentColor}40`
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '150px',
                          height: '150px',
                          borderRadius: '50%',
                          background: '#e2e8f0',
                          border: '5px solid #fff',
                          boxShadow: '0 10px 28px rgba(0,0,0,.18)',
                          marginBottom: '12px',
                          outline: `4px solid ${accentColor}40`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '48px',
                          fontWeight: 900,
                          color: accentColor
                        }}>
                          {speaker.name?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div style={{ fontSize: '18px', fontWeight: 900, color: '#0b1324' }}>
                        {speaker.name}
                      </div>
                      <div style={{ fontSize: '14px', opacity: 0.85, color: '#0b1324' }}>
                        {speaker.role}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  {qrLink && (
                    <div style={{
                      width: '108px',
                      height: '108px',
                      background: '#fff',
                      padding: '6px',
                      borderRadius: '10px',
                      boxShadow: '0 2px 10px rgba(0,0,0,.1)'
                    }}>
                      <QRCodeSVG value={qrLink} size={96} level="H" fgColor="#111827" bgColor="#ffffff" />
                    </div>
                  )}
                  <small style={{ fontSize: '12px', opacity: 0.7, color: '#0b1324' }}>
                    Scannez pour plus d'infos
                  </small>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: accentColor }}>
                    {qrLink ? qrLink.replace(/^https?:\/\//, '') : ''}
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </section>
      </div>

      {/* Toast */}
      {toast.show && (
        <div style={{
          position: 'fixed',
          right: '24px',
          bottom: '24px',
          background: 'rgba(15,23,42,.95)',
          backdropFilter: 'blur(12px)',
          color: '#f1f5f9',
          border: `1px solid ${accentColor}40`,
          padding: '14px 18px',
          borderRadius: '14px',
          boxShadow: `0 10px 40px rgba(0,0,0,.5), 0 0 0 1px ${accentColor}20`,
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          zIndex: 50,
          animation: 'fadeIn 0.3s ease',
          fontSize: '14px',
          fontWeight: 600,
          minWidth: '200px'
        }}>
          <span style={{ fontSize: '18px' }}>✨</span>
          <span>{toast.message}</span>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        
        /* Scrollbar styling */
        aside::-webkit-scrollbar {
          width: 8px;
        }
        aside::-webkit-scrollbar-track {
          background: rgba(15,23,42,.3);
          borderRadius: 10px;
        }
        aside::-webkit-scrollbar-thumb {
          background: rgba(148,163,184,.3);
          borderRadius: 10px;
        }
        aside::-webkit-scrollbar-thumb:hover {
          background: rgba(148,163,184,.5);
        }
        
        /* Input focus styles */
        input:focus, textarea:focus, select:focus {
          border-color: ${accentColor} !important;
          background: rgba(15,23,42,.6) !important;
          box-shadow: 0 0 0 3px ${accentColor}20 !important;
        }
        
        /* Range input styling */
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
        }
        
        input[type="range"]::-webkit-slider-track {
          background: rgba(15,23,42,.4);
          height: 8px;
          border-radius: 4px;
        }
        
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          background: ${accentColor};
          height: 20px;
          width: 20px;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 8px ${accentColor}50;
          transition: all 0.2s ease;
        }
        
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 4px 12px ${accentColor}60;
        }
        
        input[type="range"]::-moz-range-track {
          background: rgba(15,23,42,.4);
          height: 8px;
          border-radius: 4px;
        }
        
        input[type="range"]::-moz-range-thumb {
          background: ${accentColor};
          height: 20px;
          width: 20px;
          border-radius: 50%;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 8px ${accentColor}50;
          transition: all 0.2s ease;
        }
        
        input[type="range"]::-moz-range-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 4px 12px ${accentColor}60;
        }
        
        @media (max-width: 1100px) {
          .studio-preview {
            transform: scale(0.9);
            transform-origin: top center;
          }
        }
      `}</style>
    </div>
  )
}

export default StudioContent

