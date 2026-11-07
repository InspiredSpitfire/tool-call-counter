import { expect, test } from 'claude-code/testing'
import type { TestBody } from 'claude-code/testing'

const SPINNER = {
  plugin: 'tool-call-counter',
  component: 'Spinner',
  requestId: 'main',
  props: { word: 'Thinking', message: null, suffix: '…', mode: 'thinking' },
} as const

const BAND = {
  plugin: 'tool-call-counter',
  component: 'AbovePrompt',
  requestId: 'above-prompt',
  props: {
    hasSurvey: false,
    isWorking: true,
    maxRows: 10,
    bodyColumns: 60,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const

function engine(on: Parameters<TestBody>[1]) {
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('tool.call', () => ({ result: {} }))
  // Stands for the engine's own spinner, drawn from the props the mod rewrote.
  on('ui.render', { component: 'Spinner' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>{(e.props.message ?? e.props.word) + e.props.suffix}</Text>
  })
  // Stands for the engine's empty band.
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine band</Text>
  })
}

test('the spinner carries the running count of this turn', async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.turn.start({ text: 'hi', turnId: 't1' })
  await $.tool.call({ tool: 'Bash', command: 'ls' })
  await $.tool.call({ tool: 'Read', file_path: '/x' })

  const ui = await $.ui.mount({ ...SPINNER, surface: 'terminal' })
  const row = await ui.find({ type: 'Text', text: /tool calls/ })
  expect(row?.text).toBe('Thinking · tool calls: 2…')
  await ui.unmount()
})

test('the band above the prompt shows the count while working', async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.turn.start({ text: 'hi', turnId: 't1' })
  await $.tool.call({ tool: 'Bash', command: 'ls' })
  await $.tool.call({ tool: 'Bash', command: 'pwd' })
  await $.tool.call({ tool: 'Read', file_path: '/x' })

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const row = await ui.find({ type: 'Text', text: /tool calls/ })
  expect(row?.text).toBe('Thinking · tool calls: 3')
  await ui.unmount()
})

test('the band yields to the engine while idle', async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const ui = await $.ui.mount({
    ...BAND,
    props: { ...BAND.props, isWorking: false },
    surface: 'desktop',
  })
  expect((await ui.find({ type: 'Text', text: /engine band/ }))?.text).toBe('engine band')
  expect(await ui.find({ type: 'Text', text: /tool calls/ })).toBeUndefined()
  await ui.unmount()
})

test('past ten calls the band turns red and asks for a check-in', async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.turn.start({ text: 'hi', turnId: 't1' })
  for (let i = 0; i < 11; i += 1) {
    await $.tool.call({ tool: 'Bash', command: `echo ${i}` })
  }

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const row = await ui.find({ type: 'Text', text: /spiraling/ })
  expect(row?.text).toBe('Claude is spiraling, want to check in? (tool calls: 11)')
  expect(row?.props.color).toBe('red')
  await ui.unmount()
})

test('at exactly ten calls the band still shows the plain count', async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.turn.start({ text: 'hi', turnId: 't1' })
  for (let i = 0; i < 10; i += 1) {
    await $.tool.call({ tool: 'Bash', command: `echo ${i}` })
  }

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /tool calls/ }))?.text).toBe('Thinking · tool calls: 10')
  await ui.unmount()
})

test('past ten calls the spinner says so too', async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.turn.start({ text: 'hi', turnId: 't1' })
  for (let i = 0; i < 12; i += 1) {
    await $.tool.call({ tool: 'Bash', command: `echo ${i}` })
  }

  const ui = await $.ui.mount({ ...SPINNER, surface: 'terminal' })
  const row = await ui.find({ type: 'Text', text: /spiraling/ })
  expect(row?.text).toBe('Claude is spiraling, want to check in? (tool calls: 12)…')
  await ui.unmount()
})

test('a new main turn starts the count over', async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.turn.start({ text: 'one', turnId: 't1' })
  await $.tool.call({ tool: 'Bash', command: 'ls' })
  await $.turn.start({ text: 'two', turnId: 't2' })

  const ui = await $.ui.mount({ ...SPINNER, surface: 'terminal' })
  const row = await ui.find({ type: 'Text', text: /tool calls/ })
  expect(row?.text).toBe('Thinking · tool calls: 0…')
  await ui.unmount()
})
