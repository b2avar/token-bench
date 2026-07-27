import { useMemo, useState } from 'react'
import { VISITORS, STATUS_LABEL, KIND_LABEL, STATUS_OPTIONS, KIND_OPTIONS, type Visitor } from '../data'

const initials = (name: string) =>
  name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()

const VisitorList = () => {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [kind, setKind] = useState('all')
  const [selected, setSelected] = useState<Visitor | null>(null)

  const rows = useMemo(
    () =>
      VISITORS.filter(
        (v) =>
          v.name.toLowerCase().includes(search.toLowerCase()) &&
          (status === 'all' || v.status === status) &&
          (kind === 'all' || v.kind === kind),
      ),
    [search, status, kind],
  )

  const waiting = VISITORS.filter((v) => v.status === 'waiting').length
  const inProgress = VISITORS.filter((v) => v.status === 'inProgress').length
  const done = VISITORS.filter((v) => v.status === 'done').length

  return (
    <div className="flex flex-col gap-4 bg-gray-50 p-6 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-slate-50">Infirmary Visitors</h1>
        <button className="h-9 cursor-pointer rounded-lg border border-solid border-transparent bg-indigo-600 px-3 text-sm font-medium text-white transition-colors hover:bg-indigo-700">
          New Visit
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <div className="rounded-xl border border-solid border-gray-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/40">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-300">Total</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-slate-50">{VISITORS.length}</p>
          <p className="text-xs text-gray-400 dark:text-slate-500">Today</p>
        </div>
        <div className="rounded-xl border border-solid border-gray-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/40">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-300">Waiting</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-slate-50">{waiting}</p>
          <p className="text-xs text-gray-400 dark:text-slate-500">In queue</p>
        </div>
        <div className="rounded-xl border border-solid border-gray-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/40">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-300">In progress</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-slate-50">{inProgress}</p>
          <p className="text-xs text-gray-400 dark:text-slate-500">Being seen</p>
        </div>
        <div className="rounded-xl border border-solid border-gray-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/40">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-300">Completed</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-slate-50">{done}</p>
          <p className="text-xs text-gray-400 dark:text-slate-500">Checked out</p>
        </div>
      </div>

      <div className="rounded-xl border border-solid border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/40">
        <div className="flex items-center justify-between border-0 border-b border-solid border-gray-100 p-4 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">List</h2>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-3 pb-4">
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-sm text-gray-500 dark:text-slate-400">Search</span>
              <input
                className="h-9 rounded-lg border border-solid border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                placeholder="Search by name"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-sm text-gray-500 dark:text-slate-400">Status</span>
              <select
                className="h-9 rounded-lg border border-solid border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition-colors focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-sm text-gray-500 dark:text-slate-400">Type</span>
              <select
                className="h-9 rounded-lg border border-solid border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition-colors focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
              >
                {KIND_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="overflow-x-auto rounded-lg border border-solid border-gray-200 dark:border-slate-700">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-700">
                  <th className="p-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-300">Visitor</th>
                  <th className="p-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-300">Type</th>
                  <th className="p-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-300">Reason</th>
                  <th className="p-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-300">Status</th>
                  <th className="p-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-300">Wait</th>
                  <th className="p-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-300">Arrived</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-xs text-gray-400 dark:text-slate-500">
                      No records
                    </td>
                  </tr>
                )}
                {rows.map((v) => (
                  <tr
                    key={v.id}
                    onClick={() => setSelected(v)}
                    className="cursor-pointer border-0 border-t border-solid border-slate-100 hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-700/30"
                  >
                    <td className="p-4 text-sm text-gray-600 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                          {initials(v.name)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900 dark:text-slate-100">{v.name}</span>
                          <span className="text-xs text-gray-400 dark:text-slate-500">{v.group}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-600 dark:text-slate-300">
                      <span
                        className={
                          v.kind === 'student'
                            ? 'whitespace-nowrap rounded-full border border-solid border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                            : 'whitespace-nowrap rounded-full border border-solid border-purple-200 bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 dark:border-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                        }
                      >
                        {KIND_LABEL[v.kind]}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-600 dark:text-slate-300">{v.reason}</td>
                    <td className="p-4 text-sm text-gray-600 dark:text-slate-300">
                      <span
                        className={
                          v.status === 'waiting'
                            ? 'whitespace-nowrap rounded-full border border-solid border-orange-200 bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700 dark:border-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                            : v.status === 'inProgress'
                              ? 'whitespace-nowrap rounded-full border border-solid border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                              : 'whitespace-nowrap rounded-full border border-solid border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300'
                        }
                      >
                        {STATUS_LABEL[v.status]}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-600 dark:text-slate-300">{v.waitMinutes} min</td>
                    <td className="p-4 text-sm text-gray-600 dark:text-slate-300">{v.arrivedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-xl border border-solid border-gray-100 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800/40"
          >
            <div className="flex items-center justify-between border-0 border-b border-solid border-gray-100 p-4 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Visitor details</h2>
              <button
                onClick={() => setSelected(null)}
                className="cursor-pointer border-0 bg-transparent text-sm text-gray-500 dark:text-slate-400"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              <dl className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-300">Name</dt>
                  <dd className="text-sm text-gray-700 dark:text-slate-200">{selected.name}</dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-300">Class / Unit</dt>
                  <dd className="text-sm text-gray-700 dark:text-slate-200">{selected.group}</dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-300">Reason</dt>
                  <dd className="text-sm text-gray-700 dark:text-slate-200">{selected.reason}</dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-300">Status</dt>
                  <dd className="text-sm text-gray-700 dark:text-slate-200">{STATUS_LABEL[selected.status]}</dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-300">Arrival time</dt>
                  <dd className="text-sm text-gray-700 dark:text-slate-200">{selected.arrivedAt}</dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-300">Note</dt>
                  <dd className="text-sm text-gray-700 dark:text-slate-200">{selected.note}</dd>
                </div>
              </dl>
            </div>
            <div className="flex items-center justify-between border-0 border-t border-solid border-gray-100 p-4 dark:border-slate-700">
              <button
                onClick={() => setSelected(null)}
                className="h-9 cursor-pointer rounded-lg border border-solid border-gray-200 bg-transparent px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700/50"
              >
                Close
              </button>
              <button className="h-9 cursor-pointer rounded-lg border border-solid border-transparent bg-indigo-600 px-3 text-sm font-medium text-white transition-colors hover:bg-indigo-700">
                Open form
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default VisitorList
