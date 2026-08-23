/**
 * Build-time content pipeline.
 *
 * Reads the two generated Asciidoctor single-page HTML docs (backend + frontend)
 * and README.md from the sibling source repo, and produces:
 *   - src/content/sections/<source>-<slug>.html  (one fragment per h2 / sect1)
 *   - public/diagrams/*.svg                      (copied diagram SVGs)
 *   - src/content/readme.md                      (copy of source README)
 *   - src/content/manifest.json                  (section metadata + TOC headings)
 *   - src/content/search-index.json              (plain-text search corpus)
 *
 * Run via `npm run extract` (also runs automatically on predev/prebuild).
 */
import { parse } from 'node-html-parser';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, copyFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceRepo = resolve(projectRoot, '..', 'fineract-consumer-facing');

const SOURCES = [
  {
    id: 'backend',
    title: 'Consumer BFF (Backend)',
    htmlPath: join(sourceRepo, 'docs/build/docs/html/index.html'),
  },
  {
    id: 'frontend',
    title: 'Web App (Frontend)',
    htmlPath: join(sourceRepo, 'docs/build/docs/html-frontend/index.html'),
  },
];
const IMAGES_DIR = join(sourceRepo, 'docs/build/docs/html/images');
// A local override README (e.g. from an unmerged PR) takes precedence over the
// source repo's README.md.
const OVERRIDE_README = join(projectRoot, 'overrides/readme.md');
const README_PATH = existsSync(OVERRIDE_README)
  ? OVERRIDE_README
  : join(sourceRepo, 'README.md');

const sectionsDir = join(projectRoot, 'src/content/sections');
const contentDir = join(projectRoot, 'src/content');
const diagramsDir = join(projectRoot, 'public/diagrams');

// On CI (e.g. Cloudflare Pages) the sibling source repo is absent — build from
// the committed src/content snapshot instead of re-extracting.
if (!existsSync(SOURCES[0].htmlPath)) {
  if (existsSync(join(contentDir, 'manifest.json'))) {
    console.warn('[extract-docs] source repo not found; using committed src/content snapshot');
    process.exit(0);
  }
  console.error(`[extract-docs] source repo not found at ${sourceRepo} and no committed content exists`);
  process.exit(1);
}

// Start from a clean slate so stale fragments/diagrams never linger.
rmSync(sectionsDir, { recursive: true, force: true });
rmSync(diagramsDir, { recursive: true, force: true });
mkdirSync(sectionsDir, { recursive: true });
mkdirSync(diagramsDir, { recursive: true });

const collapse = (s) => s.replace(/\s+/g, ' ').trim();

/**
 * Repair an Asciidoctor artifact in the generated docs: literal '*' glob
 * characters inside backtick code (e.g. `spring.data.redis.*`, `src/**` + '/*.ts')
 * were interpreted as bold delimiters, producing <strong>/</strong> tags that
 * open inside one <code> span and close inside a later one. Browsers tolerate
 * the mis-nesting; node-html-parser's tag stack unwinds and silently drops the
 * rest of the enclosing section. Within each plain inline <code> span, replace
 * strong tags that are not balanced inside that span with a literal '*'
 * (restoring the author's intent). Balanced pairs are left untouched.
 */
function repairCrossNestedStrong(html) {
  return html.replace(/<code>([\s\S]*?)<\/code>/g, (match, inner) => {
    if (!/<\/?strong>/.test(inner)) return match;
    const tokens = inner.split(/(<\/?strong>)/);
    // Indices of tokens forming properly nested pairs within this span.
    const keep = new Set();
    const stack = [];
    tokens.forEach((tok, i) => {
      if (tok === '<strong>') stack.push(i);
      else if (tok === '</strong>' && stack.length) {
        keep.add(stack.pop());
        keep.add(i);
      }
    });
    const repaired = tokens
      .map((tok, i) => (/^<\/?strong>$/.test(tok) && !keep.has(i) ? '*' : tok))
      .join('');
    return `<code>${repaired}</code>`;
  });
}

