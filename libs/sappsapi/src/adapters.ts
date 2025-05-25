import { BunServer, Context, RuntimeAdapter } from "./types";
import createBaseCtx from "./ctx";

export const bunAdapter: RuntimeAdapter = {
  type: "bun",
  createContext: (req, server, url): Context => {
    return createBaseCtx(req, server, url, bunAdapter);
  },
  getClientIP(req, server) {
    if (
      server &&
      typeof server === "object" &&
      "requestIP" in server &&
      typeof (server as BunServer).requestIP === "function"
    ) {
      const result = (server as BunServer).requestIP(req);
      return result ? result.address : null;
    }

    const forwardedFor = req.headers.get("X-Forwarded-For");
    return forwardedFor || null;
  },
  serveStaticFile: async (
    filePath: string,
    mimeType?: string
  ): Promise<Response> => {
    try {
      const file = Bun.file(filePath);
      if (!(await file.exists())) {
        throw new Error(`File not found: ${filePath}`);
      }
      return new Response(file, {
        headers: {
          "Content-Type": mimeType || file.type,
        },
      });
    } catch (error) {
      throw new Error(
        `Failed to serve static file "${filePath}": ${(error as Error).message}`
      );
    }
  },
};

export const cloudflareAdapter: RuntimeAdapter = {
  type: "cloudflare",
  createContext: (req, server, url): Context => {
    return createBaseCtx(req, server, url, cloudflareAdapter);
  },
  getClientIP: (req): string | null => {
    return (
      req.headers.get("CF-Connecting-IP") ||
      req.headers.get("X-Forwarded-For") ||
      null
    );
  },
};

export function getAdapter(): RuntimeAdapter {
  if (typeof Bun !== "undefined") {
    return bunAdapter;
  }
  if (
    typeof self !== "undefined" &&
    typeof self.addEventListener === "function"
  ) {
    return cloudflareAdapter;
  }
  return bunAdapter;
}
