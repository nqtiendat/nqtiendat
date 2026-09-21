// Regenerates the "Recent Activity" block in README.md from the GitHub API.
// Run: node index.js   (Node 18+, no dependencies)

import { readFile, writeFile } from 'node:fs/promises';

const USER = 'nqtiendat';
const LIMIT = 5;
const START = '<!-- ACTIVITY:START -->';
const END = '<!-- ACTIVITY:END -->';

async function fetchRepos() {
  const headers = { Accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const res = await fetch(
    `https://api.github.com/users/${USER}/repos?sort=pushed&per_page=100`,
    { headers },
  );
  if (!res.ok) {
    throw new Error(
      `GitHub API returned ${res.status} for ${USER}'s repos. ` +
        `If this is a rate limit, set GITHUB_TOKEN. Body: ${await res.text()}`,
    );
  }
  return res.json();
}

function renderList(repos) {
  const items = repos
    .filter((repo) => !repo.fork && !repo.archived)
    .slice(0, LIMIT)
    .map((repo) => {
      const pushed = new Date(repo.pushed_at).toISOString().slice(0, 10);
      const about = repo.description ? ` — ${repo.description}` : '';
      return `<li><a href="${repo.html_url}">${repo.name}</a>${about} <sub>${pushed}</sub></li>`;
    });

  if (items.length === 0) {
    throw new Error(`No non-fork repositories found for ${USER}; nothing to render.`);
  }
  return `<ul>\n  ${items.join('\n  ')}\n</ul>`;
}

const readme = await readFile('README.md', 'utf8');
const start = readme.indexOf(START);
const end = readme.indexOf(END);
if (start === -1 || end === -1) {
  throw new Error(`README.md is missing the ${START} / ${END} markers; add them back.`);
}

const repos = await fetchRepos();
const next =
  readme.slice(0, start + START.length) +
  '\n' +
  renderList(repos) +
  '\n' +
  readme.slice(end);

await writeFile('README.md', next);
console.log(`Updated Recent Activity with up to ${LIMIT} repositories.`);
