# bar

A battery-themed statusline for Claude Code. Shows context usage, session limits, and git info — right in your terminal.

```
Claude 3.5 Sonnet | 120k/167k [████████░] 72%
Session | [██████░░] 65% | 2h 15m
⌗ main | +24 -8
```

## Quick start

```sh
npx @allthingsclaude/bar
```

The interactive setup wizard will:

1. Ask which lines you want visible (context, session, git)
2. Install `claude-bar` globally
3. Open your browser to authenticate with your Anthropic account
4. Configure Claude Code's `statusLine` in `~/.claude/settings.json`

Restart Claude Code and you're done.

## Manual setup

If you prefer to set things up yourself:

### 1. Install

```sh
npm i -g @allthingsclaude/bar
```

### 2. Authenticate

```sh
claude-bar login
```

Opens your browser to sign in with your Anthropic account (OAuth + PKCE). Tokens are stored securely in `~/.bar/tokens.json`.

### 3. Configure Claude Code

Add to your Claude Code settings (`~/.claude/settings.json`):

```json
{
  "statusLine": {
    "type": "command",
    "command": "claude-bar"
  }
}
```

## What it shows

| Line | Info |
|------|------|
| **Context** | Model name, token usage (used/total), fill percentage with progress bar |
| **Session** | 5-hour rate-limit window usage with time remaining |
| **Git** | Branch name, lines added/removed, worktree indicator |

Progress bars shift from dim to bright as usage increases.

## Line visibility

The setup wizard saves your preferences to `~/.bar/config.json`. You can also edit it directly:

```json
{
  "lines": {
    "context": true,
    "session": true,
    "git": true
  }
}
```

Set any line to `false` to hide it.

## Commands

| Command | Description |
|---------|-------------|
| `npx @allthingsclaude/bar` | Run interactive setup wizard |
| `claude-bar login` | Authenticate via OAuth |
| `claude-bar logout` | Remove stored token |

## Auth options

Bar resolves tokens in this order:

1. `BAR_TOKEN` environment variable
2. `CLAUDE_CODE_OAUTH_TOKEN` environment variable
3. `~/.bar/tokens.json` (created by `claude-bar login`)

## License

MIT
