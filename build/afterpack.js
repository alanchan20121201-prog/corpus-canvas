'use strict';

/**
 * afterPack hook: electron-builder skips rcedit when signAndEditExecutable is false
 * (the bundled winCodeSign archive cannot be extracted without symlink privileges on this machine).
 * We apply the icon and version info ourselves with the rcedit binary already in the cache.
 */

const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

function findRcedit() {
  const base = path.join(process.env.LOCALAPPDATA || '', 'electron-builder', 'Cache', 'winCodeSign');
  try {
    const dirs = fs.readdirSync(base);
    for (const d of dirs) {
      const p = path.join(base, d, 'rcedit-x64.exe');
      if (fs.existsSync(p)) return p;
    }
  } catch (e) {
    /* ignore */
  }
  return null;
}

module.exports = async function afterPack(context) {
  try {
    const rcedit = findRcedit();
    if (!rcedit) return;
    const exe = path.join(context.appOutDir, 'CorpusCanvas.exe');
    const icon = path.join(__dirname, 'icon.ico');
    if (!fs.existsSync(exe) || !fs.existsSync(icon)) return;
    const version = (context.packager && context.packager.appInfo && context.packager.appInfo.version) || '1.1.0';
    execFileSync(rcedit, [
      exe,
      '--set-icon', icon,
      '--set-file-version', version,
      '--set-product-version', version,
      '--set-version-string', 'ProductName', 'Corpus Canvas',
      '--set-version-string', 'FileDescription', 'Corpus Canvas',
      '--set-version-string', 'CompanyName', 'Corpus Canvas',
      '--set-version-string', 'LegalCopyright', 'Corpus Canvas'
    ], { stdio: 'ignore' });
    console.log('  • rcedit applied to', exe);
  } catch (e) {
    console.log('  • rcedit skipped:', e.message);
  }
};
