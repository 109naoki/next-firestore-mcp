import "server-only";

const MAX_TEXT_LENGTH = 50_000;

interface ParseResult {
  text: string;
  truncated: boolean;
}

function truncate(text: string): ParseResult {
  if (text.length > MAX_TEXT_LENGTH) {
    return { text: text.slice(0, MAX_TEXT_LENGTH), truncated: true };
  }
  return { text, truncated: false };
}

function getExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

async function parsePdf(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await parser.getText();
  return result.text;
}

async function parseExcel(buffer: Buffer): Promise<string> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const parts: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    parts.push(`${sheetName}:\n${csv}`);
  }

  return parts.join("\n\n");
}

async function parsePptx(buffer: Buffer): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(buffer);

  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)/)?.[1] ?? "0");
      const numB = parseInt(b.match(/slide(\d+)/)?.[1] ?? "0");
      return numA - numB;
    });

  const parts: string[] = [];

  for (const slidePath of slideFiles) {
    const xml = await zip.files[slidePath].async("text");
    const texts: string[] = [];
    const regex = /<a:t>([\s\S]*?)<\/a:t>/g;
    let match;
    while ((match = regex.exec(xml)) !== null) {
      const text = match[1].trim();
      if (text) texts.push(text);
    }
    if (texts.length > 0) {
      const slideNum = slidePath.match(/slide(\d+)/)?.[1] ?? "?";
      parts.push(`Slide ${slideNum}:\n${texts.join(" ")}`);
    }
  }

  return parts.join("\n\n");
}

function parsePlainText(buffer: Buffer): string {
  return buffer.toString("utf-8");
}

export async function parseFile(
  buffer: Buffer,
  filename: string,
): Promise<ParseResult> {
  const ext = getExtension(filename);
  let text: string;

  switch (ext) {
    case "pdf":
      text = await parsePdf(buffer);
      break;
    case "xlsx":
    case "xls":
      text = await parseExcel(buffer);
      break;
    case "pptx":
      text = await parsePptx(buffer);
      break;
    default:
      text = parsePlainText(buffer);
      break;
  }

  return truncate(text.trim());
}
