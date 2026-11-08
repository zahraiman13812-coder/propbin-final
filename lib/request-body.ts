/** Read the stream with a byte limit; Content-Length alone is not trustworthy. */
export class RequestBodyError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export async function readBoundedJson(request: Request, maxBytes: number): Promise<any> {
  const declared = request.headers.get("content-length");
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > maxBytes)) {
    throw new RequestBodyError("حجم درخواست بیش از حد مجاز است.", 413);
  }
  if (!request.body) throw new RequestBodyError("بدنه درخواست خالی است.", 400);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new RequestBodyError("حجم درخواست بیش از حد مجاز است.", 413);
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { throw new RequestBodyError("اطلاعات JSON نامعتبر است.", 400); }
}
