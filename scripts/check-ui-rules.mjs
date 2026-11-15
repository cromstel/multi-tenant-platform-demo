#!/usr/bin/env node
/**
 * UI rules guard.
 *
 * Two modes, both runnable without a browser for `source`:
 *
 *   node scripts/check-ui-rules.mjs source
 *       Static scan of the JSX. Fails when an interactive element carries a
 *       drop-shadow utility, or when a control primitive's variant map does.
 *       Fast enough for `pnpm check`, and it needs nothing but the TypeScript
 *       compiler that is already a dependency.
 *
 *   node scripts/check-ui-rules.mjs runtime <baseUrl> [routes...]
 *       Drives a real browser against a running server and asserts, per page:
 *         - exactly one <h1>, and a heading outline that never skips a level;
 *         - no interactive control whose computed box-shadow is a drop shadow.
 *
 * Why a script and not a test file: this repository deliberately does not
 * track test code (see `.gitignore`), so the rules it enforces would
 * otherwise never reach CI. A tracked script does.
 *
 * The rule it enforces: an interactive control never carries a drop shadow.
 * Cards, panels, overlays, toasts and decorative badges keep their
 * elevation - a shadow there communicates layering, not affordance.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

/** Directories whose JSX is scanned. */
const SOURCE_DIRS = ['app', 'components', 'lib'];

/** Element names that are interactive controls. */
const INTERACTIVE_TAGS = new Set(['button', 'a', 'input', 'textarea', 'select']);

/** ARIA roles that make a non-button element interactive. */
const INTERACTIVE_ROLES = new Set([
  'button',
  'link',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'option',
  'radio',
  'switch',
  'tab',
]);

/**
 * Primitives that own elevation by design and are therefore exempt from the
 * variant scan. Each one is a container or an overlay, not a control.
 */
const ALLOWED_VARIANT_FILES = new Set([
  'components/ui/card.tsx',
  'components/ui/popover.tsx',
  'components/ui/tooltip.tsx',
]);

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the shadow utilities inside a class string. A variant prefix
 * (`hover:`, `group-hover:`, `dark:` ...) does not change the base utility, so
 * `hover:shadow-lg` is found by looking at the last segment of the token.
 */
function shadowTokens(classText) {
  const tokens = [];
  for (const raw of classText.split(/\s+/)) {
    const token = raw.replace(/^["'`]+|["'`;,)]+$/g, '');
    if (!token) continue;
    const segments = token.split(':');
    const base = segments[segments.length - 1];
    if (!base.startsWith('shadow-')) continue;
    // `shadow-none` is the absence of a shadow.
    if (base === 'shadow-none') continue;
    tokens.push(token);
  }
  return tokens;
}

/**
 * Variable names that hold a class list rather than content. A shadow in
 * one of these lands on every element that uses it.
 */
const CLASS_LIST_NAMES = /(variants|classes|classnames?)$/i;

/**
 * Collects the shadow utilities from every string literal inside a subtree.
 * Walks the whole subtree because a variant map nests its strings several
 * levels down (`cva(base, { variants: { size: { lg: "..." } } })`).
 */
function collectShadowTokens(node, out) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    out.push(...shadowTokens(node.text));
  }
  ts.forEachChild(node, (child) => collectShadowTokens(child, out));
}

/** Every `.tsx`/`.ts` file under the scanned directories. */
function sourceFiles() {  const files = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry);
      const stats = statSync(full);
      if (stats.isDirectory()) {
        if (entry === 'node_modules' || entry === '.next') continue;
        walk(full);
      } else if (/\.tsx?$/.test(entry) && !/\.d\.ts$/.test(entry)) {
        files.push(full);
      }
    }
  };
  for (const dir of SOURCE_DIRS) walk(join(ROOT, dir));
  return files;
}

// ─────────────────────────────────────────────────────────────────────────────
// Source mode
// ─────────────────────────────────────────────────────────────────────────────

/** The element name of a JSX tag, e.g. `button` or `Motion.button`. */
function tagNameOf(node) {
  if (ts.isIdentifier(node)) return node.text;
  if (ts.isPropertyAccessExpression(node)) return node.name.text;
  return '';
}

/** The text of a JSX attribute, or '' when the attribute is absent. */
function attributeText(node, source, name) {
  for (const property of node.attributes.properties) {
    if (!ts.isJsxAttribute(property)) continue;
    if (property.name.text !== name) continue;
    return property.initializer ? property.initializer.getText(source) : '';
  }
  return '';
}

