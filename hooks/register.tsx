import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

// The main loop's tool calls this turn. Kept in $.state so a hot reload
// keeps the number and so every drawing that reads it redraws on a write.
const count = atom({ plugin: 'tool-call-counter', key: 'count' } as const, 0)

// Past this many calls in one turn the display turns red and asks for a check-in.
const SPIRAL_AFTER = 10
const SPIRAL_TEXT = 'Claude is spiraling, want to check in?'

export const register: Register = on => {
  // A new main turn starts the count over; subagent turns are left alone.
  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined) {
      await update($, count, () => 0)
    }
    return next(e)
  })

  // Every tool call Claude makes on the main loop, whatever the tool.
  // A failed count write never blocks the call itself.
  on('tool.call', async ($, e, next) => {
    if (e.agentId === undefined) {
      await update($, count, n => n + 1)
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  // The band above the prompt, drawn while a turn runs. This is what the
  // desktop app shows; it yields to a survey and to an idle prompt.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || !e.props.isWorking) {
      return next(e)
    }
    const n = await read($, count)
    const { Text } = $.ui.resolve(e)
    if (n > SPIRAL_AFTER) {
      return <Text color="red" bold>{`${SPIRAL_TEXT} (tool calls: ${n})`}</Text>
    }
    return <Text>{`Thinking · tool calls: ${n}`}</Text>
  })

  // The spinner line, for the terminal and vscode: the count rides on
  // whichever text it draws, the override message when one is set, else
  // the word. The desktop app does not show this rewrite; the band covers it.
  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    const n = await read($, count)
    if (n > SPIRAL_AFTER) {
      // The spinner's props carry no colour; the band is where the red shows.
      return next({ ...e, props: { ...e.props, message: `${SPIRAL_TEXT} (tool calls: ${n})` } })
    }
    const tail = ` · tool calls: ${n}`
    const props =
      e.props.message !== null
        ? { ...e.props, message: e.props.message + tail }
        : { ...e.props, word: e.props.word + tail }
    return next({ ...e, props })
  })
}
