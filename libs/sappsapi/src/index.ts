import { getAdapter } from "./adapters";
import { handleRequest } from "./handler";
import { Trie } from "./trie";
import { AppOptions, Context } from "./types";
export { go } from "./go";

type RouteHandler = (ctx: Context) => Promise<Response> | Response;

export class App {
  private readyCallbacks: (() => void)[] = [];
  private isReady = false;
  private options: AppOptions;
  private trie = new Trie();
  private routes: Map<string, Map<string, RouteHandler>> = new Map();

  constructor(options: AppOptions = {}) {
    this.options = options;
    const adapter = getAdapter();

    if (adapter.type === "bun") {
      Bun.serve({
        port: options.port ?? 3000,
        hostname: options.hostname ?? "0.0.0.0",
        fetch: (req, server) => {
          return handleRequest(req, server, adapter, (ctx) => this.handle(ctx));
        },
      });
      console.log(
        `Server started on http://${options.hostname ?? "0.0.0.0"}:${
          options.port ?? 3000
        }`
      );
      this.isReady = true;
      this.readyCallbacks.forEach((cb) => cb());
    } else if (adapter.type === "cloudflare") {
      addEventListener("fetch", (event) => {
        const bindings = this.options.bindings ?? {};
        event.respondWith(
          handleRequest(event.request, { env: bindings }, adapter, (ctx) =>
            this.handle(ctx)
          )
        );
      });
    } else {
      throw new Error("Unsupported runtime adapter");
    }
  }

  onReady(cb: () => void) {
    if (this.isReady) {
      cb();
    } else {
      this.readyCallbacks.push(cb);
    }
  }

  route(method: string, path: string, handler: RouteHandler): void {
    if (!this.routes.has(method)) {
      this.routes.set(method, new Map());
    }
    this.routes.get(method)!.set(path, handler);
    this.trie.insert(path);
  }

  private async handle(ctx: Context): Promise<Response> {
    const method = ctx.req.method.toUpperCase();
    const methodRoutes = this.routes.get(method);
    if (!methodRoutes) {
      return ctx.json({ error: "Method Not Allowed" }, 405);
    }

    const matchedPath = this.trie.match(ctx.url.pathname);
    if (!matchedPath) {
      return ctx.json({ error: "Not Found" }, 404);
    }

    const handler = methodRoutes.get(matchedPath);
    if (!handler) {
      return ctx.json({ error: "Not Found" }, 404);
    }

    return handler(ctx);
  }

  get(path: string, handler: RouteHandler): void {
    this.route("GET", path, handler);
  }

  post(path: string, handler: RouteHandler): void {
    this.route("POST", path, handler);
  }

  put(path: string, handler: RouteHandler): void {
    this.route("PUT", path, handler);
  }

  delete(path: string, handler: RouteHandler): void {
    this.route("DELETE", path, handler);
  }

  patch(path: string, handler: RouteHandler): void {
    this.route("PATCH", path, handler);
  }
}
