export interface Visitor {
  id: number
  name: string
  group: string
  kind: 'student' | 'staff'
  reason: string
  status: 'waiting' | 'inProgress' | 'done'
  waitMinutes: number
  arrivedAt: string
  note: string
}

export const VISITORS: Visitor[] = [
  { id: 1, name: 'Ada Lindqvist', group: '10-B', kind: 'student', reason: 'Headache', status: 'waiting', waitMinutes: 24, arrivedAt: '09:12', note: 'Ongoing since this morning.' },
  { id: 2, name: 'Karim Haddad', group: 'Mathematics', kind: 'staff', reason: 'Blood pressure check', status: 'inProgress', waitMinutes: 8, arrivedAt: '09:31', note: 'Routine follow-up.' },
  { id: 3, name: 'Elif Sato', group: '9-A', kind: 'student', reason: 'Grazed knee', status: 'done', waitMinutes: 0, arrivedAt: '08:45', note: 'Dressed and released.' },
  { id: 4, name: 'Mert Novak', group: '11-C', kind: 'student', reason: 'Nausea', status: 'waiting', waitMinutes: 41, arrivedAt: '08:58', note: 'Guardian notified.' },
  { id: 5, name: 'Zeynep Okafor', group: 'Administration', kind: 'staff', reason: 'Allergic reaction', status: 'done', waitMinutes: 0, arrivedAt: '08:20', note: 'Antihistamine administered.' },
]

export const STATUS_LABEL: Record<Visitor['status'], string> = {
  waiting: 'Waiting',
  inProgress: 'In progress',
  done: 'Completed',
}

export const KIND_LABEL: Record<Visitor['kind'], string> = {
  student: 'Student',
  staff: 'Staff',
}

export const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'inProgress', label: 'In progress' },
  { value: 'done', label: 'Completed' },
]

export const KIND_OPTIONS = [
  { value: 'all', label: 'Everyone' },
  { value: 'student', label: 'Student' },
  { value: 'staff', label: 'Staff' },
]
