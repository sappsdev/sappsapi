import {
  Context,
  CookieOptions,
  ParseBodyResult,
  RuntimeAdapter,
} from "./types";

export default function createBaseCtx(
  req: Request,
  server: unknown,
  url: URL,
  runtime: RuntimeAdapter
): Context {
  let parsedQuery: Record<string, string> | null = null;
  let parsedParams: Record<string, string> | null = null;
  let parsedCookies: Record<string, string> | null = null;
  let parsedBodyPromise: Promise<any> | null = null;
  const contextData: Record<string, unknown> = {};

  return {
    req,
    server,
    url,
    status: 200,
    headers: new Headers({ "Cache-Control": "no-cache" }),

    setHeader(key, value) {
      this.headers.set(key, value);
      return this;
    },

    removeHeader(key) {
      this.headers.delete(key);
      return this;
    },

    get ip() {
      return runtime.getClientIP(req, server);
    },

    get query() {
      if (!parsedQuery) {
        parsedQuery = Object.fromEntries(this.url.searchParams);
      }
      return parsedQuery;
    },

    get params() {
      if (!parsedParams && (this.req as any).routePattern) {
        parsedParams =
          extractDynamicParams(
            (this.req as any).routePattern,
            this.url.pathname
          ) || {};
      }
      return parsedParams ?? {};
    },

    get body() {
      if (this.req.method === "GET") {
        return Promise.resolve({});
      }
      if (!parsedBodyPromise) {
        parsedBodyPromise = parseBody(this.req);
      }
      return parsedBodyPromise;
    },

    set(key, value) {
      contextData[key] = value;
      return this;
    },

    get(key) {
      return contextData[key];
    },

    text(data, status) {
      if (status) this.status = status;
      this.headers.set(
        "Content-Type",
        this.headers.get("Content-Type") || "text/plain; charset=utf-8"
      );
      return new Response(data, { status: this.status, headers: this.headers });
    },

    send(data, status) {
      if (status) this.status = status;

      const typeMap = new Map<string, string>([
        ["string", "text/plain; charset=utf-8"],
        ["object", "application/json; charset=utf-8"],
        ["Uint8Array", "application/octet-stream"],
        ["ArrayBuffer", "application/octet-stream"],
      ]);

      const dataType =
        data instanceof Uint8Array
          ? "Uint8Array"
          : data instanceof ArrayBuffer
          ? "ArrayBuffer"
          : typeof data;

      this.headers.set(
        "Content-Type",
        this.headers.get("Content-Type") ||
          typeMap.get(dataType) ||
          "text/plain; charset=utf-8"
      );

      const responseData =
        dataType === "object" && data !== null ? JSON.stringify(data) : data;

      return new Response(responseData, {
        status: this.status,
        headers: this.headers,
      });
    },

    json(data, status) {
      if (status) this.status = status;
      this.headers.set("Content-Type", "application/json; charset=utf-8");
      return Response.json(data, {
        status: this.status,
        headers: this.headers,
      });
    },

    redirect(path, status = 302) {
      this.status = status;
      this.headers.set("Location", path);
      return new Response(null, { status: this.status, headers: this.headers });
    },

    stream(callback) {
      const headers = new Headers(this.headers);
      const stream = new ReadableStream({
        async start(controller) {
          await callback(controller);
          controller.close();
        },
      });
      return new Response(stream, { headers });
    },

    yieldStream(callback) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of callback()) {
              const encoded =
                chunk instanceof Uint8Array
                  ? chunk
                  : typeof chunk === "string"
                  ? encoder.encode(chunk)
                  : encoder.encode(JSON.stringify(chunk));
              controller.enqueue(encoded);
            }
          } catch (error) {
            controller.error(error);
          } finally {
            controller.close();
          }
        },
      });
      return new Response(stream, { headers: this.headers });
    },

    setCookie(name, value, options = {}) {
      let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(
        value
      )}`;
      if (options.maxAge) cookieString += `; Max-Age=${options.maxAge}`;
      if (options.expires)
        cookieString += `; Expires=${options.expires.toUTCString()}`;
      if (options.path) cookieString += `; Path=${options.path}`;
      if (options.domain) cookieString += `; Domain=${options.domain}`;
      if (options.secure) cookieString += `; Secure`;
      if (options.httpOnly) cookieString += `; HttpOnly`;
      if (options.sameSite) cookieString += `; SameSite=${options.sameSite}`;

      this.headers.append("Set-Cookie", cookieString);
      return this;
    },

    get cookies() {
      if (!parsedCookies) {
        const cookieHeader = this.req.headers.get("cookie");
        parsedCookies = cookieHeader ? parseCookie(cookieHeader) : {};
      }
      return parsedCookies;
    },
  };
}

function parseCookie(cookieHeader: string): Record<string, string> {
  return Object.fromEntries(
    cookieHeader.split(";").map((cookie) => {
      const [name, ...valueParts] = cookie.trim().split("=");
      return [name, decodeURIComponent(valueParts.join("="))];
    })
  );
}

function extractDynamicParams(
  routePattern: string,
  path: string
): Record<string, string> | null {
  const params: Record<string, string> = {};
  const routeSegments = routePattern.split("/");
  const [pathWithoutQuery] = path.split("?");
  const pathSegments = pathWithoutQuery.split("/");

  if (routeSegments.length !== pathSegments.length) {
    return null;
  }

  routeSegments.forEach((segment, i) => {
    if (segment.startsWith(":")) {
      params[segment.slice(1)] = pathSegments[i];
    }
  });

  return params;
}

async function parseBody(req: Request): Promise<ParseBodyResult> {
  const contentType = req.headers.get("Content-Type") || "";
  if (!contentType) return {};

  try {
    if (contentType.startsWith("application/json")) {
      return await req.json();
    }

    if (contentType.startsWith("application/x-www-form-urlencoded")) {
      const body = await req.text();
      return Object.fromEntries(new URLSearchParams(body));
    }

    if (contentType.startsWith("multipart/form-data")) {
      const formData = await req.formData();
      const obj: Record<string, any> = {};
      for (const [key, value] of formData.entries()) {
        obj[key] = value;
      }
      return obj;
    }

    return { error: "Unknown request body type" };
  } catch {
    return { error: "Invalid request body format" };
  }
}
