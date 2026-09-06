/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

function run(cmd, args) {
  return execFileSync(cmd, args, { encoding: "utf8" });
}

function removeAsarIntegrity(plistPath) {
  const buddy = "/usr/libexec/PlistBuddy";
  try {
    run(buddy, ["-c", "Delete :ElectronAsarIntegrity", plistPath]);
    console.log("[SKIMO] Removed ElectronAsarIntegrity (Finder launch fix)");
    return true;
  } catch {
    return false;
  }
}

function signAppBundle(appBundlePath) {
  if (!fs.existsSync(appBundlePath)) return false;
  try {
    execFileSync("codesign", ["--force", "--deep", "--sign", "-", appBundlePath], { stdio: "inherit" });
    console.log(`[SKIMO] Ad-hoc signed ${path.basename(appBundlePath)}`);
    return true;
  } catch (err) {
    console.error(`[SKIMO] codesign failed: ${err?.message || err}`);
    return false;
  }
}

function prepareAppBundle(appBundlePath) {
  const plistPath = path.join(appBundlePath, "Contents", "Info.plist");
  if (!fs.existsSync(plistPath)) return false;
  removeAsarIntegrity(plistPath);
  signAppBundle(appBundlePath);
  return true;
}

function main() {
  const explicit = String(process.env.APP_BUNDLE || process.argv[2] || "").trim();
  if (!explicit) {
    console.error("Usage: node prepare-app-bundle.js /path/to/App.app");
    process.exit(1);
  }
  prepareAppBundle(path.resolve(explicit));
}

main();
