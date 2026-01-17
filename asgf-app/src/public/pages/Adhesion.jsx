import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdhesionStyles } from '../components/PageStyles'
import { supabase } from '../config/supabase.config'
import emailjs from '@emailjs/browser'
import { EMAILJS_CONFIG } from '../config/emailjs.config'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://wooyxkfdzehvedvivhhd.supabase.co'
const PUBLIC_ADHESION_URL = `${SUPABASE_URL}/functions/v1/public-adhesion`

function Adhesion() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    // Informations personnelles
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    dateNaissance: '',
    adresse: '',
    ville: '',
    pays: '',
    paysAutre: '',
    // Informations professionnelles
    statut_pro: '',
    domaine: '',
    // Informations académiques
    universite: '',
    niveau: '',
    annee: '',
    specialite: '',
    // Centres d'intérêt et motivation
    interets: [],
    motivation: '',
    competences: '',
    // Options
    conditions: false,
    newsletter: false
  })

  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const scrollToTop = () => {
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    }
    scrollToTop()
    requestAnimationFrame(() => requestAnimationFrame(scrollToTop))
    setTimeout(scrollToTop, 0)
    setTimeout(scrollToTop, 10)

    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
        }
      })
    }, observerOptions)

    document.querySelectorAll('.fade-in').forEach(el => {
      observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target

    if (type === 'checkbox') {
      if (name === 'interets') {
        const interets = formData.interets.includes(value)
          ? formData.interets.filter(i => i !== value)
          : [...formData.interets, value]
        setFormData({ ...formData, interets })
      } else {
        setFormData({ ...formData, [name]: checked })
      }
    } else {
      setFormData({ ...formData, [name]: value })
    }

    if (errors[name]) {
      setErrors({ ...errors, [name]: '' })
    }
    
    // Réinitialiser paysAutre si le pays change et n'est plus "autre"
    if (name === 'pays' && value !== 'autre') {
      setFormData(prev => ({ ...prev, paysAutre: '' }))
    }
  }

  const validate = () => {
    const newErrors = {}

    if (!formData.nom.trim()) newErrors.nom = 'Le nom est requis'
    if (!formData.prenom.trim()) newErrors.prenom = 'Le prénom est requis'
    if (!formData.email.trim()) {
      newErrors.email = "L'email est requis"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email invalide'
    }
    if (!formData.telephone.trim()) newErrors.telephone = 'Le téléphone est requis'
    if (!formData.universite.trim()) newErrors.universite = "L'université est requise"
    if (!formData.niveau) newErrors.niveau = 'Le niveau est requis'
    if (!formData.specialite.trim()) newErrors.specialite = 'La spécialité est requise'
    if (!formData.motivation.trim()) newErrors.motivation = 'La motivation est requise'
    if (formData.pays === 'autre' && !formData.paysAutre.trim()) {
      newErrors.paysAutre = 'Veuillez préciser le pays'
    }
    if (!formData.conditions) newErrors.conditions = 'Vous devez accepter les conditions'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)

    try {
      const dataToInsert = {
        // Informations personnelles
        nom: formData.nom,
        prenom: formData.prenom,
        email: formData.email,
        telephone: formData.telephone,
        adresse: formData.adresse || null,
        ville: formData.ville || null,
        pays: formData.pays === 'autre' ? formData.paysAutre : (formData.pays || null),
        date_naissance: formData.dateNaissance || null,
        // Informations professionnelles
        statut_pro: formData.statut_pro || null,
        domaine: formData.domaine || null,
        // Informations académiques
        universite: formData.universite || null,
        niveau_etudes: formData.niveau || null,
        annee_universitaire: formData.annee || null,
        specialite: formData.specialite || null,
        // Centres d'intérêt et motivation
        interets: formData.interets,
        motivation: formData.motivation,
        competences: formData.competences || null,
        // Options
        is_newsletter_subscribed: formData.newsletter
      }

      // Utiliser l'Edge Function au lieu de l'insertion directe
      const response = await fetch(PUBLIC_ADHESION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(dataToInsert),
      })

      const result = await response.json()
      console.log('RÉSULTAT EDGE FUNCTION :', result)

      if (!result.success) {
        let message = result.message || `Erreur d'enregistrement : ${response.statusText}`
        
        if (response.status === 409 || message.includes('déjà enregistré')) {
          message = "Cet email est déjà enregistré. Veuillez en utiliser un autre ou contactez l'ASGF."
        } else if (response.status === 400) {
          message = message || "Les données fournies sont invalides. Veuillez vérifier vos informations."
        } else if (response.status >= 500) {
          message = "Une erreur technique est survenue lors de l'enregistrement. Veuillez réessayer dans quelques instants ou contactez l'ASGF."
        }
        
        alert(message)
        return
      }

      const data = result.data

      // 1️⃣ Mail au MEMBRE : confirmation de réception
      try {
        await emailjs.send(
          EMAILJS_CONFIG.serviceId,
          EMAILJS_CONFIG.templateIdMember,
          {
            email: formData.email,
            to_name: `${formData.prenom} ${formData.nom}`,
          },
          EMAILJS_CONFIG.publicKey
        )
      } catch (err) {
        console.error('Erreur mail membre :', err)
      }

      // 2️⃣ Envoi du mail à l'admin (notification)
      try {
        await emailjs.send(
          EMAILJS_CONFIG.serviceId,
          EMAILJS_CONFIG.templateIdAdmin,
          {
            admin_email: 'association.geomaticiens.sf@gmail.com',
            nom: formData.nom,
            prenom: formData.prenom,
            email: formData.email,
            telephone: formData.telephone,
            universite: formData.universite,
            niveau: formData.niveau,
          },
          EMAILJS_CONFIG.publicKey
        )
      } catch (err) {
        console.error("Erreur mail admin :", err)
      }

      // Rediriger vers la page de succès avec les données du membre
      navigate('/adhesion/success', {
        state: {
          memberData: {
            nom: formData.nom,
            prenom: formData.prenom,
            email: formData.email
          }
        },
        replace: true
      })
    } catch (err) {
      console.error('Erreur fatale lors de l\'envoi:', err)
      alert('Une erreur inattendue est survenue. Veuillez réessayer.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const interetsOptions = [
    { id: 'sig', label: 'Systèmes d\'Information Géographique (SIG)' },
    { id: 'teledetection', label: 'Télédétection' },
    { id: 'cartographie', label: 'Cartographie numérique' },
    { id: 'topographie', label: 'Topographie/Géodésie' },
    { id: 'webmapping', label: 'WebMapping' },
    { id: 'drone', label: 'Drones et photogrammétrie' },
    { id: 'base', label: 'Système de Gestion de base de données' }
  ]

  const statutProOptions = [
    { value: 'etudiant', label: 'Étudiant' },
    { value: 'professionnel', label: 'Professionnel' },
    { value: 'chercheur', label: 'Chercheur' },
    { value: 'enseignant', label: 'Enseignant' },
    { value: 'autre', label: 'Autre' }
  ]

  const domaineOptions = [
    { value: 'sig', label: 'SIG (Systèmes d\'Information Géographique)' },
    { value: 'teledetection', label: 'Télédétection' },
    { value: 'cartographie', label: 'Cartographie' },
    { value: 'topographie', label: 'Topographie/Géodésie' },
    { value: 'urbanisme', label: 'Urbanisme et Aménagement' },
    { value: 'environnement', label: 'Environnement' },
    { value: 'agriculture', label: 'Agriculture' },
    { value: 'autre', label: 'Autre' }
  ]

  return (
    <>
      <AdhesionStyles />
      <section className="adhesion-section">
        <div className="container">
          <div className="adhesion-container fade-in">
            <div className="adhesion-header">
              <h1><i className="fas fa-user-plus"></i> Rejoignez le ASGF</h1>
              <p>Devenez membre de la communauté des étudiants sénégalais en géomatique en France et bénéficiez de nombreux avantages pour votre parcours académique et professionnel.</p>
            </div>

            <div className="benefits-section">
              <h3><i className="fas fa-gift"></i> Pourquoi nous rejoindre ?</h3>
              <ul className="benefits-list">
                <li>Accès à un réseau de professionnels et d'étudiants en géomatique</li>
                <li>Formations gratuites sur les outils SIG et télédétection</li>
                <li>Opportunités de stages et d'emplois</li>
                <li>Participation à des projets innovants</li>
                <li>Événements culturels et académiques</li>
                <li>Mentorat et accompagnement personnalisé</li>
                <li>Accès à des ressources pédagogiques exclusives</li>
              </ul>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Informations Personnelles */}
              <div className="form-section">
                <h3><i className="fas fa-user"></i> Informations Personnelles</h3>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="nom">Nom <span className="required">*</span></label>
                    <input 
                      type="text" 
                      id="nom" 
                      name="nom" 
                      value={formData.nom}
                      onChange={handleChange}
                      className={errors.nom ? 'error' : ''}
                      required
                    />
                    {errors.nom && <span className="error-message">{errors.nom}</span>}
                  </div>
                  <div className="form-group">
                    <label htmlFor="prenom">Prénom <span className="required">*</span></label>
                    <input 
                      type="text" 
                      id="prenom" 
                      name="prenom" 
                      value={formData.prenom}
                      onChange={handleChange}
                      className={errors.prenom ? 'error' : ''}
                      required
                    />
                    {errors.prenom && <span className="error-message">{errors.prenom}</span>}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="email">Email <span className="required">*</span></label>
                    <input 
                      type="email" 
                      id="email" 
                      name="email" 
                      value={formData.email}
                      onChange={handleChange}
                      className={errors.email ? 'error' : ''}
                      required
                    />
                    {errors.email && <span className="error-message">{errors.email}</span>}
                  </div>
                  <div className="form-group">
                    <label htmlFor="telephone">Téléphone <span className="required">*</span></label>
                    <input 
                      type="tel" 
                      id="telephone" 
                      name="telephone" 
                      value={formData.telephone}
                      onChange={handleChange}
                      className={errors.telephone ? 'error' : ''}
                      required
                    />
                    {errors.telephone && <span className="error-message">{errors.telephone}</span>}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="dateNaissance">Date de naissance</label>
                  <input 
                    type="date" 
                    id="dateNaissance" 
                    name="dateNaissance" 
                    value={formData.dateNaissance}
                    onChange={handleChange}
                    max={new Date().toISOString().split('T')[0]}
                    min={new Date(new Date().setFullYear(new Date().getFullYear() - 100)).toISOString().split('T')[0]}
                    style={{
                      padding: '0.75rem',
                      fontSize: '1rem',
                      border: '2px solid #ddd',
                      borderRadius: '8px',
                      width: '100%',
                      fontFamily: 'inherit',
                      cursor: 'pointer'
                    }}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="adresse">Adresse (rue et numéro)</label>
                  <input 
                    type="text" 
                    id="adresse" 
                    name="adresse" 
                    value={formData.adresse}
                    onChange={handleChange}
                    placeholder="Ex: 10 rue des Géomaticiens"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="ville">Ville</label>
                    <input 
                      type="text" 
                      id="ville" 
                      name="ville" 
                      value={formData.ville}
                      onChange={handleChange}
                      placeholder="Ex: Dakar / Strasbourg"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="pays">Pays</label>
                    <select 
                      id="pays" 
                      name="pays" 
                      value={formData.pays}
                      onChange={handleChange}
                      style={{
                        padding: '0.75rem',
                        fontSize: '1rem',
                        border: '2px solid #ddd',
                        borderRadius: '8px',
                        width: '100%',
                        fontFamily: 'inherit',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="">Sélectionnez...</option>
                      <option value="Sénégal">Sénégal</option>
                      <option value="France">France</option>
                      <option value="autre">Autres</option>
                    </select>
                  </div>
                </div>
                {formData.pays === 'autre' && (
                  <div className="form-group">
                    <label htmlFor="paysAutre">Précisez le pays <span className="required">*</span></label>
                    <input 
                      type="text" 
                      id="paysAutre" 
                      name="paysAutre" 
                      value={formData.paysAutre}
                      onChange={handleChange}
                      placeholder="Ex: Côte d'Ivoire, Maroc, etc."
                      required={formData.pays === 'autre'}
                      className={errors.paysAutre ? 'error' : ''}
                      style={{
                        padding: '0.75rem',
                        fontSize: '1rem',
                        border: '2px solid #ddd',
                        borderRadius: '8px',
                        width: '100%',
                        fontFamily: 'inherit'
                      }}
                    />
                    {errors.paysAutre && <span className="error-message">{errors.paysAutre}</span>}
                  </div>
                )}
              </div>

              {/* Informations Professionnelles */}
              <div className="form-section">
                <h3><i className="fas fa-briefcase"></i> Informations Professionnelles</h3>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="statut_pro">Statut Professionnel</label>
                    <select 
                      id="statut_pro" 
                      name="statut_pro" 
                      value={formData.statut_pro}
                      onChange={handleChange}
                    >
                      <option value="">Sélectionnez...</option>
                      {statutProOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="domaine">Domaine d'activité</label>
                    <select 
                      id="domaine" 
                      name="domaine" 
                      value={formData.domaine}
                      onChange={handleChange}
                    >
                      <option value="">Sélectionnez...</option>
                      {domaineOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Informations Académiques */}
              <div className="form-section">
                <h3><i className="fas fa-graduation-cap"></i> Informations Académiques</h3>
                
                <div className="form-group">
                  <label htmlFor="universite">Université actuelle <span className="required">*</span></label>
                  <input 
                    type="text" 
                    id="universite" 
                    name="universite" 
                    placeholder="Ex: Université de Strasbourg"
                    value={formData.universite}
                    onChange={handleChange}
                    className={errors.universite ? 'error' : ''}
                    required
                  />
                  {errors.universite && <span className="error-message">{errors.universite}</span>}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="niveau">Niveau d'études <span className="required">*</span></label>
                    <select 
                      id="niveau" 
                      name="niveau" 
                      value={formData.niveau}
                      onChange={handleChange}
                      className={errors.niveau ? 'error' : ''}
                      required
                    >
                      <option value="">Sélectionnez...</option>
                      <option value="licence1">Licence 1</option>
                      <option value="licence2">Licence 2</option>
                      <option value="licence3">Licence 3</option>
                      <option value="master1">Master 1</option>
                      <option value="master2">Master 2</option>
                      <option value="doctorat">Doctorat</option>
                      <option value="autre">Autre</option>
                    </select>
                    {errors.niveau && <span className="error-message">{errors.niveau}</span>}
                  </div>
                  <div className="form-group">
                    <label htmlFor="annee">Année universitaire</label>
                    <input 
                      type="text" 
                      id="annee" 
                      name="annee" 
                      placeholder="2024-2025"
                      value={formData.annee}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="specialite">Spécialité/Filière <span className="required">*</span></label>
                  <input 
                    type="text" 
                    id="specialite" 
                    name="specialite" 
                    placeholder="Ex: Master SIGAT, Géomatique, Télédétection..."
                    value={formData.specialite}
                    onChange={handleChange}
                    className={errors.specialite ? 'error' : ''}
                    required
                  />
                  {errors.specialite && <span className="error-message">{errors.specialite}</span>}
                </div>
              </div>

              {/* Centres d'intérêt */}
              <div className="form-section">
                <h3><i className="fas fa-compass"></i> Centres d'intérêt en Géomatique</h3>
                
                <div className="form-group">
                  <label>Domaines d'intérêt (plusieurs choix possibles)</label>
                  <div className="checkbox-container">
                    {interetsOptions.map(option => (
                      <div key={option.id} className="checkbox-item">
                        <input 
                          type="checkbox" 
                          id={option.id} 
                          name="interets" 
                          value={option.id}
                          checked={formData.interets.includes(option.id)}
                          onChange={handleChange}
                        />
                        <label htmlFor={option.id}>{option.label}</label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Motivation */}
              <div className="form-section">
                <h3><i className="fas fa-heart"></i> Motivation</h3>
                
                <div className="form-group">
                  <label htmlFor="motivation">Pourquoi souhaitez-vous rejoindre l'ASGF ? <span className="required">*</span></label>
                  <textarea 
                    id="motivation" 
                    name="motivation" 
                    placeholder="Expliquez-nous vos motivations et ce que vous espérez apporter et recevoir de la communauté..."
                    value={formData.motivation}
                    onChange={handleChange}
                    className={errors.motivation ? 'error' : ''}
                    required
                  ></textarea>
                  {errors.motivation && <span className="error-message">{errors.motivation}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="competences">Compétences particulières</label>
                  <textarea 
                    id="competences" 
                    name="competences" 
                    rows="3" 
                    placeholder="Logiciels maîtrisés, langages de programmation, expériences professionnelles..."
                    value={formData.competences}
                    onChange={handleChange}
                  ></textarea>
                </div>
              </div>

              {/* Conditions et Newsletter */}
              <div className="form-section">
                <div className="checkbox-group">
                  <input 
                    type="checkbox" 
                    id="conditions" 
                    name="conditions" 
                    checked={formData.conditions}
                    onChange={handleChange}
                    required
                  />
                  <label htmlFor="conditions">
                    J'accepte les conditions d'adhésion et je m'engage à respecter les valeurs du ASGF <span className="required">*</span>
                  </label>
                </div>
                {errors.conditions && <span className="error-message">{errors.conditions}</span>}
                <div className="checkbox-group">
                  <input 
                    type="checkbox" 
                    id="newsletter" 
                    name="newsletter" 
                    checked={formData.newsletter}
                    onChange={handleChange}
                  />
                  <label htmlFor="newsletter">Je souhaite recevoir la newsletter et les actualités du ASGF</label>
                </div>
              </div>

              <button type="submit" className="submit-btn" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Envoi en cours...
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane"></i> Envoyer ma demande d'adhésion
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </section>
    </>
  )
}

export default Adhesion
