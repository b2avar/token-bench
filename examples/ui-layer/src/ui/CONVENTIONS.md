# UI layer — how to use it

Don't write Tailwind classes in screen files. Everything comes from `src/ui`.

```tsx
import { Badge, Button, Card, Detail, Grid, Input, Modal, Person, Row, Select, Stat, Table, Title } from '@/ui'
```

## Components

| | use |
|---|---|
| `<Title>` `<H2>` `<H3>` | headings |
| `<Text as="meta">` | `as`: title/h2/h3/body/cell/name/label/meta/head/value |
| `<Row gap={2} pad={0} between wrap grow>` | horizontal flex |
| `<Col>` | vertical flex |
| `<Grid cols={4} gap={4}>` | responsive grid (columns kick in at `xl`) |
| `<Card title="..." action={...}>` | section box |
| `<Stat label value hint trend>` | stat card |
| `<Badge tone="info">` | tone: neutral/info/success/warn/danger/accent |
| `<Person name sub size>` | avatar + name + subtitle |
| `<Table rows cols onRow>` | see below |
| `<Detail items={[[label, value]]} cols={2}>` | label/value list |
| `<Input label value onChange grow>` | `onChange` receives `(v: string) => void` directly |
| `<Select label value onChange options grow>` | `options: {value,label}[]` |
| `<Button variant="primary\|ghost" onClick>` | |
| `<Modal open onClose title footer>` | |

## Table

Columns are a constant array declared outside the component:

```tsx
const COLS: TableCol<Visitor>[] = [
  { key: 'name', head: 'Visitor', cell: (v) => <Person name={v.name} sub={v.group} /> },
  { key: 'reason', head: 'Reason' },
]
```

With no `cell`, `row[key]` is printed.

## Rules

1. `className` in a screen file is for one-off cases the layer doesn't cover — nothing else.
2. If a visual pattern appears a second time, add a component to the layer rather than writing Tailwind in the screen.
3. Colors, surfaces, and borders come from `tokens.ts` (`surface`, `line`, `text`, `tone`) — never a raw hex.
4. The `dark:` prefix lives **only** in `tokens.ts`. It should appear in no other file.
5. Identifiers in English; user-facing copy in whatever language the product ships.

## Checks

```bash
npm run bench                  # token comparison
npx tsc -b --noEmit            # types
grep -rn "dark:" src/screens   # should print nothing
```
