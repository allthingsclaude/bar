# bar

A battery-themed statusline for Claude Code. Shows context usage, session limits, and git info — right in your terminal.

```
Claude 3.5 Sonnet | 120k/167k [████████░] 72%
Session | [██████░░] 65% | 2h 15m
⌗ main | +24 -8
```

## Install

```sh
npm i -g @allthingsclaude/bar
```

## Setup

### 1. Authenticate

```sh
claude-bar login
```

Opens your browser to sign in with your Anthropic account (OAuth + PKCE). Tokens are stored securely in `~/.bar/tokens.json`.

### 2. Configure Claude Code

Add to your Claude Code settings (`~/.claude/settings.json`):

```json
{
  "statusline": "claude-bar"
}
```

## What it shows

| Line | Info |
|------|------|
| **Context** | Model name, token usage (used/total), fill percentage with progress bar |
| **Session** | 5-hour rate-limit window usage with time remaining |
| **Git** | Branch name, lines added/removed, worktree indicator |

Progress bars shift from dim to bright as usage increases.

## Commands

| Command | Description |
|---------|-------------|
| `claude-bar` | Render statusline (reads from stdin) |
| `claude-bar login` | Authenticate via OAuth |
| `claude-bar logout` | Remove stored token |

## Auth options

Bar resolves tokens in this order:

1. `BAR_TOKEN` environment variable
2. `CLAUDE_CODE_OAUTH_TOKEN` environment variable
3. `~/.bar/tokens.json` (created by `claude-bar login`)

## License

MIT
