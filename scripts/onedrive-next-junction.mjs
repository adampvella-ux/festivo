/**
 * OneDrive / Dropbox on Windows: a real `.next` folder under the synced tree can trigger
 * Node `readlink` EINVAL (cloud placeholders), which breaks `next dev` / SSR (500s).
 * If `.next` is missing, create a directory junction to %LOCALAPPDATA%\festivo-web-next\next-cache.
 *
 * If `.next` already exists, do nothing. Delete `.next` once manually if issues persist, then rerun.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();

if (process.platform !== "win32") process.exit(0);

const onSyncedRoot = /[\\/]OneDrive[\\/]|[\\/]Dropbox[\\/]/i.test(cwd);
if (!onSyncedRoot) process.exit(0);

const local = process.env.LOCALAPPDATA;
if (!local) process.exit(0);

const cacheDir = path.join(local, "festivo-web-next", "next-cache");
const nextDir = path.join(cwd, ".next");

fs.mkdirSync(cacheDir, { recursive: true });

if (fs.existsSync(nextDir)) process.exit(0);

try {
  execSync(`cmd /c mklink /J "${nextDir}" "${cacheDir}"`, {
    cwd,
    stdio: "inherit",
    windowsHide: true
  });
} catch {
  console.warn(
    "[festivo] Could not junction .next → Local AppData. If Next fails with readlink EINVAL, delete the .next folder in this project once (if present) and run again, or move the repo out of OneDrive."
  );
}
