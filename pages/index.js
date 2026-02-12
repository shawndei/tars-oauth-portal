import React, { useState, useEffect } from 'react'
import styles from '../styles/Home.module.css'

export default function Home() {
  const [isHealthy, setIsHealthy] = useState(false)
  const [status, setStatus] = useState('checking...')

  useEffect(() => {
    const checkBackend = async () => {
      try {
        // Use local proxy path (rewritten by next.config.js)
        const res = await fetch('/health', {
          headers: {
            'Accept': 'text/plain'
          }
        })
        if (res.ok) {
          setIsHealthy(true)
          setStatus('Backend connected ✓')
        } else {
          setStatus('Backend connection failed')
        }
      } catch (error) {
        console.error('Health check error:', error)
        setStatus('Backend unreachable')
      }
    }
    checkBackend()
  }, [])

  const handleGoogleLogin = () => {
    // Use local proxy path (rewritten by next.config.js)
    window.location.href = '/auth/google'
  }

  const handleGithubLogin = () => {
    // Use local proxy path (rewritten by next.config.js)
    window.location.href = '/auth/github'
  }

  const handleMicrosoftLogin = () => {
    // Use local proxy path (rewritten by next.config.js)
    window.location.href = '/auth/microsoft'
  }

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <div className={styles.loginCard}>
          <div className={styles.header}>
            <h1>TARS OAuth Portal</h1>
            <p className={styles.subtitle}>Multi-provider authentication system</p>
            <div className={`${styles.statusBadge} ${isHealthy ? styles.healthy : styles.unhealthy}`}>
              {status}
            </div>
          </div>

          <div className={styles.buttonGroup}>
            <button 
              className={`${styles.button} ${styles.googleButton}`}
              onClick={handleGoogleLogin}
              disabled={!isHealthy}
            >
              <span className={styles.icon}>🔵</span>
              Sign in with Google
            </button>

            <button 
              className={`${styles.button} ${styles.githubButton}`}
              onClick={handleGithubLogin}
              disabled={!isHealthy}
            >
              <span className={styles.icon}>⚫</span>
              Sign in with GitHub
            </button>

            <button 
              className={`${styles.button} ${styles.microsoftButton}`}
              onClick={handleMicrosoftLogin}
              disabled={!isHealthy}
            >
              <span className={styles.icon}>🟦</span>
              Sign in with Microsoft
            </button>
          </div>

          <div className={styles.footer}>
            <p>Secure authentication powered by TARS</p>
            <p className={styles.version}>Frontend v1.0.0 | Backend: {process.env.NEXT_PUBLIC_BACKEND_URL} (proxied)</p>
          </div>
        </div>
      </main>
    </div>
  )
}