/** The literal value of a string attribute, or ''. */
function attributeValue(node, source, name) {
  for (const property of node.attributes.properties) {
    if (!ts.isJsxAttribute(property)) continue;
    if (property.name.text !== name) continue;
    const initializer = property.initializer;
    if (initializer && ts.isStringLiteral(initializer)) return initializer.text;
  }
  return '';
}

function scanFile(file) {
  const text = readFileSync(file, 'utf8');
  const source = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    ts.ScriptKind.TSX,
  );

  const rel = relative(ROOT, file).split('\\').join('/');
  const violations = [];

  const lineOf = (node) =>
    source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;

  const visit = (node) => {
    // 1. An interactive element that names a shadow utility.
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = tagNameOf(node.tagName);
      const role = attributeValue(node, source, 'role');
      const interactive =
        INTERACTIVE_TAGS.has(tag) || (role !== '' && INTERACTIVE_ROLES.has(role));

      if (interactive) {
        const tokens = shadowTokens(attributeText(node, source, 'className'));
        if (tokens.length > 0) {
          violations.push({
            file: rel,
            line: lineOf(node),
            what: `<${tag}>`,
            detail: tokens.join(', '),
          });
        }
      }
    }

    // 2. A class list that names a shadow utility. These are the class
    //    strings a control is built from - a variant map, a `cn()` helper or
    //    any named class constant - so a shadow here lands on every
    //    instance of that control.
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      if (CLASS_LIST_NAMES.test(node.name.text) && node.initializer) {
        const tokens = [];
        collectShadowTokens(node.initializer, tokens);
        if (tokens.length > 0) {
          violations.push({
            file: rel,
            line: lineOf(node),
            what: `${node.name.text} (class list)`,
            detail: tokens.join(', '),
          });
        }
      }
    }

    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      if (node.expression.text === 'cva') {
        const tokens = [];
        collectShadowTokens(node, tokens);
        if (tokens.length > 0) {
          violations.push({
            file: rel,
            line: lineOf(node),
            what: 'cva()',
            detail: tokens.join(', '),
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(source);

  if (ALLOWED_VARIANT_FILES.has(rel)) {
    return violations.filter((v) => v.what !== 'cva()' && !v.what.endsWith('(class list)'));
  }
  return violations;
}

function sourceMode() {
  const violations = [];
  for (const file of sourceFiles()) {
    violations.push(...scanFile(file));
  }

  if (violations.length === 0) {
    console.log('UI rules (source): no interactive control carries a drop shadow.');
    return 0;
  }

  console.error(
    `UI rules (source): ${violations.length} interactive control(s) carry a drop shadow.`,
  );
  for (const violation of violations) {
    console.error(`  ${violation.file}:${violation.line}  ${violation.what}  ${violation.detail}`);
  }
  console.error(
    '\nDrop shadows belong to containers and overlays, not to controls.\n' +
      'Remove the shadow utility, or move it to a wrapper element.',
  );
  return 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// Runtime mode
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_ROUTES = [
  '/',
  '/about',
  '/services',
  '/faq',
  '/contact',
  '/kb',
  '/auth/login',
  '/auth/register',
  '/no-such-page',
];

/**
 * Reads the environment file. The same minimal parser the launcher in
 * `scripts/next-env-port.mjs` uses - a script outside Next does not get
 * `.env.local` loaded for it.
 */
function readEnvFile() {
  const vars = {};
  const envPath = join(ROOT, process.env.ENV_FILE || '.env.local');
  let text;
  try {
    text = readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '');
  } catch {
    return vars;
  }
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator === -1) continue;
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    vars[line.slice(0, separator).trim()] = value;
  }
  return vars;
}

/**
 * The base URL to check, taken from the environment file so the port lives in
 * exactly one place - the same rule the rest of the project follows.
 */
function defaultBaseUrl() {
  const vars = readEnvFile();
  const rootDomain = vars.NEXT_PUBLIC_ROOT_DOMAIN || process.env.NEXT_PUBLIC_ROOT_DOMAIN;
  if (rootDomain) {
    const local = rootDomain.startsWith('localhost') || rootDomain.startsWith('127.0.0.1');
    return `${local ? 'http' : 'https'}://${rootDomain}`;
  }
  const port = vars.PORT || process.env.PORT;
  if (port) return `http://localhost:${port}`;
  return null;
}

async function runtimeMode(baseUrl, routes) {
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  let failures = 0;

  for (const route of routes) {
    const url = /^https?:\/\//.test(route) ? route : new URL(route, baseUrl).toString();

    try {
      // `load` rather than `networkidle`: a dev server compiles routes on
      // demand, and its background requests keep the network busy long
      // after the page is usable.
      await page.goto(url, { waitUntil: 'load', timeout: 120_000 });
      await page.waitForTimeout(400);

      const headings = await page.evaluate(() =>
        Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map((h) => ({
          level: Number(h.tagName.slice(1)),
          text: (h.textContent ?? '').replace(/\s+/g, ' ').trim(),
        })),
      );

      const problems = [];

      const h1s = headings.filter((h) => h.level === 1);
      if (h1s.length !== 1) {
        problems.push(
          `expected exactly one <h1>, found ${h1s.length}` +
            (h1s.length ? ` ("${h1s.map((h) => h.text).join('", "')}")` : ''),
        );
      }

      let deepest = 0;
      for (const heading of headings) {
        if (heading.level > deepest + 1) {
          problems.push(
            `heading level skipped: <h${heading.level}> "${heading.text}" follows <h${deepest}>`,
          );
        }
        deepest = Math.max(deepest, heading.level);
      }

      const offenders = await page.evaluate(() => {
        const layers = (boxShadow) => {
          if (!boxShadow || boxShadow === 'none') return [];
          const parts = [];
          let depth = 0;
          let current = '';
          for (const ch of boxShadow) {
            if (ch === '(') depth += 1;
            else if (ch === ')') depth -= 1;
            if (ch === ',' && depth === 0) {
              parts.push(current);
              current = '';
              continue;
            }
            current += ch;
          }
          parts.push(current);
          return parts.filter((layer) => {
            const lengths = [...layer.matchAll(/(-?\d*\.?\d+)px/g)].map((m) => Number(m[1]));
            const [x = 0, y = 0, blur = 0] = lengths;
            return x !== 0 || y !== 0 || blur !== 0;
          });
        };
        const describe = (el) => {
          const label =
            el.getAttribute('aria-label') ??
            (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
          return `<${el.tagName.toLowerCase()}${label ? ` "${label}"` : ''}>`;
        };
        return Array.from(
          document.querySelectorAll('button, a[href], input, textarea, select, [role="button"], [role="link"]'),
        ).flatMap((el) => {
          const shadow = getComputedStyle(el).boxShadow;
          const bad = layers(shadow);
          if (bad.length === 0) return [];
          return [{ control: describe(el), shadow: bad.join(', ') }];
        });
      });

      for (const offender of offenders) {
        problems.push(`${offender.control} carries a drop shadow (${offender.shadow})`);
      }
      if (problems.length === 0) {
        console.log(`UI rules (runtime): ${route} — ok`);
      } else {
        failures += 1;
        console.error(`UI rules (runtime): ${route} — ${problems.length} problem(s)`);
        for (const problem of problems) console.error(`  ${problem}`);
      }
    } catch (error) {
      failures += 1;
      console.error(`UI rules (runtime): ${route} — ${error.message}`);
    }
  }

  await browser.close();

  if (failures === 0) {
    console.log(`UI rules (runtime): ${routes.length} route(s) checked, all ok.`);
  }
  return failures === 0 ? 0 : 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────────────────────

const [mode, ...args] = process.argv.slice(2);

if (mode === 'source') {
  process.exit(sourceMode());
}

if (mode === 'runtime') {
  const baseUrl = args[0] || defaultBaseUrl();
  if (!baseUrl) {
    console.error(
      'Usage: node scripts/check-ui-rules.mjs runtime <baseUrl> [route...]\n' +
        'No base URL was given and none could be derived from the environment file.',
    );
    process.exit(2);
  }
  const routes = args.slice(1);
  process.exit(await runtimeMode(baseUrl, routes.length > 0 ? routes : DEFAULT_ROUTES));
}

console.error(
  'Usage:\n' +
    '  node scripts/check-ui-rules.mjs source\n' +
    '  node scripts/check-ui-rules.mjs runtime <baseUrl> [route...]',
);
process.exit(2);
