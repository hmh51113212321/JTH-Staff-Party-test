import { useCallback, useEffect, useRef, useState } from 'react'
import { drawDetails, entries } from './data.js'
import motorcyclePrize from './assets/motorcycle-prize.svg'
import genericPrize from './assets/generic-prize.svg'
import celebrationAudio from './assets/Congratulations clapping and cheering video of applause sound effects with fireworks.mp3'
import './App.css'

const celebrationPieces = Array.from({ length: 48 }, (_, index) => ({
  left: `${(index * 47 + 9) % 100}%`,
  delay: `${(index * 83) % 900}ms`,
  duration: `${2800 + ((index * 137) % 1500)}ms`,
  drift: `${((index * 29) % 180) - 90}px`,
  rotation: `${(index * 71) % 540}deg`,
  type: `confetti-piece-${index % 4}`,
}))

const supportedMediaTypes = new Set([
  'image/avif',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/webm',
])
const mediaExtensionByType = {
  'image/avif': 'avif',
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
}

function getEntryMedia(entry, mediaByTicket) {
  const originalEntry = entries.find((candidate) => (
    candidate.ticketNumber === entry.ticketNumber
  )) ?? entry
  const sameItemMedia = entries.find((candidate) => (
    candidate.itemName === originalEntry.itemName && mediaByTicket[candidate.ticketNumber]
  ))
  return mediaByTicket[entry.ticketNumber]
    ?? (sameItemMedia && mediaByTicket[sameItemMedia.ticketNumber])
    ?? entry.media
}

function SiteHeader({ route, onNavigate }) {
  return (
    <header className="topbar">
      <a
        className="brand"
        href="/"
        aria-label="Lucky Draw home"
        onClick={(event) => onNavigate(event, '/')}
      >
        <span className="brand-mark" aria-hidden="true">✳</span>
        <span className="brand-accent">JASMINE TAUNGGYI HOTEL</span>
      </a>
      <span className="edition-label">THE COMMUNITY GIVEAWAY</span>
      <nav className="route-nav" aria-label="Main navigation">
        <a
          href="/"
          className={route === 'home' ? 'route-link active' : 'route-link'}
          aria-current={route === 'home' ? 'page' : undefined}
          onClick={(event) => onNavigate(event, '/')}
        >
          Home
        </a>
        <a
          href="/admin"
          className={route === 'admin' ? 'route-link active' : 'route-link'}
          aria-current={route === 'admin' ? 'page' : undefined}
          onClick={(event) => onNavigate(event, '/admin')}
        >
          Admin
        </a>
      </nav>
    </header>
  )
}

function SyncIndicator({ status, error, placement = 'home' }) {
  return (
    <div className={`sync-indicator sync-${placement} sync-${status}`} role="status">
      <span className="sync-dot" aria-hidden="true" />
      {status === 'connected' ? 'LIVE SYNC · CONNECTED' : 'LIVE SYNC OFFLINE'}
      {status === 'disconnected' && error && <span className="sync-error">{error}</span>}
    </div>
  )
}

