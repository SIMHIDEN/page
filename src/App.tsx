import { useEffect, useRef, useState } from 'react'
import { wordCategories } from './words'

type GamePhase = 'setup' | 'reveal' | 'done'
type Theme = 'original' | 'brat'
const HOLD_TO_REVEAL_MS = 550

function pickRandomWord(words: string[]): string {
  return words[Math.floor(Math.random() * words.length)]
}

function pickRandomImpostorIndices(playerCount: number, impostorCount: number): number[] {
  const pool = Array.from({ length: playerCount }, (_, i) => i)
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, impostorCount)
}

function App() {
  const [phase, setPhase] = useState<GamePhase>('setup')
  const [playerInput, setPlayerInput] = useState('')
  const [players, setPlayers] = useState<string[]>([])
  const [impostorCount, setImpostorCount] = useState(1)
  const [selectedWord, setSelectedWord] = useState('')
  const [impostorIndices, setImpostorIndices] = useState<number[]>([])
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0)
  const [theme, setTheme] = useState<Theme>('original')
  const [isHoldingReveal, setIsHoldingReveal] = useState(false)
  const [isRevealVisible, setIsRevealVisible] = useState(false)
  const [hasRevealedCurrentPlayer, setHasRevealedCurrentPlayer] = useState(false)
  const [discussionStarter, setDiscussionStarter] = useState('')
  const holdTimerRef = useRef<number | null>(null)

  const canStart = players.length >= 3 && impostorCount >= 1 && impostorCount < players.length
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
    const nextImpostors = pickRandomImpostorIndices(players.length, impostorCount)
    setSelectedWord(nextWord)
    setImpostorIndices(nextImpostors)
    setCurrentPlayerIndex(0)
    setIsHoldingReveal(false)
    setIsRevealVisible(false)
    setHasRevealedCurrentPlayer(false)
    setDiscussionStarter('')
    clearHoldTimer()
    setPhase('reveal')
  }

  const nextPlayer = () => {
    if (currentPlayerIndex === players.length - 1) {
      setDiscussionStarter(players[Math.floor(Math.random() * players.length)] ?? '')
      setIsHoldingReveal(false)
      setIsRevealVisible(false)
      setHasRevealedCurrentPlayer(false)
      clearHoldTimer()
      setPhase('done')
      return
    }
    setCurrentPlayerIndex((prev) => prev + 1)
    setIsHoldingReveal(false)
    setIsRevealVisible(false)
    setHasRevealedCurrentPlayer(false)
    clearHoldTimer()
  }

  const resetGame = () => {
    setPhase('setup')
    setSelectedWord('')
    setImpostorIndices([])
    setCurrentPlayerIndex(0)
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
    'rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_2px_8px_rgba(123,91,66,0.08)]'
  const primaryButtonClass =
    'w-full rounded-xl bg-[var(--color-primary)] px-5 py-3.5 text-sm font-semibold text-[var(--color-text-on-primary)] transition duration-200 hover:brightness-95 disabled:cursor-not-allowed disabled:bg-[var(--color-accent)] disabled:text-[var(--color-muted)]'
  const inputClass =
    'w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3 text-base text-[var(--color-text)] outline-none transition duration-200 placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15'
  const secondaryButtonClass =
    'rounded-lg border-2 border-[var(--color-primary)] bg-transparent px-3 py-2 text-xs font-semibold text-[var(--color-primary)] transition duration-200 hover:bg-[var(--color-accent)]/45'
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
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">
                  Imposter Party LT
                </p>
                <h1 className="mt-2 text-3xl font-bold leading-tight">Paruošk raundą</h1>
              </div>
              <button type="button" onClick={toggleTheme} className={secondaryButtonClass}>
                {themeSwitchLabel}
              </button>
            </div>
            <p className="mt-2 text-sm text-[var(--color-muted)] sm:text-base">
              Minimalus phone-first ekranas: įvesk žaidėjus, pasirink impostorių kiekį ir pradėk.
            </p>

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
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">Raundas baigtas</p>
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
            <p className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 py-1 text-xs font-semibold text-[var(--color-muted)]">
              Žaidėjas {currentPlayerIndex + 1} iš {players.length}
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
              className={`reveal-hold-button mx-auto flex aspect-square w-full max-w-[22rem] flex-col items-center justify-center rounded-3xl border-2 px-5 text-center transition duration-200 ${
                isHoldingReveal
                  ? 'bg-[var(--color-primary)] text-[var(--color-text-on-primary)]'
                  : 'bg-[var(--color-bg-soft)] text-[var(--color-primary)] hover:bg-[var(--color-accent)]/35'
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
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-on-primary)] opacity-80">
                      Slaptas žodis
                    </p>
                    <p className="mt-3 break-words text-4xl font-black leading-tight sm:text-5xl">{selectedWord}</p>
                  </>
                )
              ) : (
                <>
                  <p className="text-base font-semibold sm:text-lg">
                    {isHoldingReveal ? 'Laikyk... atskleidžiama' : 'Laikyk nuspaudęs, kad atskleistum'}
                  </p>
                  <p className="mt-3 text-xs text-[var(--color-muted)]">Paleidus paslaptis vėl pasislepia.</p>
                </>
              )}
            </button>
          </div>

          {hasRevealedCurrentPlayer && (
            <button type="button" onClick={nextPlayer} className={`mt-6 ${primaryButtonClass}`}>
              {currentPlayerIndex === players.length - 1 ? 'Baigti reveal' : 'Kitas žaidėjas'}
            </button>
          )}
        </div>
      </div>
    </main>
  )
}

export default App
