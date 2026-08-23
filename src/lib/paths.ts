import { manifest } from './content';

/** Path of the first doc section — target of "Documentation" / "Read the Docs". */
export const firstDocPath = `/docs/${manifest.sources[0].id}/${manifest.sources[0].sections[0].slug}`;
