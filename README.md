# tool-call-counter

A Claude Code mod that counts every tool call Claude makes in the current turn and shows the running count while it works. Up to ten calls the band above the prompt reads `Thinking · tool calls: 7`. Past ten it turns red and bold and reads `Claude is spiraling, want to check in? (tool calls: 11)`, so you notice when a turn is running away with itself. The count resets on every new message you send. In terminal sessions the same text also rides on the spinner line.

Counted: tool calls on the main loop, whatever the tool. Not counted: calls made by subagents.

## Install

At the prompt of a terminal session:

```
/plugin install tool-call-counter --marketplace InspiredSpitfire/tool-call-counter
```

Answer `y` to add the marketplace, then pick a scope (user is the usual one).

From a shell:

```
claude plugin install tool-call-counter --marketplace InspiredSpitfire/tool-call-counter
```

In the Claude desktop app, where `/plugin` does not run: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `InspiredSpitfire/tool-call-counter`, then **Add plugin**.

## How it works

- `hooks/register.tsx` is the whole mod. It keeps the count in session state, resets it on `turn.start`, adds one on every `tool.call`, and draws the `AbovePrompt` band while a turn is working. A `Spinner` render hook adds the same text to the spinner for terminal and VS Code sessions.
- `types/index.d.ts` declares the one state value.
- `tests/spinner.test.tsx` covers the count, the per-turn reset, the idle band, the red threshold and the spinner text. Run them with `claude plugin test .`.

The threshold is the `SPIRAL_AFTER` constant at the top of the hooks module.

## Develop

```
claude plugin validate .
claude plugin test .
claude --plugin-dir .
```

## License

MIT
