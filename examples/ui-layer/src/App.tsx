import { useState } from 'react'
import Baseline from '../bench/a-baseline/VisitorList'
import Optimized from '../bench/b-optimized/VisitorList'

const App = () => {
  const [side, setSide] = useState<'a' | 'b'>('b')
  const [dark, setDark] = useState(false)

  return (
    <div className={dark ? 'dark' : undefined}>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        <div className="flex items-center gap-2 border-0 border-b border-solid border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
          <button
            onClick={() => setSide('a')}
            className={`h-8 cursor-pointer rounded-lg border border-solid px-3 text-sm ${side === 'a' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-200 bg-transparent text-gray-700 dark:border-slate-600 dark:text-slate-300'}`}
          >
            A — raw Tailwind
          </button>
          <button
            onClick={() => setSide('b')}
            className={`h-8 cursor-pointer rounded-lg border border-solid px-3 text-sm ${side === 'b' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-200 bg-transparent text-gray-700 dark:border-slate-600 dark:text-slate-300'}`}
          >
            B — semantic layer
          </button>
          <button
            onClick={() => setDark((d) => !d)}
            className="ml-auto h-8 cursor-pointer rounded-lg border border-solid border-gray-200 bg-transparent px-3 text-sm text-gray-700 dark:border-slate-600 dark:text-slate-300"
          >
            {dark ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>
        {side === 'a' ? <Baseline /> : <Optimized />}
      </div>
    </div>
  )
}

export default App
