import fs from 'node:fs';
import path from 'node:path';
// Avoid intermittent concurrent output-directory creation failures on Windows.
if (process.platform === 'win32') {
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const child = path.join(dir, entry.name);
      for (const root of ['.next/server', '.next/static/chunks']) fs.mkdirSync(path.join(root, child), { recursive: true });
      walk(child);
    }
  }
  walk('app');
  for (const name of ['robots.txt', 'sitemap.xml']) fs.mkdirSync(path.join('.next/server/app/(marketing)', name), { recursive: true });
}
