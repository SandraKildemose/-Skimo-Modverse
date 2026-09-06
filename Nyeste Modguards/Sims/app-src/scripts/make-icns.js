const path = require("path");
const fs = require("fs/promises");

function isPng(buf) {
  if (!buf || buf.length < 8) return false;
  return (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  );
}

function icnsChunk(type, data) {
  const header = Buffer.alloc(8);
  header.write(type, 0, 4, "ascii");
  header.writeUInt32BE(8 + data.length, 4);
  return Buffer.concat([header, data]);
}

async function main() {
  const appDir = path.join(__dirname, "..");
  const srcPng = path.join(appDir, "Skimo1logo.png");
  const outDir = path.join(appDir, "build");
  const outIcns = path.join(outDir, "icon.icns");

  const png = await fs.readFile(srcPng);
  if (!isPng(png)) throw new Error(`Ikke en PNG: ${srcPng}`);

  await fs.mkdir(outDir, { recursive: true });

  // Minimal .icns: store PNG bytes directly in an ic10 (1024x1024) chunk.
  const ic10 = icnsChunk("ic10", png);

  const header = Buffer.alloc(8);
  header.write("icns", 0, 4, "ascii");
  header.writeUInt32BE(8 + ic10.length, 4);

  const out = Buffer.concat([header, ic10]);
  await fs.writeFile(outIcns, out);

  process.stdout.write(`[SKIMO] Wrote icon: ${outIcns}\n`);
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});

