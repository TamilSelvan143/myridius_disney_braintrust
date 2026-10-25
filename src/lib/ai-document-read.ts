export type AiDocumentPayload = {
  name: string;
  mimeType: string;
  content: string;
};

/** Best-effort text extraction in the browser before sending to the server AI. */
export async function readFileForAiAnalysis(file: File): Promise<AiDocumentPayload> {
  const mimeType = file.type || "application/octet-stream";

  if (mimeType.startsWith("text/") || file.name.endsWith(".csv") || file.name.endsWith(".txt")) {
    const content = (await file.text()).slice(0, 50_000);
    return { name: file.name, mimeType, content };
  }

  if (mimeType === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return {
      name: file.name,
      mimeType,
      content: `[PDF attachment "${file.name}" (${Math.round(file.size / 1024)} KB). Text not extracted in-browser — use filename and any embedded text the model can infer only if quoted elsewhere.]`,
    };
  }

  try {
    const asText = await file.text();
    const sample = asText.slice(0, 400);
    const mostlyText = sample.length > 40 && !/[\x00-\x08\x0e-\x1f]/.test(sample);
    if (mostlyText) {
      return { name: file.name, mimeType, content: asText.slice(0, 50_000) };
    }
  } catch {
    /* binary */
  }

  return {
    name: file.name,
    mimeType,
    content: `[Binary attachment "${file.name}" (${mimeType}, ${Math.round(file.size / 1024)} KB). Rely on the change summary and explicit document names.]`,
  };
}
