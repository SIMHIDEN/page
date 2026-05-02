import { useMemo, useState } from 'react'
import { wordCategories, type WordCategoryKey } from './words'

type GamePhase = 'setup' | 'reveal' | 'done'

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
  const [categoryKey, setCategoryKey] = useState<WordCategoryKey>('lithuanian')
  const [selectedWord, setSelectedWord] = useState('')
  const [impostorIndices, setImpostorIndices] = useState<number[]>([])
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [showMasterWord, setShowMasterWord] = useState(false)

  const canStart = players.length >= 3 && impostorCount >= 1 && impostorCount < players.length
  const currentPlayer = players[currentPlayerIndex]

  const categoryEntries = useMemo(() => Object.entries(wordCategories), [])

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
    const words = wordCategories[categoryKey].words
    const nextWord = pickRandomWord(words)
    const nextImpostors = pickRandomImpostorIndices(players.length, impostorCount)
    setSelectedWord(nextWord)
    setImpostorIndices(nextImpostors)
    setCurrentPlayerIndex(0)
    setRevealed(false)
    setShowMasterWord(false)
    setPhase('reveal')
  }

  const nextPlayer = () => {
    if (currentPlayerIndex === players.length - 1) {
      setPhase('done')
      return
    }
    setCurrentPlayerIndex((prev) => prev + 1)
    setRevealed(false)
  }

  const resetGame = () => {
    setPhase('setup')
    setSelectedWord('')
    setImpostorIndices([])
    setCurrentPlayerIndex(0)
    setRevealed(false)
    setShowMasterWord(false)
  }

  const isImpostor = impostorIndices.includes(currentPlayerIndex)

  if (phase === 'setup') {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 sm:py-10">
        <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl sm:p-8">
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Imposter Party LT</h1>
          <p className="mt-2 text-sm text-slate-300 sm:text-base">
            Nu ka, surasyk chebra, issirink kategorija ir varom i raunda.
          </p>

          <section className="mt-6 space-y-3">
            <label htmlFor="playerName" className="block text-sm font-semibold text-slate-200">
              Prideti zaideja
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
                className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-base text-slate-100 outline-none transition focus:border-cyan-400"
              />
              <button
                type="button"
                onClick={addPlayer}
                className="rounded-xl bg-cyan-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-400"
              >
                Prideti
              </button>
            </div>
          </section>

          <section className="mt-5">
            <h2 className="text-sm font-semibold text-slate-200">Zaidejai ({players.length})</h2>
            <div className="mt-2 space-y-2">
              {players.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-600 px-4 py-3 text-sm text-slate-400">
                  Kol kas tuscia, primesk bent 3 zaidejus.
                </p>
              ) : (
                players.map((player, index) => (
                  <div
                    key={`${player}-${index}`}
                    className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800 px-4 py-3"
                  >
                    <span className="font-medium">{player}</span>
                    <button
                      type="button"
                      onClick={() => removePlayer(index)}
                      className="text-sm font-semibold text-rose-300 transition hover:text-rose-200"
                    >
                      Trinti
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="block text-sm font-semibold text-slate-200">Kategorija</span>
              <select
                value={categoryKey}
                onChange={(event) => setCategoryKey(event.target.value as WordCategoryKey)}
                className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400"
              >
                {categoryEntries.map(([key, category]) => (
                  <option key={key} value={key}>
                    {category.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="block text-sm font-semibold text-slate-200">Impostoriu kiekis</span>
              <input
                type="number"
                min={1}
                max={Math.max(1, players.length - 1)}
                value={impostorCount}
                onChange={(event) => setImpostorCount(Number(event.target.value))}
                className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400"
              />
            </label>
          </section>

          <button
            type="button"
            disabled={!canStart}
            onClick={startGame}
            className="mt-7 w-full rounded-xl bg-fuchsia-500 px-6 py-4 text-lg font-black text-white transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            Startuoti zaidima
          </button>

          {!canStart && (
            <p className="mt-2 text-center text-sm text-amber-300">
              Reikia bent 3 zaideju, o impostoriu turi buti maziau nei zaideju.
            </p>
          )}
        </div>
      </main>
    )
  }

  if (phase === 'done') {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-8 sm:px-6">
        <div className="w-full rounded-2xl border border-slate-700 bg-slate-900 p-6 text-center text-slate-100 shadow-2xl sm:p-10">
          <p className="text-sm font-semibold text-cyan-300">Raundas baigtas</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Diskusija laikas 👀</h1>
          <p className="mt-3 text-slate-300">
            Dabar visi aptarineja ir bando ismusti impostoriu is vieso.
          </p>
          <button
            type="button"
            onClick={resetGame}
            className="mt-6 w-full rounded-xl bg-cyan-500 px-6 py-4 text-lg font-black text-slate-950 transition hover:bg-cyan-400"
          >
            Naujas raundas
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 sm:py-10">
      <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-bold text-cyan-300">
            Zaidejas {currentPlayerIndex + 1} is {players.length}
          </p>
          <button
            type="button"
            onClick={() => setShowMasterWord((prev) => !prev)}
            className="rounded-lg border border-slate-600 px-3 py-2 text-xs font-bold text-slate-200 transition hover:border-cyan-400 hover:text-cyan-300"
          >
            {showMasterWord ? 'Paslepti vedejui' : 'Rodyti zodi vedejui'}
          </button>
        </div>

        {showMasterWord && (
          <p className="mt-3 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200 transition">
            Vedejo zodis: <span className="font-black">{selectedWord}</span>
          </p>
        )}

        <h1 className="mt-6 text-center text-3xl font-black sm:text-4xl">{currentPlayer}</h1>

        <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-800/80 p-6 text-center">
          {!revealed ? (
            <>
              <p className="text-sm text-slate-300">Paduok telefona tik siam zaidejui</p>
              <button
                type="button"
                onClick={() => setRevealed(true)}
                className="mt-5 w-full rounded-xl bg-fuchsia-500 px-6 py-4 text-xl font-black text-white transition hover:bg-fuchsia-400"
              >
                Tap to Reveal
              </button>
            </>
          ) : isImpostor ? (
            <>
              <p className="text-xs font-bold uppercase tracking-wide text-rose-300">IMPOSTOR</p>
              <p className="mt-2 text-4xl font-black text-rose-200 sm:text-5xl">IMPOSTORIUS</p>
              <p className="mt-3 text-sm text-rose-100">Tu be zodzio. Sukis is padeties, seni.</p>
            </>
          ) : (
            <>
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-300">
                Slaptas zodis
              </p>
              <p className="mt-2 text-3xl font-black text-emerald-200 sm:text-4xl">{selectedWord}</p>
              <p className="mt-3 text-sm text-emerald-100">Nesudegink info. Buk ramus.</p>
            </>
          )}
        </div>

        {revealed && (
          <button
            type="button"
            onClick={nextPlayer}
            className="mt-6 w-full rounded-xl bg-cyan-500 px-6 py-4 text-lg font-black text-slate-950 transition hover:bg-cyan-400"
          >
            {currentPlayerIndex === players.length - 1 ? 'Baigti reveal' : 'Kitas zaidejas'}
          </button>
        )}
      </div>
    </main>
  )
}

export default App
