/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

function sha256File(filePath) {
  const h = crypto.createHash("sha256");
  h.update(fs.readFileSync(filePath));
  return h.digest("hex");
}

function run(cmd, args) {
  return execFileSync(cmd, args, { encoding: "utf8" });
}

function setAsarIntegrity(plistPath, hash) {
  const buddy = "/usr/libexec/PlistBuddy";
  try {
    run(buddy, ["-c", "Delete :ElectronAsarIntegrity", plistPath]);
  } catch {
    // not present
  }
  run(buddy, ["-c", "Add :ElectronAsarIntegrity dict", plistPath]);
  run(buddy, ["-c", 'Add :ElectronAsarIntegrity:"Resources/app.asar" dict', plistPath]);
  run(buddy, ["-c", 'Add :ElectronAsarIntegrity:"Resources/app.asar":algorithm string SHA256', plistPath]);
  run(buddy, ["-c", `Add :ElectronAsarIntegrity:"Resources/app.asar":hash string ${hash}`, plistPath]);
}

function patchInfoPlist(appBundlePath) {
  const asarPath = path.join(appBundlePath, "Contents", "Resources", "app.asar");
  const plistPath = path.join(appBundlePath, "Contents", "Info.plist");
  if (!fs.existsSync(asarPath) || !fs.existsSync(plistPath)) return false;

  const hash = sha256File(asarPath);
  setAsarIntegrity(plistPath, hash);
  console.log(`[SKIMO] ElectronAsarIntegrity set for ${path.basename(appBundlePath)}: ${hash}`);
  return true;
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

function main() {
  const explicit = String(process.env.APP_BUNDLE || process.argv[2] || "").trim();
  const apps = explicit
    ? [path.resolve(explicit)]
    : [path.join(__dirname, "..", "..", "Sims Modverse.app")].filter((p) => fs.existsSync(p));

  for (const appPath of apps) {
    patchInfoPlist(appPath);
    signAppBundle(appPath);
  }
}

main();
