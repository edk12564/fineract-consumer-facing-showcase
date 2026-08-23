/**
 * Post-render enhancements applied to doc content rendered via
 * dangerouslySetInnerHTML: syntax highlighting, copy buttons, language
 * chips, and horizontal-scroll wrappers around wide tables.
 */
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import java from 'highlight.js/lib/languages/java';
import json from 'highlight.js/lib/languages/json';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';

hljs.registerLanguage('bash', bash);
hljs.registerLanguage('java', java);
hljs.registerLanguage('json', json);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('yaml', yaml);
hljs.registerAliases(['sh', 'shell', 'console'], { languageName: 'bash' });
hljs.registerAliases(['ts', 'javascript', 'js'], { languageName: 'typescript' });
hljs.registerAliases(['yml'], { languageName: 'yaml' });
hljs.registerAliases(['html'], { languageName: 'xml' });

/**
 * Copies `text` to the clipboard, falling back to a hidden textarea +
 * execCommand for contexts where the async Clipboard API is unavailable
 * or permission is denied.
 */
async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the legacy path.
    }
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  textarea.remove();
  return ok;
}

/** Extracts the language of a fragment code block, if declared. */
function codeLanguage(code: HTMLElement): string | undefined {
  const dataLang = code.getAttribute('data-lang');
  if (dataLang) return dataLang;
  const cls = [...code.classList].find((c) => c.startsWith('language-'));
  return cls?.slice('language-'.length);
}

/**
 * Enhances all code blocks and tables inside `root`.
 * Returns a cleanup function that cancels pending "Copied" timers.
 * Idempotent per DOM node (nodes are replaced when content changes, but
 * React StrictMode re-runs effects on the same nodes).
 */
export function enhanceDocContent(root: HTMLElement): () => void {
  const timers: number[] = [];

  for (const code of root.querySelectorAll<HTMLElement>('pre > code')) {
    const pre = code.parentElement as HTMLElement;
    const holder = pre.parentElement;
    if (!holder || holder.classList.contains('codeblock-shell')) continue;

    // Syntax highlighting (only for registered languages).
    const lang = codeLanguage(code);
    if (lang && hljs.getLanguage(lang) && !code.dataset.highlighted) {
      const result = hljs.highlight(code.textContent ?? '', { language: lang });
      code.innerHTML = result.value;
      code.dataset.highlighted = 'yes';
    }

    // Wrap so the chip/copy button can be positioned over the block.
    const shell = document.createElement('div');
    shell.className = 'codeblock-shell';
    holder.insertBefore(shell, pre);
    shell.appendChild(pre);

    if (lang) {
      const chip = document.createElement('span');
      chip.className = 'code-lang-chip';
      chip.textContent = lang;
      chip.setAttribute('aria-hidden', 'true');
      shell.appendChild(chip);
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'code-copy-btn';
    button.textContent = 'Copy';
    button.setAttribute('aria-label', 'Copy code to clipboard');
    button.addEventListener('click', () => {
      const text = code.textContent ?? '';
      copyText(text).then((ok) => {
        if (ok) {
          button.textContent = 'Copied';
          button.classList.add('copied');
          timers.push(
            window.setTimeout(() => {
              button.textContent = 'Copy';
              button.classList.remove('copied');
            }, 1600),
          );
        } else {
          button.textContent = 'Failed';
          timers.push(
            window.setTimeout(() => {
              button.textContent = 'Copy';
            }, 1600),
          );
        }
      });
    });
    shell.appendChild(button);
  }

  // Wide tables scroll horizontally instead of blowing out the layout.
  for (const table of root.querySelectorAll<HTMLTableElement>(
    'table.tableblock',
  )) {
    const parent = table.parentElement;
    if (!parent || parent.classList.contains('table-scroll')) continue;
    const wrapper = document.createElement('div');
    wrapper.className = 'table-scroll';
    parent.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  }

  return () => {
    for (const t of timers) window.clearTimeout(t);
  };
}
