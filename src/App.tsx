import { useEffect, useRef, useState } from 'react'
import { wordCategories, wordHints } from './words'

type GamePhase = 'setup' | 'reveal' | 'done'
type Theme = 'original' | 'brat'
const HOLD_TO_REVEAL_MS = 550

function pickRandomWord(words: string[]): string {
  return words[Math.floor(Math.random() * words.length)]
}

function shuffleIndices(n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i)
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function pickRandomImpostorIndices(playerCount: number, impostorCount: number): number[] {
  return shuffleIndices(playerCount).slice(0, impostorCount)
}

function App() {
  const [phase, setPhase] = useState<GamePhase>('setup')
  const [playerInput, setPlayerInput] = useState('')
  const [players, setPlayers] = useState<string[]>([])
  const [impostorCount, setImpostorCount] = useState(1)
  const [selectedWord, setSelectedWord] = useState('')
  const [impostorIndices, setImpostorIndices] = useState<number[]>([])
  const [revealOrder, setRevealOrder] = useState<number[]>([])
  const [revealStep, setRevealStep] = useState(0)
  const [theme, setTheme] = useState<Theme>('original')
  const [isHoldingReveal, setIsHoldingReveal] = useState(false)
  const [isRevealVisible, setIsRevealVisible] = useState(false)
  const [hasRevealedCurrentPlayer, setHasRevealedCurrentPlayer] = useState(false)
  const [discussionStarter, setDiscussionStarter] = useState('')
  const [keepSameImpostor, setKeepSameImpostor] = useState(false)
  const [keepSameStarter, setKeepSameStarter] = useState(false)
  const [prevImpostorIndices, setPrevImpostorIndices] = useState<number[]>([])
  const [prevDiscussionStarter, setPrevDiscussionStarter] = useState('')
  const holdTimerRef = useRef<number | null>(null)

  const canStart = players.length >= 3 && impostorCount >= 1 && impostorCount < players.length
  const currentPlayerIndex = revealOrder[revealStep] ?? 0
  const currentPlayer = players[currentPlayerIndex]

  const clearHoldTimer = () => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      clearHoldTimer()
    }
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const addPlayer = () => {
    const name = playerInput.trim()
    if (!name) return
    setPlayers((prev) => [...prev, name])
    setPlayerInput('')
  }

  const removePlayer = (indexToRemove: number) => {
    setPlayers((prev) => prev.filter((_, index) => index !== indexToRemove))
  }

  const startGame = () => {
    if (!canStart) return
    const words = wordCategories.lithuanian.words
    const nextWord = pickRandomWord(words)
    const validPrevImpostors =
      prevImpostorIndices.length > 0 && prevImpostorIndices.every((i) => i < players.length)
    const nextImpostors =
      keepSameImpostor && validPrevImpostors
        ? prevImpostorIndices
        : pickRandomImpostorIndices(players.length, impostorCount)
    setSelectedWord(nextWord)
    setImpostorIndices(nextImpostors)
    setRevealOrder(shuffleIndices(players.length))
    setRevealStep(0)
    setIsHoldingReveal(false)
    setIsRevealVisible(false)
    setHasRevealedCurrentPlayer(false)
    setDiscussionStarter('')
    clearHoldTimer()
    setPhase('reveal')
  }

  const nextPlayer = () => {
    if (revealStep === players.length - 1) {
      const starter =
        keepSameStarter && prevDiscussionStarter
          ? prevDiscussionStarter
          : (players[Math.floor(Math.random() * players.length)] ?? '')
      setDiscussionStarter(starter)
      setIsHoldingReveal(false)
      setIsRevealVisible(false)
      setHasRevealedCurrentPlayer(false)
      clearHoldTimer()
      setPhase('done')
      return
    }
    setRevealStep((prev) => prev + 1)
    setIsHoldingReveal(false)
    setIsRevealVisible(false)
    setHasRevealedCurrentPlayer(false)
    clearHoldTimer()
  }

  const resetGame = () => {
    setPrevImpostorIndices(impostorIndices)
    setPrevDiscussionStarter(discussionStarter)
    setPhase('setup')
    setSelectedWord('')
    setImpostorIndices([])
    setRevealOrder([])
    setRevealStep(0)
    setIsHoldingReveal(false)
    setIsRevealVisible(false)
    setHasRevealedCurrentPlayer(false)
    setDiscussionStarter('')
    clearHoldTimer()
  }

  const startRevealHold = () => {
    if (isHoldingReveal) return
    clearHoldTimer()
    setIsHoldingReveal(true)
    setIsRevealVisible(false)
    holdTimerRef.current = window.setTimeout(() => {
      setIsRevealVisible(true)
      setHasRevealedCurrentPlayer(true)
      holdTimerRef.current = null
    }, HOLD_TO_REVEAL_MS)
  }

  const cancelRevealHold = () => {
    clearHoldTimer()
    setIsHoldingReveal(false)
    setIsRevealVisible(false)
  }

  const isImpostor = impostorIndices.includes(currentPlayerIndex)
  const panelClass =
    'rounded-none bg-[var(--color-surface)] panel-neon'
  const primaryButtonClass =
    'w-full rounded-none bg-[var(--color-accent)] px-5 py-3.5 text-base font-bold text-[var(--color-text)] transition hover:bg-[var(--color-primary)] hover:text-[var(--color-text-on-primary)] disabled:cursor-not-allowed disabled:opacity-40 btn-neon-glow'
  const inputClass =
    'w-full rounded-none border-b-2 border-dashed border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3 text-base text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)]'
  const secondaryButtonClass =
    'rounded-none border border-dashed border-[var(--color-border)] bg-transparent px-3 py-1.5 text-xs text-[var(--color-text)] transition hover:bg-[var(--color-accent)]'
  const toggleTheme = () => {
    setTheme((prev) => (prev === 'original' ? 'brat' : 'original'))
  }
  const themeSwitchLabel = theme === 'original' ? 'Brat tema' : 'Originali tema'

  if (phase === 'setup') {
    return (
      <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <div className="mx-auto w-full max-w-md px-4 py-5 sm:max-w-lg sm:py-8">
          <div className={`${panelClass} p-5 sm:p-6`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="title-bar">Imposter Party LT</p>
                <h1 className="mt-3 text-3xl font-bold leading-tight" style={{fontFamily:"'Press Start 2P', monospace", fontSize:'1rem', lineHeight:'1.8'}}>Paruošk raundą</h1>
              </div>
              <button type="button" onClick={toggleTheme} className={secondaryButtonClass}>
                {themeSwitchLabel}
              </button>
            </div>

            <section className="mt-6 space-y-3">
              <label htmlFor="playerName" className="block text-sm font-semibold">
                Pridėti žaidėją
              </label>
              <div className="flex gap-2">
                <input
                  id="playerName"
                  type="text"
                  placeholder="Pvz. Mantas"
                  value={playerInput}
                  onChange={(event) => setPlayerInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') addPlayer()
                  }}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={addPlayer}
                  className="rounded-xl border-2 border-[var(--color-primary)] bg-transparent px-4 py-3 text-sm font-semibold text-[var(--color-primary)] transition duration-200 hover:bg-[var(--color-accent)]/45"
                >
                  Pridėti
                </button>
              </div>
            </section>

            <section className="mt-5">
              <h2 className="text-sm font-semibold">Žaidėjai ({players.length})</h2>
              <div className="mt-2 space-y-2">
                {players.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-muted)]">
                    Kol kas tuščia — reikia bent 3 žaidėjų.
                  </p>
                ) : (
                  players.map((player, index) => (
                    <div
                      key={`${player}-${index}`}
                      className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3"
                    >
                      <span className="font-medium">{player}</span>
                        <button
                          type="button"
                          onClick={() => removePlayer(index)}
                          className="text-sm font-semibold text-[var(--color-danger)] transition duration-200 hover:brightness-90"
                        >
                          Šalinti
                        </button>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="block text-sm font-semibold">Impostorių kiekis</span>
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, players.length - 1)}
                  value={impostorCount}
                  onChange={(event) => setImpostorCount(Number(event.target.value))}
                  className={inputClass}
                />
              </label>
              <div className="space-y-2">
                <span className="block text-sm font-semibold">Aktyvi žodžių bazė</span>
                <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3 text-sm">
                  {wordCategories.lithuanian.label}: {wordCategories.lithuanian.words.length} žodžiai
                </p>
              </div>
            </section>

            {prevImpostorIndices.length > 0 && (
              <section className="mt-5 space-y-3 rounded-none border-2 border-dashed border-[var(--color-border)] bg-[var(--color-bg-soft)]">
                <p className="title-bar">Kartoti is paskutinio raundo</p>
                <div className="space-y-3 px-4 pb-3 pt-1">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={keepSameImpostor}
                    onChange={(e) => setKeepSameImpostor(e.target.checked)}
                    className="h-4 w-4 accent-[var(--color-primary)]"
                  />
                  <span className="text-sm font-medium">Tas pats impostorius</span>
                </label>
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={keepSameStarter}
                    onChange={(e) => setKeepSameStarter(e.target.checked)}
                    disabled={!prevDiscussionStarter}
                    className="h-4 w-4 accent-[var(--color-primary)] disabled:opacity-40"
                  />
                  <span className={`text-sm font-medium ${!prevDiscussionStarter ? 'opacity-40' : ''}`}>
                    Tas pats pradedantysis
                    {prevDiscussionStarter && (
                      <span className="ml-1 text-xs text-[var(--color-muted)]">({prevDiscussionStarter})</span>
                    )}
                  </span>
                </label>
                </div>
              </section>
            )}

            <button type="button" disabled={!canStart} onClick={startGame} className={`mt-7 ${primaryButtonClass}`}>
              Startuoti žaidimą
            </button>

            {!canStart && (
              <p className="mt-2 text-center text-sm text-[var(--color-muted)]">
                Reikia bent 3 žaidėjų, o impostorių turi būti mažiau nei žaidėjų.
              </p>
            )}
          </div>
        </div>
      </main>
    )
  }

  if (phase === 'done') {
    return (
      <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <div className="mx-auto flex w-full max-w-md items-center px-4 py-8 sm:max-w-lg">
          <div className={`${panelClass} w-full p-5 text-center sm:p-7`}>
            <div className="flex items-start justify-between gap-3 text-left">
              <p className="title-bar">Raundas baigtas</p>
              <button type="button" onClick={toggleTheme} className={secondaryButtonClass}>
                {themeSwitchLabel}
              </button>
            </div>
            <h1 className="mt-2 text-3xl font-bold leading-tight">Diskusijos metas</h1>
            <p className="mt-3 text-sm text-[var(--color-muted)] sm:text-base">
              Dabar aptarkite užuominas ir bandykite atspėti impostorių.
            </p>
            <p className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3 text-base font-semibold sm:text-lg">
              Pirmas kalba: <span className="text-[var(--color-primary)]">{discussionStarter || 'Atsitiktinis žaidėjas'}</span>
            </p>
            <button type="button" onClick={resetGame} className={`mt-6 ${primaryButtonClass}`}>
              Naujas raundas
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="mx-auto w-full max-w-md px-4 py-5 sm:max-w-lg sm:py-8">
        <div className={`${panelClass} p-5 sm:p-6`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="title-bar">
              Zaidejas {revealStep + 1} is {players.length}
            </p>
            <button type="button" onClick={toggleTheme} className={secondaryButtonClass}>
              {themeSwitchLabel}
            </button>
          </div>

          <h1 className="mt-6 text-center text-3xl font-bold leading-tight">{currentPlayer}</h1>

          <div className="mt-5 text-center">
            <button
              type="button"
              onPointerDown={(event) => {
                event.preventDefault()
                startRevealHold()
              }}
              onMouseDown={(event) => {
                event.preventDefault()
              }}
              onPointerUp={cancelRevealHold}
              onPointerLeave={cancelRevealHold}
              onPointerCancel={cancelRevealHold}
              draggable={false}
              onKeyDown={(event) => {
                if ((event.key === 'Enter' || event.key === ' ') && !isHoldingReveal) {
                  event.preventDefault()
                  startRevealHold()
                }
              }}
              onKeyUp={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  cancelRevealHold()
                }
              }}
              className={`reveal-hold-button mx-auto flex aspect-square w-full max-w-[22rem] flex-col items-center justify-center rounded-none px-5 text-center transition duration-300 ${
                isRevealVisible && isImpostor
                  ? 'bg-[var(--color-danger)]/10 impostor-reveal-glow'
                  : isHoldingReveal
                  ? 'bg-[var(--color-primary)]/10 hold-active-glow'
                  : 'bg-[var(--color-bg-soft)] hold-idle-border'
              }`}
            >
              {isRevealVisible ? (
                isImpostor ? (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-danger)]">
                      IMPOSTOR
                    </p>
                    <p className="mt-3 text-4xl font-black leading-none text-[var(--color-danger)] sm:text-5xl">
                      IMPOSTORIUS
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)] opacity-80">
                      Slaptas žodis
                    </p>
                    <p className="mt-3 break-words text-4xl font-black leading-tight text-[var(--color-primary)] sm:text-5xl">{selectedWord}</p>
                  </>
                )
              ) : (
                <>
                  <p className="text-base font-semibold text-[var(--color-primary)] sm:text-lg">
                    {isHoldingReveal ? 'Laikyk...' : 'Laikyk nuspaudęs'}
                  </p>
                  <p className="mt-3 text-xs text-[var(--color-muted)]">
                    {isHoldingReveal ? 'atskleidžiama...' : 'kad atskleistum'}
                  </p>
                </>
              )}
            </button>
          </div>

          {hasRevealedCurrentPlayer && isImpostor && wordHints[selectedWord] && (
            <div className="mt-4 hint-panel">
              <p className="title-bar" style={{color:'var(--color-danger)'}}>Uzuomina</p>
              <p className="px-4 py-2 text-lg text-[var(--color-danger)]">
                {wordHints[selectedWord]}
              </p>
            </div>
          )}

          {hasRevealedCurrentPlayer && (
            <button type="button" onClick={nextPlayer} className={`mt-4 ${primaryButtonClass}`}>
              {currentPlayerIndex === players.length - 1 ? 'Baigti reveal' : 'Kitas žaidėjas'}
            </button>
          )}
        </div>
      </div>
    </main>
  )
}

export default App
