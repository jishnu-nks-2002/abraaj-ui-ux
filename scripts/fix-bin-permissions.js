// Ensures files in node_modules/.bin are executable.
// On some CI/build environments (e.g. Vercel), the executable bit on
// installed binaries like `vite` can be lost, causing
// "Permission denied" errors when npm scripts try to run them.
// This is a no-op on Windows, which doesn't use this permission bit.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const binDir = path.join(__dirname, "..", "node_modules", ".bin");

if (fs.existsSync(binDir)) {
  for (const file of fs.readdirSync(binDir)) {
    try {
      fs.chmodSync(path.join(binDir, file), 0o755);
    } catch {
      // ignore individual failures (e.g. Windows, broken symlinks)
    }
  }
}
