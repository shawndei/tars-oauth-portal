import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import styles from '../../styles/Home.module.css'

export default function AuthCallback() {
  const router = useRouter()
  const [userData, setUserData] = useState(null)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState('Processing authentication...')

  useEffect(() => {
    // Get user data from query parameters
    const { user, provider, error: authError } = router.query

    if (authError) {
      setError(authError)
      setStatus('Authentication failed')
      return
    }

    if (user) {
      try {
        // Decode the base64 user data
        const decoded = JSON.parse(Buffer.from(user, 'base64').toString())
        setUserData(decoded)
        setStatus('Authentication successful!')
        
        // Store token in localStorage
        if (decoded.accessToken) {
          localStorage.setItem('authToken', decoded.accessToken)
          localStorage.setItem('provider', provider)
          localStorage.setItem('user', JSON.stringify(decoded))
        }

        // Redirect to home after 2 seconds
        setTimeout(() => {
          router.push('/')
        }, 2000)
      } catch (err) {
        setError('Failed to parse authentication data')
        setStatus('Error')
      }
    }
  }, [router.query])

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <div className={styles.loginCard}>
          <div className={styles.header}>
            <h1>Authentication Callback</h1>
            <p className={styles.subtitle}>{status}</p>
          </div>

          {userData && (
            <div style={{ 
              padding: '20px', 
              backgroundColor: '#f0f0f0', 
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <h2>Welcome, {userData.name}!</h2>
              <p><strong>Email:</strong> {userData.email}</p>
              <p><strong>Provider:</strong> {userData.provider}</p>
              <p style={{ fontSize: '0.9em', color: '#666' }}>
                Redirecting to home page...
              </p>
            </div>
          )}

          {error && (
            <div style={{ 
              padding: '20px', 
              backgroundColor: '#ffebee', 
              borderRadius: '8px',
              color: '#c62828',
              marginBottom: '20px'
            }}>
              <h2>Error</h2>
              <p>{error}</p>
            </div>
          )}

          <button 
            className={styles.button}
            onClick={() => router.push('/')}
          >
            Back to Login
          </button>
        </div>
      </main>
    </div>
  )
}
