const fs = require("fs");
const path = require("path");

const destDir = path.resolve(__dirname, "../public");
fs.mkdirSync(destDir, { recursive: true });

function copyAsset(fileName, candidates, label) {
  const source = candidates.find((candidate) => fs.existsSync(candidate));
  if (!source) {
    console.error(`${label} não encontrado. Rode npm install na raiz do monorepo.`);
    process.exit(1);
  }
  fs.copyFileSync(source, path.join(destDir, fileName));
}

copyAsset(
  "sql-wasm-browser.wasm",
  [
    path.resolve(__dirname, "../node_modules/sql.js/dist/sql-wasm-browser.wasm"),
    path.resolve(__dirname, "../../../node_modules/sql.js/dist/sql-wasm-browser.wasm"),
  ],
  "sql.js wasm",
);

copyAsset(
  "pdfjs.mjs",
  [
    path.resolve(__dirname, "../node_modules/unpdf/dist/pdfjs.mjs"),
    path.resolve(__dirname, "../../../node_modules/unpdf/dist/pdfjs.mjs"),
  ],
  "unpdf/pdfjs",
);
