export const surface = {
  page: 'bg-gray-50 dark:bg-slate-900',
  card: 'bg-white dark:bg-slate-800/40',
  sunken: 'bg-gray-50 dark:bg-slate-700/40',
  header: 'bg-gray-50 dark:bg-slate-700',
  overlay: 'bg-slate-900/50',
  avatar: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  rowHover: 'hover:bg-gray-50 dark:hover:bg-slate-700/30',
} as const

export const line = {
  soft: 'border-gray-100 dark:border-slate-700',
  base: 'border-gray-200 dark:border-slate-700',
  row: 'border-slate-100 dark:border-slate-700',
} as const

export const text = {
  title: 'text-xl font-bold text-gray-900 dark:text-slate-50',
  h2: 'text-lg font-semibold text-gray-900 dark:text-slate-100',
  h3: 'text-base font-semibold text-gray-900 dark:text-slate-100',
  body: 'text-sm text-gray-700 dark:text-slate-200',
  cell: 'text-sm text-gray-600 dark:text-slate-300',
  name: 'text-sm font-medium text-gray-900 dark:text-slate-100',
  label: 'text-sm text-gray-500 dark:text-slate-400',
  meta: 'text-xs text-gray-400 dark:text-slate-500',
  head: 'text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-300',
  value: 'text-2xl font-bold text-gray-900 dark:text-slate-50',
} as const

export const tone = {
  neutral: 'border-gray-200 bg-gray-50 text-gray-700 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-200',
  info: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  success: 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300',
  warn: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  danger: 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300',
  accent: 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
} as const

export const control = {
  base: 'h-9 rounded-lg border border-solid px-3 text-sm outline-none transition-colors',
  field: 'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500',
  primary: 'border-transparent bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50',
  ghost: 'border-gray-200 bg-transparent text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700/50',
} as const

export type Tone = keyof typeof tone

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ')
