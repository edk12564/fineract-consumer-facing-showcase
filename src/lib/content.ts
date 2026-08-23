/**
 * Data-access layer over the build-time extracted content
 * (see scripts/extract-docs.mjs). Everything is statically imported /
 * inlined at build time — there is no runtime fetching.
 */
import manifestJson from '../content/manifest.json';
import searchIndexJson from '../content/search-index.json';
import readmeRaw from '../content/readme.md?raw';

export interface Heading {
  /** Existing element id from the source doc (h3/h4), usable as an anchor. */
  id: string;
  text: string;
  /** 3 for h3, 4 for h4. */
  level: number;
}

export interface Section {
  slug: string;
  title: string;
  /** Fragment file name under src/content/sections/. */
  file: string;
  /** Word count of the section's plain text. */
  words: number;
  /** All h3/h4 headings in document order (for a table of contents). */
  headings: Heading[];
}

export interface Source {
  id: string;
  title: string;
  docTitle: string;
  sections: Section[];
}

export interface Manifest {
  generatedFrom: string;
  sources: Source[];
}

export interface SearchEntry {
  /** "backend" | "frontend" | "readme" */
  source: string;
  slug: string;
  title: string;
  /** Full plain text of the section, whitespace-collapsed. */
  text: string;
}

export interface SearchResult extends SearchEntry {
  /** Short context around the first match, with ellipses where truncated. */
  snippet: string;
}

export const manifest: Manifest = manifestJson;
export const searchIndex: SearchEntry[] = searchIndexJson;

/** Raw markdown of the source repo's README.md. */
export const readme: string = readmeRaw;

// Lazily load section fragments so each becomes its own async chunk
// instead of being inlined into the main bundle (~1.5MB of HTML).
const fragmentModules = import.meta.glob<string>('../content/sections/*.html', {
  query: '?raw',
  import: 'default',
});

/**
 * Returns the extracted HTML fragment for a section, loading its chunk
 * on demand. Rejects if the source/slug pair does not exist (indicates a
 * stale build — re-run `npm run extract`).
 */
export function getSectionHtml(source: string, slug: string): Promise<string> {
  const key = `../content/sections/${source}-${slug}.html`;
  const loader = fragmentModules[key];
  if (loader === undefined) {
    return Promise.reject(
      new Error(`Unknown section fragment: ${source}/${slug}`),
    );
  }
  // Extracted fragments reference diagrams with root-absolute paths;
  // rewrite them so they resolve under a non-root deploy base.
  return loader().then((h) =>
    h.replaceAll('src="/diagrams/', `src="${import.meta.env.BASE_URL}diagrams/`),
  );
}

/** Returns the manifest entry for a section, or undefined if not found. */
export function getSection(source: string, slug: string): Section | undefined {
  return manifest.sources
    .find((s) => s.id === source)
    ?.sections.find((sec) => sec.slug === slug);
}

export interface FlatSectionRef {
  /** "readme" | "backend" | "frontend" */
  source: string;
  slug: string;
  title: string;
  /** Manifest section (absent for the readme pseudo-section). */
  section?: Section;
}

export interface NavGroup {
  id: string;
  title: string;
  links: FlatSectionRef[];
}

/**
 * Navigation groups in display order: Overview (README), the doc sources,
 * then Glossary broken out into its own group at the end (its route stays
 * under /docs/backend/glossary).
 */
export const navGroups: NavGroup[] = (() => {
  const groups: NavGroup[] = [
    {
      id: 'overview',
      title: 'Overview',
      links: [{ source: 'readme', slug: 'readme', title: 'Overview' }],
    },
  ];
  const glossary: NavGroup = { id: 'glossary', title: 'Glossary', links: [] };
  for (const src of manifest.sources) {
    const group: NavGroup = { id: src.id, title: src.title, links: [] };
    for (const sec of src.sections) {
      const link: FlatSectionRef = {
        source: src.id,
        slug: sec.slug,
        title: sec.title,
        section: sec,
      };
      (sec.slug === 'glossary' ? glossary : group).links.push(link);
    }
    groups.push(group);
  }
  if (glossary.links.length > 0) groups.push(glossary);
  return groups;
})();

/** Title of the nav group a page belongs to (e.g. "Glossary" for backend/glossary). */
export function groupTitleFor(source: string, slug: string): string {
  const group = navGroups.find((g) =>
    g.links.some((l) => l.source === source && l.slug === slug),
  );
  return group?.title ?? source;
}

/**
 * Ordered list of every navigable page: README first, then backend sections,
 * then frontend sections, then the Glossary. Use for prev/next navigation.
 */
export function flatSectionList(): FlatSectionRef[] {
  return navGroups.flatMap((g) => g.links);
}

const SNIPPET_CONTEXT = 80; // characters of context on each side of the match

function makeSnippet(text: string, matchIndex: number, matchLength: number): string {
  const start = Math.max(0, matchIndex - SNIPPET_CONTEXT);
  const end = Math.min(text.length, matchIndex + matchLength + SNIPPET_CONTEXT);
  // Snap to word boundaries where possible.
  let from = start === 0 ? 0 : text.indexOf(' ', start) + 1;
  if (from <= 0 || from > matchIndex) from = start;
  let to = end === text.length ? end : text.lastIndexOf(' ', end);
  if (to < matchIndex + matchLength) to = end;
  const prefix = from > 0 ? '…' : '';
  const suffix = to < text.length ? '…' : '';
  return prefix + text.slice(from, to).trim() + suffix;
}

/**
 * Case-insensitive substring search over all sections plus the README.
 * Title matches rank before body-text matches.
 */
export function searchDocs(query: string): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (q === '') return [];
  const titleHits: SearchResult[] = [];
  const textHits: SearchResult[] = [];
  for (const entry of searchIndex) {
    const inTitle = entry.title.toLowerCase().includes(q);
    const idx = entry.text.toLowerCase().indexOf(q);
    if (inTitle) {
      titleHits.push({
        ...entry,
        snippet: idx >= 0 ? makeSnippet(entry.text, idx, q.length) : makeSnippet(entry.text, 0, 0),
      });
    } else if (idx >= 0) {
      textHits.push({ ...entry, snippet: makeSnippet(entry.text, idx, q.length) });
    }
  }
  return [...titleHits, ...textHits];
}
