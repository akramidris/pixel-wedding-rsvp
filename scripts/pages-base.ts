import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** GitHub's Pages metadata is authoritative, including custom-domain deployments. */
export function resolvePagesBase(
  environment: NodeJS.ProcessEnv = process.env,
  remote?: string,
  customDomain = false,
): string {
  if (environment.PAGES_BASE_PATH !== undefined) {
    const path = environment.PAGES_BASE_PATH.trim();
    if (path === '' || path === '/') return '/';
    if (!/^\/[A-Za-z0-9._~-]+\/?$/.test(path)) {
      throw new Error('PAGES_BASE_PATH must be / or a repository path such as /my-wedding/.');
    }
    return `${path.replace(/\/$/, '')}/`;
  }
  if (customDomain) return '/';

  const repository =
    environment.GITHUB_REPOSITORY ||
    remote
      ?.trim()
      .match(
        /^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([^\s]+)$/,
      )?.[1];
  const match = repository
    ?.replace(/\.git$/, '')
    .replace(/\/$/, '')
    .match(/^([\w.-]+)\/([\w.-]+)$/);
  if (!match) return './';
  const [, owner, name] = match;
  return name.toLowerCase() === `${owner}.github.io`.toLowerCase() ? '/' : `/${name}/`;
}

export function getPagesBase(): string {
  let remote: string | undefined;
  if (process.env.PAGES_BASE_PATH === undefined && !process.env.GITHUB_REPOSITORY) {
    try {
      remote = execFileSync('git', ['remote', 'get-url', 'origin'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 3000,
      });
    } catch {
      /* An unconnected local project remains portable with relative assets. */
    }
  }
  const cname = resolve('public/CNAME');
  const customDomain = existsSync(cname) && readFileSync(cname, 'utf8').trim().length > 0;
  return resolvePagesBase(process.env, remote, customDomain);
}
