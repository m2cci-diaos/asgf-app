import React, { useState } from 'react'

function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()

    // Login simple (plus tard on sécurise avec Supabase Auth)
    if (email === 'serigneomardiao@gmail.com' && password === 'ASGF2025') {
      onLogin(true)
    } else {
      setError("Email ou mot de passe incorrect.")
    }
  }

  return (
    <div style={{ maxWidth: '400px', margin: '80px auto', padding: '20px' }}>
      <h2 style={{ textAlign: 'center' }}>Connexion Admin</h2>

      <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
        
        <label>Email</label>
        <input 
          type="email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
        />

        <label>Mot de passe</label>
        <input 
          type="password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
        />

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <button 
          type="submit"
          style={{
            width: '100%',
            padding: '10px',
            background: '#1a73e8',
            color: 'white',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Se connecter
        </button>
      </form>
    </div>
  )
}

export default AdminLogin
