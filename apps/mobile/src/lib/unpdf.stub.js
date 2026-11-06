/**
 * Web stand-in for `unpdf`.
 * Loads pdf.js from /pdfjs.mjs (copied to public/) via native dynamic import so
 * Metro never transforms the huge ESM build. Falls back to FlateDecode + Tj/TJ.
 */

function decodePdfLiteral(raw) {
  return raw
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/\\(.)/g, "$1");
}

function normalizeExtractedText(raw) {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[^\S\n]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractOperators(latin) {
  const parts = [];
  const literalRe = /\((?:\\.|[^\\)])*\)\s*Tj/g;
  let match;
  while ((match = literalRe.exec(latin)) !== null) {
    const inner = match[0].slice(1, match[0].lastIndexOf(")"));
    const text = decodePdfLiteral(inner).trim();
    if (text) parts.push(text);
  }
  const arrayRe = /\[((?:[^\]\\]|\\.)*)\]\s*TJ/g;
  while ((match = arrayRe.exec(latin)) !== null) {
    const strings = match[1].match(/\((?:\\.|[^\\)])*\)/g) ?? [];
    for (const s of strings) {
      const text = decodePdfLiteral(s.slice(1, -1)).trim();
      if (text) parts.push(text);
    }
  }
  return parts;
}

async function inflateZlib(bytes) {
  if (typeof DecompressionStream === "undefined") return null;
  try {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    try {
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    } catch {
      return null;
    }
  }
}

function findStreamRanges(bytes) {
  const latin = new TextDecoder("latin1").decode(bytes);
  const ranges = [];
  const re = /stream\r?\n/g;
  let match;
  while ((match = re.exec(latin)) !== null) {
    const start = match.index + match[0].length;
    const endMarker = latin.indexOf("endstream", start);
    if (endMarker < 0) continue;
    let end = endMarker;
    if (latin[end - 1] === "\n") end -= 1;
    if (latin[end - 1] === "\r") end -= 1;
    const header = latin.slice(Math.max(0, match.index - 256), match.index);
    const flate = /\/Filter\s*\/FlateDecode|\/Filter\s*\[\s*\/FlateDecode/.test(header);
    ranges.push({ start, end, flate });
  }
  return ranges;
}

async function extractLightweight(data) {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const chunks = [new TextDecoder("latin1").decode(bytes)];
  for (const range of findStreamRanges(bytes)) {
    if (!range.flate) continue;
    const inflated = await inflateZlib(bytes.subarray(range.start, range.end));
    if (inflated) chunks.push(new TextDecoder("latin1").decode(inflated));
  }
  const parts = [];
  for (const chunk of chunks) parts.push(...extractOperators(chunk));
  return normalizeExtractedText(parts.join("\n"));
}

let pdfjsPromise = null;

async function loadPdfjs() {
  if (!pdfjsPromise) {
    // Hide the specifier from Metro so it does not transform/bundle pdfjs.mjs.
    const importer = new Function("u", "return import(u)");
    pdfjsPromise = importer("/pdfjs.mjs").then((mod) => {
      const pdfjs = mod?.default ?? mod;
      if (pdfjs?.GlobalWorkerOptions) {
        pdfjs.GlobalWorkerOptions.workerSrc = "";
      }
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

async function extractWithPdfjs(data) {
  const pdfjs = await loadPdfjs();
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const pdf = await pdfjs.getDocument({
    data: bytes,
    useSystemFonts: true,
    disableWorker: true,
    isEvalSupported: false,
    useWorkerFetch: false,
    isOffscreenCanvasSupported: false,
  }).promise;

  const pageTexts = [];
  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .filter((item) => item && typeof item.str === "string")
      .map((item) => item.str + (item.hasEOL ? "\n" : ""))
      .join("");
    pageTexts.push(text);
  }
  await pdf.destroy?.();
  return normalizeExtractedText(pageTexts.join("\n"));
}

export async function getDocumentProxy(data) {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let text = "";
  try {
    text = await extractWithPdfjs(bytes);
  } catch {
    text = await extractLightweight(bytes);
  }
  if (!text) {
    text = await extractLightweight(bytes);
  }
  return {
    _pdfInfo: { numPages: 1 },
    numPages: 1,
    __extractedText: text,
  };
}

export async function extractText(pdfOrData, options = {}) {
  const { mergePages = false } = options;
  let text;
  if (pdfOrData && typeof pdfOrData === "object" && "__extractedText" in pdfOrData) {
    text = pdfOrData.__extractedText;
  } else {
    try {
      text = await extractWithPdfjs(pdfOrData);
    } catch {
      text = await extractLightweight(pdfOrData);
    }
    if (!text) text = await extractLightweight(pdfOrData);
  }
  return {
    totalPages: 1,
    text: mergePages ? text : [text],
  };
}
