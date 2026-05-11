import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE = 'http://localhost:5000'

const withProtocol = (value) => {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

function App() {
  const [urlInput, setUrlInput] = useState('')
  const [result, setResult] = useState(null)
  const [linkCount, setLinkCount] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [health, setHealth] = useState('CHECKING')
  const [versionInfo, setVersionInfo] = useState({
    version: 'unknown',
    deployedAt: '--'
  })
  const [runtimeSeconds, setRuntimeSeconds] = useState(0)
  const [pulse, setPulse] = useState(52)
  const [noise, setNoise] = useState(34)

  const clockLabel = useMemo(
    () =>
      new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
    [runtimeSeconds]
  )

  const diagnostics = useMemo(
    () => [
      { label: 'CLOCK', value: clockLabel, meter: 0.5, hasMeter: true },
      {
        label: 'SESSION UPTIME',
        value: `${String(Math.floor(runtimeSeconds / 60)).padStart(2, '0')}:${String(runtimeSeconds % 60).padStart(2, '0')}`,
        meter: Math.min(1, runtimeSeconds / 300),
        hasMeter: true
      },
      {
        label: 'LINK FLOW',
        value: String(linkCount).padStart(2, '0'),
        meter: Math.min(1, linkCount / 6),
        hasMeter: true
      },
      { label: 'STATUS', value: health, hasMeter: false },
      { label: 'PULSE', value: `${pulse}%`, meter: pulse / 100, hasMeter: true },
      { label: 'SIGNAL NOISE', value: `${noise}%`, meter: noise / 100, hasMeter: true },
      { label: 'VERSION', value: versionInfo.version, hasMeter: false }
    ],
    [clockLabel, health, linkCount, noise, pulse, runtimeSeconds, versionInfo.version]
  )

  useEffect(() => {
    const tick = globalThis.setInterval(() => {
      const t = Date.now() / 1000
      setRuntimeSeconds((prev) => prev + 1)
      setPulse(Math.round(52 + Math.sin(t * 1.3) * 16 + Math.sin(t * 0.35) * 6))
      setNoise(Math.round(34 + Math.sin(t * 0.9) * 18))
    }, 1000)

    return () => globalThis.clearInterval(tick)
  }, [])

  useEffect(() => {
    let isMounted = true

    const getServerInfo = async () => {
      try {
        const [healthResponse, infoResponse] = await Promise.all([
          fetch(`${API_BASE}/health`),
          fetch(`${API_BASE}/info`)
        ])

        if (!isMounted) return

        setHealth(healthResponse.ok ? 'ONLINE' : 'DEGRADED')

        if (infoResponse.ok) {
          const info = await infoResponse.json()
          setVersionInfo({
            version: info.version || 'unknown',
            deployedAt: info.deployedAt || '--'
          })
        }
      } catch {
        if (!isMounted) return
        setHealth('OFFLINE')
      }
    }

    getServerInfo()
    const pollId = globalThis.setInterval(getServerInfo, 15000)

    return () => {
      isMounted = false
      globalThis.clearInterval(pollId)
    }
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()

    const normalized = withProtocol(urlInput)
    if (!normalized) {
      setError('Target URL required before execution.')
      return
    }

    setIsSubmitting(true)
    setError('')
    const start = performance.now()

    try {
      const response = await fetch(`${API_BASE}/shorten`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: normalized })
      })

      if (!response.ok) {
        throw new Error('Unable to shorten URL.')
      }

      const payload = await response.json()
      const item = {
        id: payload.id,
        shortUrl: payload.shortUrl,
        originalUrl: normalized,
        latencyMs: Math.round(performance.now() - start)
      }

      setResult(item)
      setLinkCount((prev) => prev + 1)
      setUrlInput('')
    } catch {
      setError('Shortening request failed. Backend might be unreachable.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyShortUrl = async () => {
    if (!result?.shortUrl) return

    try {
      await navigator.clipboard.writeText(result.shortUrl)
    } catch {
      setError('Clipboard access blocked in this browser context.')
    }
  }

  return (
    <div className="cyber-shell">
      <div className="noise" aria-hidden="true" />

      <header className="hud-panel">
        <div>
          <p className="micro">AER.SYSTEM</p>
          <h1>BLUE BULLET LINK CORE</h1>
        </div>
      </header>

      <main className="core-grid">
        <section className="panel primary">
          <div className="panel-title-row">
            <h2>URL COMPILER</h2>
            <span className="chip">MODE: CYBERNETIKA</span>
          </div>

          <form className="compile-form" onSubmit={handleSubmit}>
            <label htmlFor="target-url">TARGET URL</label>
            <input
              id="target-url"
              type="text"
              placeholder="https://example.com/very/long/path"
              value={urlInput}
              onChange={(event) => setUrlInput(event.target.value)}
              autoComplete="off"
            />
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'INITIALIZING...' : 'GENERATE BLUE BULLET'}
            </button>
          </form>

          {error ? <p className="error-line">ERROR: {error}</p> : null}

          {result ? (
            <article className="result-card">
              <p className="micro">SHORT LINK OUTPUT</p>
              <a href={result.shortUrl} target="_blank" rel="noreferrer">
                {result.shortUrl}
              </a>
              <p className="tiny">ID: {result.id}</p>
              <p className="tiny">TARGET: {result.originalUrl}</p>
              <div className="result-actions">
                <button type="button" onClick={copyShortUrl}>
                  COPY
                </button>
                <a href={result.shortUrl} target="_blank" rel="noreferrer">
                  OPEN
                </a>
              </div>
            </article>
          ) : (
            <p className="tiny">Awaiting command. No link generated yet.</p>
          )}
        </section>

        <section className="panel secondary">
          <h2>LIVE TELEMETRY</h2>
          <ul className="diag-grid">
            {diagnostics.map((item) => (
              <li key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                {item.hasMeter ? (
                  <div className="meter" aria-hidden="true">
                    <div style={{ width: `${Math.max(8, Math.round(item.meter * 100))}%` }} />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>

        </section>
      </main>

      <footer className="hud-footer">
        <p>&gt; FAILURE IS NOT AN OPTION</p>
        <p>&gt; SYSTEM STATE: {health}</p>
      </footer>
    </div>
  )
}

export default App
