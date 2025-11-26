import React, { useState, useEffect, useRef, useCallback } from 'react'
import html2canvas from 'html2canvas'
import { QRCodeSVG } from 'qrcode.react'

const COLORS = ["#4f46e5", "#06b6d4", "#22c55e", "#ef4444", "#f59e0b", "#0ea5e9", "#a855f7", "#14b8a6"]

const StudioContent = () => {
  const postRef = useRef(null)
  const [eventType, setEventType] = useState('WEBINAIRE')
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0])
  const [theme, setTheme] = useState("Résilience logistique en Afrique : comment digitaliser sa chaîne d'approvisionnement ?")
  const [subtitle, setSubtitle] = useState('Organisé par le Pôle Formations — AGSF')
  const [qrLink, setQrLink] = useState('https://www.agsf.sn/evenements/webinaire-logistique')
  const [accentColor, setAccentColor] = useState(COLORS[0])
  const [logoUrl, setLogoUrl] = useState('')
  const [bgMap, setBgMap] = useState('senegal')
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

  // Handle file uploads
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setLogoUrl(ev.target.result)
    reader.readAsDataURL(file)
  }

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
    setLogoUrl('')
    setBgMap('senegal')
    setSpeakers([
      { name: 'Serigne Omar DIAO', role: 'Ingénieur Géomaticien', photo: '' },
      { name: '', role: '', photo: '' },
      { name: '', role: '', photo: '' }
    ])
    setExportSize({ width: 800, height: 800 })
  }

  const mapBgStyle = bgMap === 'senegal'
    ? { backgroundImage: "url('https://upload.wikimedia.org/wikipedia/commons/1/1a/Senegal_regions.svg')", opacity: 0.08 }
    : bgMap === 'africa'
    ? { backgroundImage: "url('https://upload.wikimedia.org/wikipedia/commons/5/50/Africa_blank_map.svg')", opacity: 0.08 }
    : { backgroundImage: 'none' }

  return (
    <div style={{
      padding: '1.5rem',
      background: 'linear-gradient(180deg, #0f172a, #111827)',
      minHeight: '100vh',
      color: '#e5e7eb',
      fontFamily: '"Montserrat", system-ui, -apple-system, sans-serif'
    }}>
      {/* Topbar */}
      <div style={{
        maxWidth: '1440px',
        margin: '24px auto 0',
        padding: '12px 20px',
        borderRadius: '20px',
        background: 'linear-gradient(135deg, rgba(79,70,229,.2), rgba(6,182,212,.15))',
        border: '1px solid rgba(99,102,241,.35)',
        boxShadow: '0 10px 30px rgba(0,0,0,.35)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '16px'
      }}>
        <img 
          src="https://upload.wikimedia.org/wikipedia/commons/4/49/Commons-logo.svg" 
          alt="logo"
          style={{ width: '42px', height: '42px', borderRadius: '10px', objectFit: 'contain', background: '#fff', padding: '6px' }}
        />
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, letterSpacing: '.3px' }}>
          Studio Communication — AGSF <span style={{ opacity: 0.6, fontWeight: 600 }}>(v2)</span>
        </h1>
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
        <aside style={{
          position: isMobile ? 'static' : 'sticky',
          top: isMobile ? 'auto' : '18px',
          background: 'rgba(30,41,59,0.55)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(148,163,184,0.25)',
          borderRadius: '16px',
          padding: '18px 18px 24px',
          boxShadow: '0 10px 30px rgba(0,0,0,.35)',
          height: 'fit-content',
          maxHeight: isMobile ? 'none' : 'calc(100vh - 100px)',
          overflowY: isMobile ? 'visible' : 'auto'
        }}>
          <h2 style={{ margin: '8px 0 14px', fontSize: '13px', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em' }}>
            Informations Générales
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label style={{ display: 'block', margin: '10px 0 6px', fontSize: '12px', fontWeight: 700, color: '#9ca3af' }}>
                Type d'annonce
              </label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                style={{
                  width: '100%',
                  height: '44px',
                  borderRadius: '10px',
                  border: '1px solid rgba(148,163,184,.35)',
                  background: 'rgba(2,6,23,.35)',
                  color: '#e6e6e8',
                  padding: '0 12px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              >
                <option value="WEBINAIRE">Webinaire</option>
                <option value="FORMATION">Formation</option>
                <option value="ATELIER">Atelier</option>
                <option value="ÉVÉNEMENT">Événement</option>
                <option value="NOUVEAU MEMBRE">Nouveau membre</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', margin: '10px 0 6px', fontSize: '12px', fontWeight: 700, color: '#9ca3af' }}>
                Date
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                style={{
                  width: '100%',
                  height: '44px',
                  borderRadius: '10px',
                  border: '1px solid rgba(148,163,184,.35)',
                  background: 'rgba(2,6,23,.35)',
                  color: '#e6e6e8',
                  padding: '0 12px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <label style={{ display: 'block', margin: '10px 0 6px', fontSize: '12px', fontWeight: 700, color: '#9ca3af' }}>
            Titre / Thème principal
          </label>
          <textarea
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="Ex: Résilience logistique en Afrique : comment digitaliser sa chaîne d'approvisionnement ?"
            style={{
              width: '100%',
              height: '72px',
              borderRadius: '10px',
              border: '1px solid rgba(148,163,184,.35)',
              background: 'rgba(2,6,23,.35)',
              color: '#e6e6e8',
              padding: '10px 12px',
              fontSize: '14px',
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
          />

          <label style={{ display: 'block', margin: '10px 0 6px', fontSize: '12px', fontWeight: 700, color: '#9ca3af' }}>
            Sous-titre (optionnel)
          </label>
          <input
            type="text"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Organisé par le Pôle Formations — AGSF"
            style={{
              width: '100%',
              height: '44px',
              borderRadius: '10px',
              border: '1px solid rgba(148,163,184,.35)',
              background: 'rgba(2,6,23,.35)',
              color: '#e6e6e8',
              padding: '0 12px',
              fontSize: '14px',
              outline: 'none',
              marginBottom: '10px'
            }}
          />

          <label style={{ display: 'block', margin: '10px 0 6px', fontSize: '12px', fontWeight: 700, color: '#9ca3af' }}>
            Lien pour le QR code
          </label>
          <input
            type="text"
            value={qrLink}
            onChange={(e) => setQrLink(e.target.value)}
            style={{
              width: '100%',
              height: '44px',
              borderRadius: '10px',
              border: '1px solid rgba(148,163,184,.35)',
              background: 'rgba(2,6,23,.35)',
              color: '#e6e6e8',
              padding: '0 12px',
              fontSize: '14px',
              outline: 'none',
              marginBottom: '10px'
            }}
          />

          <label style={{ display: 'block', margin: '10px 0 6px', fontSize: '12px', fontWeight: 700, color: '#9ca3af' }}>
            Couleur d'accent
          </label>
          <div style={{ display: 'flex', gap: '6px', marginTop: '6px', marginBottom: '10px' }}>
            {COLORS.map((color) => (
              <div
                key={color}
                onClick={() => setAccentColor(color)}
                style={{
                  width: '28px',
                  height: '20px',
                  borderRadius: '6px',
                  border: accentColor === color ? '2px solid #fff' : '1px solid rgba(255,255,255,.2)',
                  background: color,
                  cursor: 'pointer',
                  boxShadow: accentColor === color ? '0 0 0 2px rgba(255,255,255,0.3)' : 'none'
                }}
              />
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label style={{ display: 'block', margin: '10px 0 6px', fontSize: '12px', fontWeight: 700, color: '#9ca3af' }}>
                Logo de l'association
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                style={{
                  width: '100%',
                  height: '44px',
                  borderRadius: '10px',
                  border: '1px solid rgba(148,163,184,.35)',
                  background: 'rgba(2,6,23,.35)',
                  color: '#e6e6e8',
                  padding: '0 12px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
              <div style={{ fontSize: '11px', color: '#b6bdc7', marginTop: '4px' }}>PNG/SVG fond transparent recommandé</div>
            </div>
            <div>
              <label style={{ display: 'block', margin: '10px 0 6px', fontSize: '12px', fontWeight: 700, color: '#9ca3af' }}>
                Carte de fond (optionnel)
              </label>
              <select
                value={bgMap}
                onChange={(e) => setBgMap(e.target.value)}
                style={{
                  width: '100%',
                  height: '44px',
                  borderRadius: '10px',
                  border: '1px solid rgba(148,163,184,.35)',
                  background: 'rgba(2,6,23,.35)',
                  color: '#e6e6e8',
                  padding: '0 12px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              >
                <option value="none">Aucune</option>
                <option value="senegal">Contours Sénégal</option>
                <option value="africa">Contours Afrique</option>
              </select>
            </div>
          </div>

          {[1, 2, 3].map((num) => (
            <div key={num}>
              <h2 style={{ margin: '20px 0 10px', fontSize: '13px', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em' }}>
                Intervenant {num} {num === 1 ? '(principal)' : '(optionnel)'}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ display: 'block', margin: '10px 0 6px', fontSize: '12px', fontWeight: 700, color: '#9ca3af' }}>Nom</label>
                  <input
                    type="text"
                    value={speakers[num - 1].name}
                    onChange={(e) => updateSpeaker(num - 1, 'name', e.target.value)}
                    placeholder={num === 1 ? "Ex: Serigne Omar DIAO" : ""}
                    style={{
                      width: '100%',
                      height: '44px',
                      borderRadius: '10px',
                      border: '1px solid rgba(148,163,184,.35)',
                      background: 'rgba(2,6,23,.35)',
                      color: '#e6e6e8',
                      padding: '0 12px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', margin: '10px 0 6px', fontSize: '12px', fontWeight: 700, color: '#9ca3af' }}>Rôle</label>
                  <input
                    type="text"
                    value={speakers[num - 1].role}
                    onChange={(e) => updateSpeaker(num - 1, 'role', e.target.value)}
                    placeholder={num === 1 ? "Ingénieur Géomaticien" : ""}
                    style={{
                      width: '100%',
                      height: '44px',
                      borderRadius: '10px',
                      border: '1px solid rgba(148,163,184,.35)',
                      background: 'rgba(2,6,23,.35)',
                      color: '#e6e6e8',
                      padding: '0 12px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
              <label style={{ display: 'block', margin: '10px 0 6px', fontSize: '12px', fontWeight: 700, color: '#9ca3af' }}>Photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleSpeakerPhoto(num - 1, e)}
                style={{
                  width: '100%',
                  height: '44px',
                  borderRadius: '10px',
                  border: '1px solid rgba(148,163,184,.35)',
                  background: 'rgba(2,6,23,.35)',
                  color: '#e6e6e8',
                  padding: '0 12px',
                  fontSize: '14px',
                  outline: 'none',
                  marginBottom: '10px'
                }}
              />
            </div>
          ))}

          <h2 style={{ margin: '20px 0 10px', fontSize: '13px', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em' }}>
            Export
          </h2>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px', marginBottom: '16px' }}>
            {[
              { w: 1080, h: 1080, label: 'Carré — 1080×1080' },
              { w: 1080, h: 1920, label: 'Story — 1080×1920' },
              { w: 1350, h: 1080, label: 'Paysage — 1350×1080' },
              { w: 800, h: 800, label: 'Aperçu rapide — 800×800' }
            ].map((preset) => (
              <span
                key={preset.label}
                onClick={() => {
                  setExportSize({ width: preset.w, height: preset.h })
                  showToast(`Format: ${preset.w}×${preset.h}`)
                }}
                style={{
                  border: exportSize.width === preset.w && exportSize.height === preset.h
                    ? '1px solid rgba(79,70,229,.8)'
                    : '1px solid rgba(148,163,184,.45)',
                  padding: '6px 10px',
                  borderRadius: '999px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  background: exportSize.width === preset.w && exportSize.height === preset.h
                    ? 'rgba(79,70,229,.2)'
                    : 'transparent',
                  transition: 'all 0.2s'
                }}
              >
                {preset.label}
              </span>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button
              onClick={resetForm}
              style={{
                flex: 1,
                height: '44px',
                border: 'none',
                borderRadius: '10px',
                background: 'transparent',
                border: '1px solid rgba(148,163,184,.5)',
                color: '#e5e7eb',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(148,163,184,.08)'}
              onMouseLeave={(e) => e.target.style.background = 'transparent'}
            >
              Réinitialiser
            </button>
            <button
              onClick={generateImage}
              disabled={generating}
              style={{
                flex: 1,
                height: '44px',
                border: 'none',
                borderRadius: '10px',
                background: accentColor,
                color: '#fff',
                fontWeight: 800,
                cursor: generating ? 'not-allowed' : 'pointer',
                opacity: generating ? 0.7 : 1,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => !generating && (e.target.style.filter = 'brightness(1.05)')}
              onMouseLeave={(e) => e.target.style.filter = 'none'}
            >
              {generating ? 'Génération…' : 'Générer l\'image (PNG)'}
            </button>
          </div>
        </aside>

        {/* Preview */}
        <section style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
          <div
            ref={postRef}
            style={{
              width: isMobile ? '720px' : '800px',
              height: isMobile ? '720px' : '800px',
              position: 'relative',
              borderRadius: '22px',
              overflow: 'hidden',
              background: 'linear-gradient(135deg, #f8fafc, #eef2ff)',
              boxShadow: '0 25px 60px rgba(0,0,0,.45)',
              color: '#0b1324',
              transform: isMobile ? 'scale(0.9)' : 'none',
              transformOrigin: 'top center'
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
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundSize: '850px',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                filter: 'grayscale(100%)',
                ...mapBgStyle
              }}></div>
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
                  {logoUrl && (
                    <img
                      src={logoUrl}
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
                  )}
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
                  fontSize: '38px',
                  fontWeight: 900,
                  letterSpacing: '-.02em',
                  lineHeight: 1.2,
                  color: '#0f172a',
                  hyphens: 'auto',
                  textAlign: 'justify',
                  whiteSpace: 'pre-line',
                  maxWidth: '90%',
                  marginBottom: '10px'
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
        </section>
      </div>

      {/* Toast */}
      {toast.show && (
        <div style={{
          position: 'fixed',
          right: '18px',
          bottom: '18px',
          background: '#0b1324',
          color: '#e6e6e8',
          border: '1px solid rgba(148,163,184,.35)',
          padding: '12px 14px',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,.35)',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          zIndex: 50,
          animation: 'fadeIn 0.25s ease'
        }}>
          {toast.message}
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

