// src/pages/AdminLogin.jsx
import React, { useState } from 'react'
import { loginAdminApi } from '../services/api'
import './AdminLogin.css'
import logoASGF from '../img/Logo_officiel_ASGF.png'

export default function AdminLogin({ onLoginSuccess }) {
  const [numeroMembre, setNumeroMembre] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await loginAdminApi({ numeroMembre, password })
      console.log('Connecté ✅', data)
      
      if (typeof onLoginSuccess === 'function') {
        onLoginSuccess(data)
      }
    } catch (err) {
      console.error(err)
      setError(err.message || 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-login-page">
      {/* Top bar */}
      <header className="admin-login-header">
        <div className="header-left">
          <img src={logoASGF} alt="ASGF" className="asgf-logo" />
          <span className="asgf-title">
            Association des Sénégalais Géomaticiens de France
          </span>
        </div>
        <a href="https://asgf.fr" className="header-link" target="_blank" rel="noopener noreferrer">
          ↩ Retour au site
        </a>
      </header>

      {/* Main content */}
      <main className="admin-login-main">
        <section className="admin-login-info">
          <span className="badge">Administration du tableau de bord</span>
          <h1>Espace administrateur ASGF</h1>
          <p className="subtitle">
            Accès réservé aux membres du bureau exécutif et aux responsables de pôles.
          </p>
          <ul className="features">
            <li>
              <svg className="feature-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Valider et suivre les adhésions
            </li>
            <li>
              <svg className="feature-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
              </svg>
              Gérer les cartes membres
            </li>
            <li>
              <svg className="feature-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Piloter les formations et webinaires
            </li>
            <li>
              <svg className="feature-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Consulter les statistiques de la communauté
            </li>
          </ul>
        </section>

        <section className="admin-login-card">
          <h2>Connexion admin</h2>
          <p className="card-subtitle">
            Connectez-vous avec vos identifiants ASGF.
          </p>

          {error && (
            <div className="error-message">
              <svg className="error-icon" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="identifiant">Identifiant ou email</label>
              <input
                id="identifiant"
                type="text"
                placeholder="ASGF-2025-001 ou email"
                value={numeroMembre}
                onChange={(e) => setNumeroMembre(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Mot de passe</label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="form-row">
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                />
                <span>Se souvenir de moi</span>
              </label>
              <button type="button" className="link-btn" disabled={loading}>
                Mot de passe oublié ?
              </button>
            </div>

            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? (
                <>
                  <svg className="spinner-icon" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Connexion en cours...
                </>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>
        </section>
      </main>

      {/* Footer */}
      <footer className="admin-login-footer">
        ASGF · Association des Sénégalais Géomaticiens de France · © 2025
      </footer>
    </div>
  )
}
