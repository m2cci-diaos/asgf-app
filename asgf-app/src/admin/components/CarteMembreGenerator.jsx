import React, { useState, useRef, useEffect } from 'react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import signatureOmar from '../img/signature_omar.png'

const CarteMembreGenerator = ({ memberData = null, onClose = null }) => {
  const cardRef = useRef(null)
  const [formData, setFormData] = useState({
    firstName: memberData?.prenom || '',
    lastName: memberData?.nom || '',
    memberId: memberData?.numero_membre || '',
    role: memberData?.fonction || '',
    issueDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    section: memberData?.pays ? `${memberData.pays}${memberData.ville ? ` / ${memberData.ville}` : ''}` : 'France / Lyon',
    status: 'Membre actif'
  })
  const [photoDataUrl, setPhotoDataUrl] = useState(memberData?.photo_url || null)
  
  // Si le membre a une photo dans la BD, l'utiliser par défaut
  useEffect(() => {
    if (memberData?.photo_url) {
      setPhotoDataUrl(memberData.photo_url)
    }
  }, [memberData?.photo_url])
  const [logoDataUrl, setLogoDataUrl] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 1200)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (memberData) {
      setFormData(prev => ({
        ...prev,
        firstName: memberData.prenom || prev.firstName,
        lastName: memberData.nom || prev.lastName,
        memberId: memberData.numero_membre || prev.memberId,
        role: memberData.fonction || prev.role,
        section: memberData.pays ? `${memberData.pays}${memberData.ville ? ` / ${memberData.ville}` : ''}` : prev.section
      }))
      if (memberData.photo_url) {
        setPhotoDataUrl(memberData.photo_url)
      }
    }
  }, [memberData])

  const formatDateISOtoFR = (iso) => {
    if (!iso) return "—"
    return new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
  }

  const handleFileSelect = (e, setter) => {
    const file = e.target.files?.[0]
    if (!file) {
      setter(null)
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => setter(ev.target.result)
    reader.onerror = () => setter(null)
    reader.readAsDataURL(file)
  }

  const generatePDF = async () => {
    if (!formData.memberId) {
      alert("❌ Le numéro de membre est requis")
      return
    }

    setGenerating(true)

    try {
      console.log('📋 Génération carte membre - Données:', {
        ...formData,
        photo_url: photoDataUrl ? 'Présente' : 'Absente',
      })

      // Préparer les données pour le backend
      const carteData = {
        numero_membre: formData.memberId,
        prenom: formData.firstName,
        nom: formData.lastName,
        fonction: formData.role,
        date_emission: formData.issueDate,
        date_validite: formData.expiryDate,
        pays: formData.section?.split(' / ')[0] || '',
        ville: formData.section?.split(' / ')[1] || '',
        statut_carte: formData.status,
        photo_url: photoDataUrl, // URL de la photo (base64 data URL ou URL publique)
      }

      // Appeler l'API backend pour générer et sauvegarder la carte
      const { createCarteMembre } = await import('../services/api')
      const result = await createCarteMembre(carteData)

      console.log('✅ Carte membre créée avec succès:', result)

      if (result?.lien_pdf) {
        alert(`✅ Carte membre créée avec succès !\n\nLe PDF a été généré et sauvegardé sur Google Drive.\n\nLien: ${result.lien_pdf}`)
        // Optionnel : ouvrir le lien dans un nouvel onglet
        if (window.confirm('Voulez-vous ouvrir le PDF dans un nouvel onglet ?')) {
          window.open(result.lien_pdf, '_blank')
        }
      } else {
        alert("✅ Carte membre créée avec succès !\n\n⚠️ Le PDF n'a pas pu être généré. Vérifiez les logs du backend.")
      }

      // Fermer le générateur si une fonction onClose est fournie
      if (onClose) {
        onClose()
      }
    } catch (error) {
      console.error("❌ Erreur génération carte membre:", error)
      alert(`❌ Erreur lors de la création de la carte : ${error.message}`)
    } finally {
      setGenerating(false)
    }
  }

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const nameDisplay = `${formData.firstName || 'Prénom'} ${(formData.lastName || 'NOM').toUpperCase()}`
  const validityDisplay = formData.issueDate || formData.expiryDate
    ? `${formatDateISOtoFR(formData.issueDate)} au ${formatDateISOtoFR(formData.expiryDate)}`
    : "—"

  return (
    <div style={{
      padding: '1.5rem',
      background: '#0f172a',
      minHeight: '100vh',
      color: '#e2e8f0',
      fontFamily: '"Inter", system-ui, sans-serif'
    }}>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: '#1e293b',
            border: '1px solid #334155',
            color: '#e2e8f0',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600
          }}
        >
          ✕ Fermer
        </button>
      )}

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'grid',
        gap: '24px',
        gridTemplateColumns: isMobile ? '1fr' : '400px 1fr'
      }}>
        {/* Control Panel */}
        <div style={{
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '16px',
          padding: '24px'
        }}>
          <h1 style={{ fontSize: '24px', margin: '0 0 16px', fontWeight: 700, letterSpacing: '-0.5px' }}>
            Créer une carte membre
          </h1>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#94a3b8', margin: '12px 0 6px' }}>
                Prénom
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => updateField('firstName', e.target.value)}
                placeholder="Ex. Serigne Omar"
                style={{
                  width: '100%',
                  height: '44px',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  background: '#0f172a',
                  color: '#e2e8f0',
                  padding: '0 14px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6'
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.2)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#334155'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#94a3b8', margin: '12px 0 6px' }}>
                Nom
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => updateField('lastName', e.target.value)}
                placeholder="Ex. DIAO"
                style={{
                  width: '100%',
                  height: '44px',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  background: '#0f172a',
                  color: '#e2e8f0',
                  padding: '0 14px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6'
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.2)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#334155'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#94a3b8', margin: '12px 0 6px' }}>
                Matricule
              </label>
              <input
                type="text"
                value={formData.memberId}
                onChange={(e) => updateField('memberId', e.target.value)}
                placeholder="Ex. AGSF-2025-001"
                style={{
                  width: '100%',
                  height: '44px',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  background: '#0f172a',
                  color: '#e2e8f0',
                  padding: '0 14px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6'
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.2)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#334155'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#94a3b8', margin: '12px 0 6px' }}>
                Fonction
              </label>
              <input
                type="text"
                value={formData.role}
                onChange={(e) => updateField('role', e.target.value)}
                placeholder="Ex. Chargé d'Études"
                style={{
                  width: '100%',
                  height: '44px',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  background: '#0f172a',
                  color: '#e2e8f0',
                  padding: '0 14px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6'
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.2)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#334155'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#94a3b8', margin: '12px 0 6px' }}>
                Date d'émission
              </label>
              <input
                type="date"
                value={formData.issueDate}
                onChange={(e) => updateField('issueDate', e.target.value)}
                style={{
                  width: '100%',
                  height: '44px',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  background: '#0f172a',
                  color: '#e2e8f0',
                  padding: '0 14px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6'
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.2)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#334155'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#94a3b8', margin: '12px 0 6px' }}>
                Valable jusqu'au
              </label>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => updateField('expiryDate', e.target.value)}
                style={{
                  width: '100%',
                  height: '44px',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  background: '#0f172a',
                  color: '#e2e8f0',
                  padding: '0 14px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6'
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.2)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#334155'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#94a3b8', margin: '12px 0 6px' }}>
                Pays / Section
              </label>
              <input
                type="text"
                value={formData.section}
                onChange={(e) => updateField('section', e.target.value)}
                placeholder="Ex. France / Lyon"
                style={{
                  width: '100%',
                  height: '44px',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  background: '#0f172a',
                  color: '#e2e8f0',
                  padding: '0 14px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6'
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.2)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#334155'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#94a3b8', margin: '12px 0 6px' }}>
                Statut
              </label>
              <select
                value={formData.status}
                onChange={(e) => updateField('status', e.target.value)}
                style={{
                  width: '100%',
                  height: '44px',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  background: '#0f172a',
                  color: '#e2e8f0',
                  padding: '0 14px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6'
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.2)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#334155'
                  e.target.style.boxShadow = 'none'
                }}
              >
                <option value="Membre actif">Membre actif</option>
                <option value="Membre fondateur">Membre fondateur</option>
                <option value="Membre d'honneur">Membre d'honneur</option>
                <option value="Étudiant">Étudiant</option>
              </select>
            </div>
          </div>

          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#94a3b8', margin: '12px 0 6px' }}>
            Photo du membre (jpg/png)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileSelect(e, setPhotoDataUrl)}
            style={{
              width: '100%',
              height: '44px',
              borderRadius: '8px',
              border: '1px solid #334155',
              background: '#0f172a',
              color: '#e2e8f0',
              padding: '0 14px',
              fontSize: '14px',
              outline: 'none'
            }}
          />
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>
            Conseil : portrait 3:4, visage centré, fond clair.
          </div>

          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#94a3b8', margin: '12px 0 6px', marginTop: '16px' }}>
            Logo de l'association (png/svg)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileSelect(e, setLogoDataUrl)}
            style={{
              width: '100%',
              height: '44px',
              borderRadius: '8px',
              border: '1px solid #334155',
              background: '#0f172a',
              color: '#e2e8f0',
              padding: '0 14px',
              fontSize: '14px',
              outline: 'none'
            }}
          />
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>
            Conseil : logo carré, fond transparent de préférence.
          </div>

          <button
            onClick={generatePDF}
            disabled={generating}
            style={{
              width: '100%',
              height: '44px',
              marginTop: '16px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontWeight: 700,
              cursor: generating ? 'not-allowed' : 'pointer',
              border: 'none',
              background: '#3b82f6',
              color: '#fff',
              borderRadius: '8px',
              transition: '0.2s all',
              opacity: generating ? 0.7 : 1
            }}
            onMouseEnter={(e) => !generating && (e.target.style.background = '#2563eb')}
            onMouseLeave={(e) => !generating && (e.target.style.background = '#3b82f6')}
          >
            {generating ? '⏳ Génération en cours...' : '📄 Générer le PDF'}
          </button>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>
            Le PDF généré sera téléchargé automatiquement.
          </div>
        </div>

        {/* Preview */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100%' }}>
          <div
            ref={cardRef}
            style={{
              width: isMobile ? '640px' : '856px',
              height: isMobile ? '404px' : '540px',
              position: 'relative',
              borderRadius: '28px',
              overflow: 'hidden',
              background: '#ffffff',
              color: '#020617',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
              fontFamily: '"Inter", sans-serif',
              transform: isMobile ? 'scale(0.8)' : 'none',
              transformOrigin: 'top center'
            }}
          >
            {/* Background gradient */}
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'radial-gradient(circle at 10% 15%, hsla(211, 100%, 75%, 0.15), transparent 40%), radial-gradient(circle at 90% 85%, hsla(140, 80%, 70%, 0.12), transparent 50%)'
            }}></div>

            {/* Header */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              padding: '24px 30px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px'
            }}>
              {logoDataUrl && (
                <img
                  src={logoDataUrl}
                  alt="Logo"
                  style={{ width: '48px', height: '48px', objectFit: 'contain' }}
                />
              )}
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#475569', lineHeight: 1.3 }}>
                <b style={{ color: '#020617', display: 'block', fontSize: '18px' }}>
                  Association des Sénégalais Géomaticiens de France
                </b>
                Carte de membre officielle
              </div>
            </div>

            {/* Content */}
            <div style={{
              position: 'absolute',
              top: '90px',
              bottom: '24px',
              left: '30px',
              right: '30px',
              display: 'grid',
              gridTemplateColumns: '240px 1fr',
              gap: '30px'
            }}>
              {/* Photo Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{
                  width: '100%',
                  aspectRatio: '3 / 4',
                  background: '#e2e8f0',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  border: '4px solid #fff',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                  display: 'grid',
                  placeItems: 'center',
                  textAlign: 'center'
                }}>
                  {photoDataUrl ? (
                    <img
                      src={photoDataUrl}
                      alt="Photo membre"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.style.display = 'none'
                        e.target.parentElement.innerHTML = '<span style="fontSize: 13px; color: #64748b;">Erreur image</span>'
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: '13px', color: '#64748b' }}>Aucune photo<br />importée</span>
                  )}
                </div>
                <div style={{ textAlign: 'center', fontSize: '12px', color: '#475569', fontWeight: 600 }}>
                  Matricule
                  <span style={{ display: 'block', fontSize: '16px', fontWeight: 700, color: '#020617', marginTop: '4px' }}>
                    {formData.memberId || 'XXXX-000'}
                  </span>
                </div>
              </div>

              {/* Info Column */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ marginTop: '10px' }}>
                  <div style={{ fontSize: '40px', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-1px' }}>
                    {nameDisplay}
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 600, color: '#3b82f6', marginTop: '6px' }}>
                    {formData.role || 'Fonction'}
                  </div>
                </div>

                <div style={{ marginTop: '30px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <b style={{ display: 'block', fontSize: '12px', color: '#475569', fontWeight: 600, marginBottom: '5px', textTransform: 'uppercase' }}>
                      Statut
                    </b>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: '#020617' }}>
                      {formData.status}
                    </span>
                  </div>
                  <div>
                    <b style={{ display: 'block', fontSize: '12px', color: '#475569', fontWeight: 600, marginBottom: '5px', textTransform: 'uppercase' }}>
                      Section
                    </b>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: '#020617' }}>
                      {formData.section || '—'}
                    </span>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <b style={{ display: 'block', fontSize: '12px', color: '#475569', fontWeight: 600, marginBottom: '5px', textTransform: 'uppercase' }}>
                      Validité
                    </b>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: '#020617' }}>
                      {validityDisplay}
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div style={{ textAlign: 'center' }}>
                    <img
                      src={signatureOmar}
                      alt="Signature Président"
                      style={{
                        height: '60px',
                        width: 'auto',
                        maxWidth: '180px',
                        objectFit: 'contain',
                        marginBottom: '4px',
                        filter: 'brightness(0)'
                      }}
                    />
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#020617', marginBottom: '2px', letterSpacing: '1px' }}>
                      SOD
                    </div>
                    <small style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>Le Président</small>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ height: '2px', background: '#d1d5db', width: '140px', margin: '0 auto 6px' }}></div>
                    <small style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>Le Trésorier Général</small>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                    Émis le <span>{formatDateISOtoFR(formData.issueDate)}</span><br />
                    © www.agsf.sn
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom bar */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '10px',
              background: 'linear-gradient(90deg, #3b82f6 0%, #f59e0b 50%, #22c55e 100%)'
            }}></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CarteMembreGenerator

