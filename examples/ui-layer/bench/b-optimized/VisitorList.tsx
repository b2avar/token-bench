import { useMemo, useState } from 'react'
import { Badge, Button, Card, Detail, Grid, Input, Modal, Person, Row, Select, Stat, Table, Title } from '../../src/ui'
import type { TableCol, Tone } from '../../src/ui'
import { VISITORS, STATUS_LABEL, KIND_LABEL, STATUS_OPTIONS, KIND_OPTIONS, type Visitor } from '../data'

const STATUS_TONE: Record<Visitor['status'], Tone> = { waiting: 'warn', inProgress: 'info', done: 'success' }
const KIND_TONE: Record<Visitor['kind'], Tone> = { student: 'info', staff: 'accent' }

const COLS: TableCol<Visitor>[] = [
  { key: 'name', head: 'Visitor', cell: (v) => <Person name={v.name} sub={v.group} /> },
  { key: 'kind', head: 'Type', cell: (v) => <Badge tone={KIND_TONE[v.kind]}>{KIND_LABEL[v.kind]}</Badge> },
  { key: 'reason', head: 'Reason' },
  { key: 'status', head: 'Status', cell: (v) => <Badge tone={STATUS_TONE[v.status]}>{STATUS_LABEL[v.status]}</Badge> },
  { key: 'waitMinutes', head: 'Wait', cell: (v) => `${v.waitMinutes} min` },
  { key: 'arrivedAt', head: 'Arrived' },
]

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

  const count = (s: Visitor['status']) => VISITORS.filter((v) => v.status === s).length

  return (
    <div className="flex flex-col gap-4 bg-gray-50 p-6 dark:bg-slate-900">
      <Row between>
        <Title>Infirmary Visitors</Title>
        <Button>New Visit</Button>
      </Row>

      <Grid cols={4}>
        <Stat label="Total" value={VISITORS.length} hint="Today" />
        <Stat label="Waiting" value={count('waiting')} hint="In queue" />
        <Stat label="In progress" value={count('inProgress')} hint="Being seen" />
        <Stat label="Completed" value={count('done')} hint="Checked out" />
      </Grid>

      <Card title="List">
        <Row gap={3} className="pb-4">
          <Input grow label="Search" placeholder="Search by name" value={search} onChange={setSearch} />
          <Select grow label="Status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
          <Select grow label="Type" value={kind} onChange={setKind} options={KIND_OPTIONS} />
        </Row>
        <Table rows={rows} cols={COLS} onRow={setSelected} />
      </Card>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Visitor details"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSelected(null)}>
              Close
            </Button>
            <Button>Open form</Button>
          </>
        }
      >
        {selected && (
          <Detail
            items={[
              ['Name', selected.name],
              ['Class / Unit', selected.group],
              ['Reason', selected.reason],
              ['Status', STATUS_LABEL[selected.status]],
              ['Arrival time', selected.arrivedAt],
              ['Note', selected.note],
            ]}
          />
        )}
      </Modal>
    </div>
  )
}

export default VisitorList
