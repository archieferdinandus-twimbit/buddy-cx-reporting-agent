import fs from "fs";
import path from "path";

const UPLOADS_DIR = process.env.UPLOADS_DIR || "uploads";

export async function saveFileLocally(
  filename: string,
  buffer: Buffer,
): Promise<string> {
  const uploadsPath = path.resolve(process.cwd(), UPLOADS_DIR);
  fs.mkdirSync(uploadsPath, { recursive: true });

  const safeName = `${Date.now()}_${path.basename(filename)}`;
  const filePath = path.join(uploadsPath, safeName);
  fs.writeFileSync(filePath, buffer);

  return `${UPLOADS_DIR}/${safeName}`;
}