function AdminPage({
  selectedEntry,
  lockedTicketNumbers,
  itemNames,
  mediaByTicket,
  mediaError,
  onSelectEntry,
  onRestartEntry,
  onRenameEntry,
  onUploadMedia,
  onReset,
}) {
  const [search, setSearch] = useState('')
  const [uploadingTickets, setUploadingTickets] = useState([])
  const [uploadMessages, setUploadMessages] = useState({})
  const [renameMessages, setRenameMessages] = useState({})
  const [editingEntry, setEditingEntry] = useState(null)
  const [draftName, setDraftName] = useState('')
  const [nameEditorError, setNameEditorError] = useState('')
  const [savingName, setSavingName] = useState(false)
  const normalizedSearch = search.trim().toLowerCase()
  const filteredEntries = entries.map((entry) => ({
    ...entry,
    itemName: itemNames[entry.ticketNumber] ?? entry.itemName,
  })).filter((entry) => (
    entry.ticketNumber.includes(normalizedSearch)
    || `lucky-${entry.ticketNumber}`.includes(normalizedSearch)
    || entry.itemName.toLowerCase().includes(normalizedSearch)
  ))

  async function uploadMedia(entry, file) {
    setUploadingTickets((current) => [...new Set([...current, entry.ticketNumber])])
    setUploadMessages((current) => ({ ...current, [entry.ticketNumber]: '' }))
    try {
      await onUploadMedia(entry, file)
      setUploadMessages((current) => ({
        ...current,
        [entry.ticketNumber]: 'Media saved',
      }))
    } catch (error) {
      setUploadMessages((current) => ({
        ...current,
        [entry.ticketNumber]: error instanceof Error ? error.message : 'Upload failed.',
      }))
    } finally {
      setUploadingTickets((current) => current.filter((ticket) => ticket !== entry.ticketNumber))
    }
  }

  function openNameEditor(entry) {
    const currentName = itemNames[entry.ticketNumber] ?? entry.itemName
    setEditingEntry(entry)
    setDraftName(currentName)
    setNameEditorError('')
  }

  async function saveEntryName(event) {
    event.preventDefault()
    if (!editingEntry) {
      return
    }

    const itemName = draftName.trim()
    if (!itemName || itemName.length > 80) {
      setNameEditorError('Enter a prize name between 1 and 80 characters.')
      return
    }

    setSavingName(true)
    setNameEditorError('')
    try {
      const saved = await onRenameEntry(editingEntry.ticketNumber, itemName)
      if (!saved) {
        setNameEditorError('Could not save the prize name. Please try again.')
        return
      }

      setRenameMessages((current) => ({
        ...current,
        [editingEntry.ticketNumber]: 'Name saved',
      }))
      setEditingEntry(null)
    } catch (error) {
      setNameEditorError(error instanceof Error ? error.message : 'Could not save the prize name.')
    } finally {
      setSavingName(false)
    }
  }

  return (
    <section className="admin-section">
      <div className="admin-intro">
        <p className="eyebrow"><span /> DRAW MANAGEMENT</p>
        <h1>Ready, <span>set, lucky.</span></h1>
        <p className="intro-copy">
          Search a lucky number and select its prize. Each selected entry is disabled until you restart.
        </p>
      </div>

      <div className="admin-card">
        <div className="admin-card-heading">
          <div>
            <p className="admin-kicker">DRAW NO. {drawDetails.drawNumber}</p>
            <h2>Lucky number prizes</h2>
          </div>
          <div className="admin-heading-actions">
            <span className="admin-entry-count">
              {lockedTicketNumbers.length}/{entries.length} SELECTED
            </span>
            <button
              className="reset-draw-button"
              type="button"
              disabled={lockedTicketNumbers.length === 0}
              onClick={() => {
                setSearch('')
                onReset()
              }}
            >
              <span aria-hidden="true">↻</span> Clear all / Restart
            </button>
          </div>
        </div>

        <div className="entry-search">
          <span className="search-icon" aria-hidden="true">⌕</span>
          <label className="visually-hidden" htmlFor="lucky-entry-search">
            Search lucky number or prize
          </label>
          <input
            id="lucky-entry-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search lucky number (e.g. 031)"
          />
          {search && (
            <button
              className="clear-search"
              type="button"
              aria-label="Clear search"
              onClick={() => setSearch('')}
            >
              ×
            </button>
          )}
        </div>

        <div className="admin-entry-grid">
          {filteredEntries.map((entry) => {
            const index = Number(entry.ticketNumber) - 1
            const isSelected = entry.ticketNumber === selectedEntry?.ticketNumber
            const isDisabled = lockedTicketNumbers.includes(entry.ticketNumber)

            return (
              <div className="admin-entry-wrap" key={entry.ticketNumber}>
                <div
                  className={`admin-entry-card${isSelected ? ' is-current-entry' : ''}${isDisabled ? ' is-used-entry' : ''}`}
                >
                  <button
                    className="admin-entry-select"
                    type="button"
                    aria-label={`${isDisabled ? 'Already selected' : 'Select'} Lucky ${entry.ticketNumber}, ${entry.itemName}`}
                    aria-pressed={isSelected}
                    disabled={isDisabled}
                    onClick={() => onSelectEntry(entry)}
                  >
                    <span className="admin-entry-top">
                      <span className={`ticket-seal avatar-${(index % 5) + 1}`}>
                        {String(index + 1).padStart(3, '0')}
                      </span>
                      {isDisabled ? (
                        <span className="selected-entry-status">
                          <span aria-hidden="true">✦</span> Already selected
                        </span>
                      ) : (
                        <span className="entry-status"><span /> Prize assigned</span>
                      )}
                    </span>
                    <span className="admin-ticket-label">LUCKY NUMBER {String(index + 1).padStart(3, '0')}</span>
                    <span className="admin-ticket">#{entry.ticketNumber}</span>
                    <span className="admin-prize-label">ASSIGNED ITEM</span>
                    <span className="admin-prize-name">{entry.itemName}</span>
                    <span className="draw-button admin-draw-button">
                      <span>{isDisabled ? 'Already selected' : 'Select prize'}</span>
                      <span className="button-arrow" aria-hidden="true">↗</span>
                    </span>
                    {isDisabled && (
                      <span className="disabled-card-overlay" aria-hidden="true">
                        ALREADY SELECTED
                      </span>
                    )}
                  </button>
                  <div className="admin-entry-actions">
                    <label
                      className={`upload-entry-button${uploadingTickets.includes(entry.ticketNumber) ? ' is-uploading' : ''}`}
                      htmlFor={`upload-media-${entry.ticketNumber}`}
                      aria-disabled={uploadingTickets.includes(entry.ticketNumber)}
                    >
                      {uploadingTickets.includes(entry.ticketNumber)
                        ? 'Uploading…'
                        : getEntryMedia(entry, mediaByTicket)
                          ? 'Edit media'
                          : 'Upload media'}
                    </label>
                    <input
                      id={`upload-media-${entry.ticketNumber}`}
                      className="visually-hidden"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime"
                      disabled={uploadingTickets.includes(entry.ticketNumber)}
                      onChange={(event) => {
                        const [file] = event.target.files ?? []
                        if (file) {
                          void uploadMedia(entry, file)
                        }
                        event.target.value = ''
                      }}
                    />
                    <button
                      className="edit-entry-name-button"
                      type="button"
                      aria-label={`Edit prize name for Lucky ${entry.ticketNumber}`}
                      onClick={() => openNameEditor(entry)}
                    >
                      Edit name
                    </button>
                    {isDisabled && (
                      <button
                        className="restart-entry-button"
                        type="button"
                        aria-label={`Restart Lucky ${entry.ticketNumber}`}
                        onClick={() => onRestartEntry(entry)}
                      >
                        <span aria-hidden="true">↻</span> Restart
                      </button>
                    )}
                  </div>
                  {uploadMessages[entry.ticketNumber] && (
                    <p className="media-upload-message" role="status">
                      {uploadMessages[entry.ticketNumber]}
                    </p>
                  )}
                  {renameMessages[entry.ticketNumber] && (
                    <p className="name-save-message" role="status">
                      {renameMessages[entry.ticketNumber]}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
          {filteredEntries.length === 0 && (
            <p className="no-search-results" role="status">
              No lucky number or prize matches “{search}”.
            </p>
          )}
        </div>
      </div>

      {mediaError && (
        <p className="media-api-error" role="alert">
          Prize media could not be loaded: {mediaError}
        </p>
      )}
      {editingEntry && (
        <div
          className="name-editor-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !savingName) {
              setEditingEntry(null)
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !savingName) {
              setEditingEntry(null)
            }
          }}
        >
          <section
            className="name-editor-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="name-editor-title"
            aria-describedby="name-editor-description"
          >
            <span className="name-editor-icon" aria-hidden="true">✎</span>
            <p className="name-editor-kicker">LUCKY NUMBER {editingEntry.ticketNumber}</p>
            <h2 id="name-editor-title">Edit prize name</h2>
            <p id="name-editor-description">Change the name shown on this prize card and the draw display.</p>
            <form onSubmit={saveEntryName}>
              <label htmlFor="prize-name-input">Prize name</label>
              <input
                id="prize-name-input"
                type="text"
                value={draftName}
                maxLength={80}
                autoFocus
                disabled={savingName}
                onChange={(event) => setDraftName(event.target.value)}
              />
              {nameEditorError && (
                <p className="name-editor-error" role="alert">{nameEditorError}</p>
              )}
              <div className="name-editor-actions">
                <button
                  type="button"
                  className="name-editor-cancel"
                  disabled={savingName}
                  onClick={() => setEditingEntry(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="name-editor-save"
                  disabled={savingName}
                >
                  {savingName ? 'Saving…' : 'Save name'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      <p className="admin-footnote">
        {selectedEntry
          ? `Selected: Lucky ${selectedEntry.ticketNumber} · ${selectedEntry.itemName}. Use Home above to view the display.`
          : 'No prize selected. Choose an available card to set the home display.'}
      </p>
    </section>
  )
}

function LuckyHome({
  selectedEntry,
  displayedNumber,
  isRolling,
  showCelebration,
  reduceMotion,
}) {
  const isMotorcycle = selectedEntry?.itemName.toLowerCase().includes('motor cycle') ?? false
  const [eventName, eventType] = drawDetails.eventName.split(' · ')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [soundBlocked, setSoundBlocked] = useState(false)
  const [soundUnavailable, setSoundUnavailable] = useState(false)
  const audioRef = useRef(null)

  const playCelebrationSound = useCallback(() => {
    const audio = audioRef.current
    if (!audio) {
      return
    }

    audio.currentTime = 0
    audio.play().then(() => {
      setSoundBlocked(false)
      setSoundUnavailable(false)
    }).catch((error) => {
      if (error.name === 'NotAllowedError') {
        setSoundBlocked(true)
      } else {
        setSoundUnavailable(true)
      }
    })
  }, [])

  useEffect(() => {
    if (showCelebration && soundEnabled) {
      const audio = audioRef.current
      playCelebrationSound()
      return () => audio?.pause()
    }

    return undefined
  }, [playCelebrationSound, showCelebration, soundEnabled])

  function toggleCelebrationSound() {
    if (soundEnabled) {
      audioRef.current?.pause()
      setSoundEnabled(false)
      setSoundBlocked(false)
      return
    }

    setSoundEnabled(true)
    if (showCelebration) {
      playCelebrationSound()
    }
  }

  return (
    <main className="lucky-screen">
      <audio ref={audioRef} src={celebrationAudio} preload="auto" />
      <button
        className="celebration-sound-control"
        type="button"
        aria-pressed={soundEnabled}
        onClick={soundBlocked || soundUnavailable ? playCelebrationSound : toggleCelebrationSound}
      >
        {soundUnavailable ? 'SOUND UNAVAILABLE' : soundBlocked ? 'TAP TO PLAY SOUND' : `SOUND ${soundEnabled ? 'ON' : 'OFF'}`}
      </button>
      {showCelebration && (
        <div className="celebration-layer" aria-hidden="true">
          {!reduceMotion && celebrationPieces.map((piece, index) => (
            <span
              className={`confetti-piece ${piece.type}`}
              key={index}
              style={{
                left: piece.left,
                animationDelay: piece.delay,
                animationDuration: piece.duration,
                '--confetti-drift': piece.drift,
                '--confetti-rotation': piece.rotation,
              }}
            />
          ))}
          <p className="celebration-title">Congratulations!</p>
        </div>
      )}
      <p className="lucky-label">LUCKY -</p>
      <section
        className={`lucky-display${selectedEntry?.media?.type === 'video' ? ' has-video' : ''}`}
        aria-label="Lucky draw result"
      >
        <div
          className={`lucky-number${isRolling ? ' is-rolling' : ''}`}
          aria-live="polite"
          aria-label={selectedEntry ? `Lucky number ${selectedEntry.ticketNumber}` : 'No lucky number selected'}
        >
          {(selectedEntry ? displayedNumber : '000').split('').map((digit, index) => (
            <span className="lucky-digit" key={`${index}-${digit}`}>{digit}</span>
          ))}
        </div>
        {selectedEntry ? (
          <>
            <figure
              className={`prize-image${selectedEntry.media ? ' prize-image-photo' : ''}${selectedEntry.media?.type === 'video' ? ' prize-image-video' : ''}`}
              key={`image-${selectedEntry.ticketNumber}`}
            >
              {selectedEntry.media?.type === 'video' ? (
                <video
                  src={selectedEntry.media.src}
                  aria-label={`${selectedEntry.itemName} prize video`}
                  autoPlay
                  controls
                  loop
                  muted
                  playsInline
                />
              ) : (
                <img
                  src={selectedEntry.media?.src ?? (isMotorcycle ? motorcyclePrize : genericPrize)}
                  alt={selectedEntry.media
                    ? `${selectedEntry.itemName} prize`
                    : isMotorcycle
                      ? 'Illustration of a motorcycle prize'
                      : `Illustration of a prize for ${selectedEntry.itemName}`}
                />
              )}
            </figure>
            <h1 className="prize-title" key={`title-${selectedEntry.ticketNumber}`}>
              {selectedEntry.itemName}
            </h1>
          </>
        ) : null}
      </section>
      <footer className="event-footer">
        <span>{eventName}</span>
        <span>{eventType}</span>
      </footer>
    </main>
  )
}

function App() {
  const initialEntry = entries[0]
  if (!initialEntry) {
    throw new Error('Lucky draw data is empty')
  }

  const [selectedEntry, setSelectedEntry] = useState(null)
  const [lockedTicketNumbers, setLockedTicketNumbers] = useState([])
  const [itemNames, setItemNames] = useState({})
  const [mediaByTicket, setMediaByTicket] = useState({})
  const [mediaError, setMediaError] = useState('')
  const [displayedNumber, setDisplayedNumber] = useState('000')
  const [isRolling, setIsRolling] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [animationCycle, setAnimationCycle] = useState(0)
  const [syncStatus, setSyncStatus] = useState('connecting')
  const [syncError, setSyncError] = useState('')
  const [route, setRoute] = useState(
    window.location.pathname === '/admin' ? 'admin' : 'home',
  )
  const sharedRevision = useRef(-1)
  const routeRef = useRef(route)
  const selectedTicketNumberRef = useRef(null)

  useEffect(() => {
    routeRef.current = route
    selectedTicketNumberRef.current = selectedEntry?.ticketNumber ?? null
  }, [route, selectedEntry])

  const applySharedState = useCallback((sharedState) => {
    const nextSelectedEntry = sharedState?.selectedTicketNumber === null
      ? null
      : entries.find((entry) => entry.ticketNumber === sharedState?.selectedTicketNumber)
    if (
      !Number.isSafeInteger(sharedState?.revision)
      || sharedState.revision < 0
      || !Array.isArray(sharedState.lockedTicketNumbers)
      || sharedState.lockedTicketNumbers.some(
        (ticketNumber) => !entries.some((entry) => entry.ticketNumber === ticketNumber),
      )
      || (sharedState.selectedTicketNumber !== null && !nextSelectedEntry)
    ) {
      throw new Error('The draw server returned invalid shared data.')
    }
    const nextItemNames = sharedState.itemNames ?? {}
    if (
      !nextItemNames
      || typeof nextItemNames !== 'object'
      || Array.isArray(nextItemNames)
      || Object.entries(nextItemNames).some(([ticketNumber, itemName]) => (
        !entries.some((entry) => entry.ticketNumber === ticketNumber)
        || typeof itemName !== 'string'
        || itemName.trim().length === 0
        || itemName.trim().length > 80
      ))
    ) {
      throw new Error('The draw server returned invalid prize names.')
    }
    if (sharedState.revision <= sharedRevision.current) {
      return
    }

    sharedRevision.current = sharedState.revision
    setLockedTicketNumbers(sharedState.lockedTicketNumbers)
    setItemNames(nextItemNames)
    if (selectedTicketNumberRef.current === nextSelectedEntry?.ticketNumber) {
      return
    }

    selectedTicketNumberRef.current = nextSelectedEntry?.ticketNumber ?? null
    setSelectedEntry(nextSelectedEntry)
    if (routeRef.current === 'home') {
      setShowCelebration(false)
      if (nextSelectedEntry) {
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        setDisplayedNumber(reducedMotion ? nextSelectedEntry.ticketNumber : '000')
        setIsRolling(!reducedMotion)
        setShowCelebration(reducedMotion)
        setAnimationCycle((cycle) => cycle + 1)
      } else {
        setDisplayedNumber('000')
        setIsRolling(false)
        setAnimationCycle((cycle) => cycle + 1)
      }
    }
  }, [])

  useEffect(() => {
    let active = true

    async function refreshSharedState() {
      try {
        const response = await fetch('/api/lucky-draw/state', { cache: 'no-store' })
        if (!response.ok) {
          throw new Error(`Draw server returned HTTP ${response.status}.`)
        }
        applySharedState(await response.json())
        if (active) {
          setSyncStatus('connected')
          setSyncError('')
        }
      } catch (error) {
        if (active) {
          setSyncStatus('disconnected')
          setSyncError(error instanceof Error ? error.message : 'Could not reach the draw server.')
        }
      }
    }

    refreshSharedState()
    const interval = window.setInterval(refreshSharedState, 500)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [applySharedState])

  const refreshMedia = useCallback(async () => {
    const response = await fetch('/api/media', { cache: 'no-store' })
    const result = await response.json()
    if (!response.ok) {
      throw new Error(result.error || `Media server returned HTTP ${response.status}.`)
    }
    if (!result.mediaByTicket || typeof result.mediaByTicket !== 'object') {
      throw new Error('The media server returned invalid data.')
    }
    setMediaByTicket(result.mediaByTicket)
    setMediaError('')
  }, [])

  useEffect(() => {
    let active = true

    async function loadMedia() {
      try {
        await refreshMedia()
      } catch (error) {
        if (active) {
          setMediaError(error instanceof Error ? error.message : 'Could not load uploaded media.')
        }
      }
    }

    void loadMedia()
    const interval = window.setInterval(loadMedia, import.meta.env.DEV ? 3000 : 60000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [refreshMedia])

  async function sendAction(action) {
    try {
      const response = await fetch('/api/lucky-draw/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action),
      })
      if (!response.ok) {
        const details = await response.json()
        throw new Error(details.error || `Draw server returned HTTP ${response.status}.`)
      }
      applySharedState(await response.json())
      setSyncStatus('connected')
      setSyncError('')
      return true
    } catch (error) {
      setSyncStatus('disconnected')
      setSyncError(error instanceof Error ? error.message : 'Could not update the shared draw.')
      return false
    }
  }

  function navigate(event, path) {
    event.preventDefault()
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path)
    }
    if (path === '/' && selectedEntry) {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      setDisplayedNumber(reducedMotion ? selectedEntry.ticketNumber : '000')
      setIsRolling(!reducedMotion)
      setShowCelebration(reducedMotion)
      setAnimationCycle((cycle) => cycle + 1)
    } else if (path === '/') {
      setDisplayedNumber('000')
      setIsRolling(false)
      setShowCelebration(false)
    }
    setRoute(path === '/admin' ? 'admin' : 'home')
  }

  useEffect(() => {
    function handlePopState() {
      const nextRoute = window.location.pathname === '/admin' ? 'admin' : 'home'
      if (nextRoute === 'home' && selectedEntry) {
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        setDisplayedNumber(reducedMotion ? selectedEntry.ticketNumber : '000')
        setIsRolling(!reducedMotion)
        setShowCelebration(reducedMotion)
        setAnimationCycle((cycle) => cycle + 1)
      } else if (nextRoute === 'home') {
        setDisplayedNumber('000')
        setIsRolling(false)
        setShowCelebration(false)
      }
      setRoute(nextRoute)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [selectedEntry])

  useEffect(() => {
    if (!selectedEntry) {
      return undefined
    }
    const targetNumber = selectedEntry.ticketNumber
    if (!isRolling) {
      return undefined
    }
    let step = 0
    const timer = window.setInterval(() => {
      step += 1
      if (step >= 16) {
        window.clearInterval(timer)
        setDisplayedNumber(targetNumber)
        setIsRolling(false)
        setShowCelebration(true)
        return
      }

      const rollingNumber = (Number(targetNumber) * (step + 1) * 29 + step * 137) % 1000
      setDisplayedNumber(String(rollingNumber).padStart(3, '0'))
    }, 70)

    return () => window.clearInterval(timer)
  }, [selectedEntry, animationCycle, isRolling])

  useEffect(() => {
    if (!showCelebration) {
      return undefined
    }

    const timer = window.setTimeout(() => setShowCelebration(false), 4300)
    return () => window.clearTimeout(timer)
  }, [showCelebration])

  function selectEntry(entry) {
    void sendAction({ type: 'select', ticketNumber: entry.ticketNumber })
  }

  function resetEntries() {
    void sendAction({ type: 'reset' })
  }

  function restartEntry(entry) {
    void sendAction({ type: 'restart', ticketNumber: entry.ticketNumber })
  }

  function renameEntry(ticketNumber, itemName) {
    return sendAction({ type: 'rename', ticketNumber, itemName })
  }

  async function uploadMedia(entry, file) {
    if (!supportedMediaTypes.has(file.type)) {
      throw new Error('Choose a supported photo or video file.')
    }
    if (file.size === 0 || file.size > 100 * 1024 * 1024) {
      throw new Error('File must be smaller than 100 MB.')
    }
    const extension = mediaExtensionByType[file.type]

    if (import.meta.env.DEV) {
      const response = await fetch('/api/media/upload', {
        method: 'POST',
        headers: {
          'Content-Type': file.type,
          'X-Ticket-Number': entry.ticketNumber,
          'X-File-Extension': extension,
        },
        body: file,
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || `Local upload returned HTTP ${response.status}.`)
      }
      setMediaByTicket((current) => ({ ...current, [entry.ticketNumber]: result.media }))
      await refreshMedia()
      return
    }

    let uploadToken = window.sessionStorage.getItem('adminUploadToken')
    if (!uploadToken) {
      uploadToken = window.prompt('Enter the admin upload password configured in Vercel.')
      if (!uploadToken) {
        throw new Error('Upload canceled. Enter the admin upload password to continue.')
      }
      window.sessionStorage.setItem('adminUploadToken', uploadToken)
    }

    const resourceType = file.type.startsWith('video/') ? 'video' : 'image'
    const signatureResponse = await fetch('/api/media-signature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticketNumber: entry.ticketNumber,
        resourceType,
        uploadToken,
      }),
    })
    const signatureData = await signatureResponse.json()
    if (!signatureResponse.ok) {
      if (signatureResponse.status === 401) {
        window.sessionStorage.removeItem('adminUploadToken')
      }
      throw new Error(signatureData.error || `Upload authorization returned HTTP ${signatureResponse.status}.`)
    }

    const uploadData = new FormData()
    uploadData.append('file', file)
    uploadData.append('api_key', signatureData.apiKey)
    uploadData.append('public_id', signatureData.publicId)
    uploadData.append('tags', signatureData.tags)
    uploadData.append('timestamp', String(signatureData.timestamp))
    uploadData.append('signature', signatureData.signature)

    const uploadResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(signatureData.cloudName)}/${signatureData.resourceType}/upload`,
      { method: 'POST', body: uploadData },
    )
    const cloudResult = await uploadResponse.json()
    if (!uploadResponse.ok) {
      throw new Error(cloudResult.error?.message || 'Cloudinary upload failed.')
    }

    const media = {
      src: cloudResult.secure_url,
      type: cloudResult.resource_type === 'video' ? 'video' : 'image',
    }
    setMediaByTicket((current) => ({ ...current, [entry.ticketNumber]: media }))
  }

  const displayEntry = selectedEntry
    ? {
      ...selectedEntry,
      itemName: itemNames[selectedEntry.ticketNumber] ?? selectedEntry.itemName,
      media: getEntryMedia(selectedEntry, mediaByTicket),
    }
    : null

  if (route === 'home') {
    return (
      <LuckyHome
        selectedEntry={displayEntry}
        displayedNumber={displayedNumber}
        isRolling={isRolling}
        showCelebration={showCelebration}
        reduceMotion={window.matchMedia('(prefers-reduced-motion: reduce)').matches}
      />
    )
  }

  return (
    <main className="admin-screen">
      <SyncIndicator status={syncStatus} error={syncError} placement="admin" />
      <SiteHeader route={route} onNavigate={navigate} />

      <AdminPage
        selectedEntry={displayEntry}
        lockedTicketNumbers={lockedTicketNumbers}
        itemNames={itemNames}
        mediaByTicket={mediaByTicket}
        mediaError={mediaError}
        onSelectEntry={selectEntry}
        onRestartEntry={restartEntry}
        onRenameEntry={renameEntry}
        onUploadMedia={uploadMedia}
        onReset={resetEntries}
      />

      <footer className="admin-screen-footer">
        <span>DRAW NO. {drawDetails.drawNumber}</span>
        <span>CHOOSE AN ENTRY <span aria-hidden="true">✳</span></span>
      </footer>
    </main>
  )
}

export default App
