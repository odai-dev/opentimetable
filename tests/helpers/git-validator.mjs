// opentimetable/tests/helpers/git-validator.mjs
// Conventional commits validator and repository cleanliness auditor

import fs from 'node:fs';
import path from 'node:path';

export const CONVENTIONAL_COMMIT_REGEX = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore)(\([a-z0-9_-]+\))?:\s[^\n\r]+$/;

export function validateConventionalCommit(message) {
  if (!message || typeof message !== 'string') {
    return { valid: false, error: 'Commit message must be a non-empty string' };
  }
  const firstLine = message.trim().split(/\r?\n/)[0];
  if (!CONVENTIONAL_COMMIT_REGEX.test(firstLine)) {
    return {
      valid: false,
      error: `Commit message '${firstLine}' does not match Conventional Commits format '<type>(scope): description'`,
    };
  }
  if (firstLine.length > 100) {
    return { valid: false, error: 'Commit header exceeds 100 characters' };
  }
  if (firstLine.endsWith('.')) {
    return { valid: false, error: 'Commit header should not end with a period' };
  }

  const match = firstLine.match(/^(feat|fix|docs|style|refactor|perf|test|build|ci|chore)(\(([a-z0-9_-]+)\))?:\s(.+)$/);
  return {
    valid: true,
    type: match[1],
    scope: match[3] || null,
    subject: match[4],
  };
}

export function auditRepositoryCleanliness(repoPath) {
  const issues = [];
  const forbiddenKeywords = ['roz.exe', 'ghidra', 'ida pro', 'nsis decompil', 'binary unpack', 'crack'];

  // Check README.md
  const readmePath = path.join(repoPath, 'README.md');
  if (fs.existsSync(readmePath)) {
    const readmeContent = fs.readFileSync(readmePath, 'utf8').toLowerCase();
    for (const kw of forbiddenKeywords) {
      if (readmeContent.includes(kw)) {
        issues.push(`Forbidden proprietary keyword found in README.md: '${kw}'`);
      }
    }
  }

  return {
    clean: issues.length === 0,
    issues,
  };
}
