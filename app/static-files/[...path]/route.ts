import { NextRequest } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";

const STATIC_ROOT = path.join(process.cwd(), "static");

const CONTENT_TYPES: Record<string, string> = {
  ".md": "text/markdown; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".ts": "text/plain; charset=utf-8",
};

function resolveStaticPath(segments: string[]): string | null {
  const resolved = path.resolve(path.join(STATIC_ROOT, ...segments));
  if (resolved !== STATIC_ROOT && !resolved.startsWith(STATIC_ROOT + path.sep)) {
    return null;
  }
  return resolved;
}

async function serve(
  segments: string[],
  includeBody: boolean
): Promise<Response> {
  const resolved = resolveStaticPath(segments);
  if (!resolved) {
    return new Response(includeBody ? "Forbidden" : null, { status: 403 });
  }

  try {
    const fileStat = await stat(resolved);
    if (!fileStat.isFile()) {
      return new Response(includeBody ? "Not Found" : null, { status: 404 });
    }

    const ext = path.extname(resolved).toLowerCase();
    const headers = {
      "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=3600",
      "Content-Length": String(fileStat.size),
    };

    if (!includeBody) {
      return new Response(null, { status: 200, headers });
    }

    const file = await readFile(resolved);
    return new Response(new Uint8Array(file), { status: 200, headers });
  } catch {
    return new Response(includeBody ? "Not Found" : null, { status: 404 });
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  return serve(segments, true);
}

export async function HEAD(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  return serve(segments, false);
}
