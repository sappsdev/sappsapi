export interface BunRequestIP {
  address: string;
  port: number;
}

export interface BunServer {
  requestIP(req: Request): BunRequestIP | null;
}

export interface CloudflareServer {}

export type AdapterServer = BunServer | CloudflareServer | unknown;

export interface RuntimeAdapter {
  type: "bun" | "cloudflare" | string;
  createContext(req: Request, server: AdapterServer, url: URL): Context;
  getClientIP(req: Request, server: AdapterServer): string | null;
  serveStaticFile?(filePath: string, mimeType?: string): Promise<Response>;
}

export interface CorsOptions {
  origin?: string;
  methods?: string;
  headers?: string;
  maxAge?: string;
}

export interface AppOptions {
  port?: number;
  hostname?: string;
  bindings?: Record<string, unknown>;
  cors?: CorsOptions | boolean;
}

export interface Context {
  req: Request;
  server: unknown;
  url: URL;
  status: number;
  headers: Headers;

  get ip(): string | null;
  get query(): Record<string, string>;
  get params(): Record<string, string>;
  get cookies(): Record<string, string>;
  body: Promise<ParseBodyResult>;

  set(key: string, value: unknown): Context;
  get(key: string): unknown;

  setHeader(key: string, value: string): Context;
  removeHeader(key: string): Context;
  text(data: string, status?: number): Response;
  send(data: any, status?: number): Response;
  json(data: any, status?: number): Response;
  redirect(path: string, status?: number): Response;

  stream(
    callback: (controller: ReadableStreamDefaultController) => Promise<void>
  ): Response;
  yieldStream(callback: () => AsyncIterable<any>): Response;

  setCookie(name: string, value: string, options?: CookieOptions): Context;
}

export interface CookieOptions {
  maxAge?: number;
  expires?: Date;
  path?: string;
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}

export type ParseBodyResult = Record<string, any> | { error: string };