const manifest = { generatedFrom: 'fineract-consumer-facing', sources: [] };
const searchIndex = [];

for (const source of SOURCES) {
  const html = repairCrossNestedStrong(readFileSync(source.htmlPath, 'utf8'));
  const root = parse(html);

  const docTitle =
    collapse(root.querySelector('title')?.text ?? '') ||
    collapse(root.querySelector('h1')?.text ?? '');

  const sections = [];
  for (const sect1 of root.querySelectorAll('div.sect1')) {
    const h2 = sect1.querySelector('h2');
    if (!h2) continue;
    const id = h2.getAttribute('id') ?? '';
    const slug = id.replace(/^_/, '').replace(/_/g, '-');

    // Strip a leading "Appendix: " prefix from the section title (manifest and
    // rendered <h2> alike); the slug keeps its original appendix- form.
    const rawTitle = collapse(h2.text);
    const title = rawTitle.replace(/^Appendix:\s*/, '');
    if (title !== rawTitle) {
      h2.set_content(h2.innerHTML.replace(/Appendix:\s*/, ''));
    }

    // Sanitize: drop <script> tags and inline style attributes.
    sect1.querySelectorAll('script').forEach((el) => el.remove());
    sect1.querySelectorAll('[style]').forEach((el) => el.removeAttribute('style'));

    // Unwrap in-text jump links (href="#..."): the SPA renders one section per
    // page, so internal cross-references would break. Keep the inner content.
    for (const a of sect1.querySelectorAll('a')) {
      const href = a.getAttribute('href');
      if (href && href.startsWith('#')) a.replaceWith(a.innerHTML);
    }

    // Rewrite image paths to the copied diagram location.
    for (const img of sect1.querySelectorAll('img')) {
      const src = img.getAttribute('src');
      if (src && src.startsWith('images/')) {
        img.setAttribute('src', '/diagrams/' + src.slice('images/'.length));
      }
    }

    const headings = sect1
      .querySelectorAll('h3, h4')
      .map((h) => ({
        id: h.getAttribute('id') ?? '',
        text: collapse(h.text),
        level: Number(h.rawTagName[1]),
      }));

    const text = collapse(sect1.text);
    const file = `${source.id}-${slug}.html`;
    writeFileSync(join(sectionsDir, file), sect1.innerHTML, 'utf8');

    sections.push({
      slug,
      title,
      file,
      words: text === '' ? 0 : text.split(' ').length,
      headings,
    });
    searchIndex.push({ source: source.id, slug, title, text });
  }

  manifest.sources.push({ id: source.id, title: source.title, docTitle, sections });
}

// Copy diagram SVGs.
const svgs = readdirSync(IMAGES_DIR).filter((f) => f.endsWith('.svg'));
for (const svg of svgs) {
  copyFileSync(join(IMAGES_DIR, svg), join(diagramsDir, basename(svg)));
}

// Copy README and index it for search.
const readme = readFileSync(README_PATH, 'utf8');
writeFileSync(join(contentDir, 'readme.md'), readme, 'utf8');
searchIndex.push({
  source: 'readme',
  slug: 'readme',
  title: 'README',
  // Strip HTML comments (license header) and markdown-ish noise for search.
  text: collapse(readme.replace(/<!--[\s\S]*?-->/g, ' ').replace(/[#*`>|]/g, ' ')),
});

writeFileSync(join(contentDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
writeFileSync(join(contentDir, 'search-index.json'), JSON.stringify(searchIndex, null, 2) + '\n', 'utf8');

const total = manifest.sources.reduce((n, s) => n + s.sections.length, 0);
console.log(
  `extract-docs: wrote ${total} sections (` +
    manifest.sources.map((s) => `${s.id}: ${s.sections.length}`).join(', ') +
    `), ${svgs.length} diagrams, readme.md, manifest.json, search-index.json (${searchIndex.length} entries)`
);
