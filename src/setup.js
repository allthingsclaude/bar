import { createInterface } from 'readline';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { execSync } from 'child_process';
import { saveConfig } from './config.js';
import { login } from './login.js';
import { BRAND, DIM, RESET } from './colors.js';

const CLAUDE_SETTINGS_PATH = join(homedir(), '.claude', 'settings.json');

function ask(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

function yesNo(answer) {
  return answer === '' || answer.toLowerCase().startsWith('y');
}

function writeStatusLineConfig() {
  let settings = {};
  try {
    settings = JSON.parse(readFileSync(CLAUDE_SETTINGS_PATH, 'utf8'));
  } catch {}

  settings.statusLine = {
    type: 'command',
    command: 'claude-bar',
  };

  mkdirSync(dirname(CLAUDE_SETTINGS_PATH), { recursive: true });
  writeFileSync(CLAUDE_SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

export default async function setup() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    console.log();
    console.log(`${BRAND}  bar${RESET} ${DIM}— battery-themed statusline for Claude Code${RESET}`);
    console.log();

    // Line visibility prompts
    const showContext = yesNo(await ask(rl, `  Show context line? ${DIM}(Y/n)${RESET} `));
    const showSession = yesNo(await ask(rl, `  Show session/rate-limit line? ${DIM}(Y/n)${RESET} `));
    const showGit = yesNo(await ask(rl, `  Show git line? ${DIM}(Y/n)${RESET} `));

    // Save config
    const config = {
      lines: {
        context: showContext,
        session: showSession,
        git: showGit,
      },
    };
    saveConfig(config);
    console.log(`\n  ${DIM}Saved preferences to ~/.bar/config.json${RESET}`);

    // Install globally
    console.log(`\n  Installing globally...`);
    try {
      execSync('npm install -g @allthingsclaude/bar', { stdio: 'inherit' });
    } catch {
      console.error(`\n  ${BRAND}Warning:${RESET} Global install failed. You may need to run with sudo or fix npm permissions.`);
    }

    // OAuth login
    console.log(`\n  ${BRAND}Authenticating with Claude...${RESET}\n`);
    await login();

    // Write statusLine config to ~/.claude/settings.json
    writeStatusLineConfig();
    console.log(`\n  ${DIM}Configured statusLine in ~/.claude/settings.json${RESET}`);

    // Success
    console.log();
    console.log(`  ${BRAND}Setup complete!${RESET} Restart Claude Code to see your statusline.`);
    console.log();
  } finally {
    rl.close();
  }
}
