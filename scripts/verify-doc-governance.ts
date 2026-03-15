#!/usr/bin/env npx tsx
/**
 * Formal documentation governance checks.
 *
 * Goals:
 * 1) Ensure index markers exist for auto-generated tables.
 * 2) Ensure ADR files follow minimal metadata contract.
 * 3) Ensure every ADR has a linked discussion log.
 */

import { existsSync, readdirSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DOC_ROOT = join(__dirname, '..', 'doc');
const ADR_DIR = join(DOC_ROOT, 'adr');
const PITFALL_DIR = join(DOC_ROOT, 'pitfall');

const START_MARKER = '<!-- INDEX:START -->';
const END_MARKER = '<!-- INDEX:END -->';

const errors: string[] = [];

function assert(condition: boolean, message: string): void {
  if (!condition) errors.push(message);
}

function requireIndexMarkers(readmePath: string): void {
  assert(existsSync(readmePath), `Missing README: ${readmePath}`);
  if (!existsSync(readmePath)) return;

  const content = readFileSync(readmePath, 'utf-8');
  assert(
    content.includes(START_MARKER) && content.includes(END_MARKER),
    `Missing index markers in ${readmePath}`,
  );
}

function verifyAdrFiles(): void {
  if (!existsSync(ADR_DIR)) return;

  const adrFiles = readdirSync(ADR_DIR).filter(
    (name) => /^\d{3}-.*\.md$/.test(name) && !name.endsWith('.discussion.md'),
  );

  for (const file of adrFiles) {
    const fullPath = join(ADR_DIR, file);
    const content = readFileSync(fullPath, 'utf-8');

    assert(/^#\s+ADR-\d+:\s+.+$/m.test(content), `${file}: missing ADR title line`);
    assert(/^Status:\s*.+$/m.test(content), `${file}: missing Status field`);
    assert(/^Date:\s*\d{4}-\d{2}-\d{2}$/m.test(content), `${file}: missing Date field (YYYY-MM-DD)`);

    const discussion = content.match(
      /^>\s*Discussion:\s*\[discussion log\]\(([^)]+\.discussion\.md)\)\s*$/mi,
    );
    assert(Boolean(discussion), `${file}: missing discussion link line`);
    if (discussion?.[1]) {
      const discussionPath = join(ADR_DIR, discussion[1]);
      assert(existsSync(discussionPath), `${file}: linked discussion file not found (${discussion[1]})`);
    }
  }

  const discussionFiles = readdirSync(ADR_DIR).filter((name) => name.endsWith('.discussion.md'));
  for (const discussionFile of discussionFiles) {
    const adrFile = discussionFile.replace('.discussion.md', '.md');
    assert(adrFiles.includes(adrFile), `${discussionFile}: missing paired ADR file (${adrFile})`);
  }
}

function main(): void {
  requireIndexMarkers(join(ADR_DIR, 'README.md'));
  requireIndexMarkers(join(PITFALL_DIR, 'README.md'));
  verifyAdrFiles();

  if (errors.length > 0) {
    console.error('\n❌ Documentation governance checks failed:\n');
    for (const err of errors) console.error(`- ${err}`);
    process.exit(1);
  }

  console.log('✅ Documentation governance checks passed');
  const adrCount = existsSync(ADR_DIR)
    ? readdirSync(ADR_DIR).filter(
        (name) => /^\d{3}-.*\.md$/.test(name) && !name.endsWith('.discussion.md'),
      ).length
    : 0;
  console.log(`   ADR files checked: ${adrCount}`);
  console.log('   Index marker checks: adr + pitfall');
}

main();
