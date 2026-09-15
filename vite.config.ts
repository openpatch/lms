import { execSync } from 'node:child_process'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

/**
 * Which build this is, for the footer.
 *
 * "It did this in the lesson yesterday" is only answerable if the build the
 * class was on can be named, and the version in package.json has never moved
 * off 0.0.0 — so the commit is the version. The server builds from its own
 * checkout (see deploy/nginx.conf), so git is there to ask; a build from a
 * tarball is not going to know, and says so by showing nothing at all.
 *
 * A dirty tree gets a "+": on the server there is never one, and locally it is
 * the difference between the commit and whatever is actually running.
 */
function buildStamp(): { sha: string; date: string } {
  const git = (command: string) => execSync(command, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  try {
    const dirty = git('git status --porcelain') !== ''
    return { sha: git('git rev-parse --short HEAD') + (dirty ? '+' : ''), date: git('git log -1 --format=%cI') }
  } catch {
    return { sha: '', date: '' }
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  define: {
    __APP_VERSION__: JSON.stringify(buildStamp()),
  },
  plugins: [react(), tailwindcss()],
  server: {
    // Same shape as production, where Caddy proxies /parties to the game
    // server: the client always talks to the host it was served from.
    proxy: {
      '/parties': {
        target: 'http://localhost:3000',
        ws: true,
      },
    },
  },
})
