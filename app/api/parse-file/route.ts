import "server-only";
import { type NextRequest } from "next/server";
import { verifyToken } from "@/lib/verify-token";
import { parseFile } from "@/lib/file-parsers";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const POST = async (request: NextRequest) => {
  const tokenData = await verifyToken(request);
  if (!tokenData) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return Response.json(
      { error: "File too large (max 10MB)" },
      { status: 413 },
    );
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const result = await parseFile(buffer, file.name);

    return Response.json({
      filename: file.name,
      text: result.text,
      truncated: result.truncated,
    });
  } catch (error) {
    console.error("File parse error:", error);
    return Response.json(
      { error: "Failed to parse file" },
      { status: 422 },
    );
  }
};
