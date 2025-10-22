// [Phase 5] Download content as text file
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { content, title, format = "txt" } = req.body;

  if (!content) {
    return res.status(400).json({ error: "Content is required" });
  }

  let fileContent = "";
  let contentType = "";
  let extension = "";

  if (format === "md") {
    fileContent = `# ${title || "KOLINK Content"}\n\n${content}`;
    contentType = "text/markdown";
    extension = "md";
  } else {
    fileContent = `${title ? title + "\n\n" : ""}${content}`;
    contentType = "text/plain";
    extension = "txt";
  }

  const fileName = `kolink-${Date.now()}.${extension}`;

  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.status(200).send(fileContent);
}
