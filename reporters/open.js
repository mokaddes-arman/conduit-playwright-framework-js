import { spawn } from 'node:child_process';

/**
 * Open a file or URL in the OS default application, detached from this process.
 * Mirrors the platform switch Playwright itself uses.
 */
export function openPath(target) {
  const cmd =
    process.platform === 'darwin'
      ? 'open'
      : process.platform === 'win32'
        ? 'explorer'
        : 'xdg-open';
  const child = spawn(cmd, [target], { stdio: 'ignore', detached: true });
  child.on('error', () => {});
  child.unref();
}
