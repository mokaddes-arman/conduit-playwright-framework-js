import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const AUTH_FILE = path.resolve(__dirname, '../playwright/.auth/user.json');
export const TOKEN_FILE = path.resolve(__dirname, '../playwright/.auth/token.json');

/**
 * Reads the full auth record ({ token, username, email, password }) written by
 * the auth setup. UI tests share the setup user's storage state, so this token
 * seeds data via the API that is then visible in the browser session.
 */
export function readSetupAuth() {
  if (!fs.existsSync(TOKEN_FILE)) {
    throw new Error(`Auth record not found at ${TOKEN_FILE}. Run the "setup" project first.`);
  }
  return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8'));
}

export function readSetupToken() {
  return readSetupAuth().token;
}
