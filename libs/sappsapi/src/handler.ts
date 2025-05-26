import createBaseCtx from "./ctx";
import { Context, CorsOptions, RuntimeAdapter } from "./types";

export async function handleRequest(
  req: Request,
  server: unknown,
  runtime: RuntimeAdapter,
  routeHandler: (ctx: Context) => Promise<Response> | Response,
  corsOptions?: CorsOptions | boolean
): Promise<Response> {
  const url = new URL(req.url);
  const ctx = createBaseCtx(req, server, url, runtime);

  if (corsOptions) {
    if (corsOptions === true) {
      ctx.setHeader("Access-Control-Allow-Origin", "*");
      ctx.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, PATCH, OPTIONS"
      );
      ctx.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Requested-With"
      );
      ctx.setHeader("Access-Control-Max-Age", "86400");
    } else {
      ctx.setHeader("Access-Control-Allow-Origin", corsOptions.origin || "*");
      ctx.setHeader(
        "Access-Control-Allow-Methods",
        corsOptions.methods || "GET, POST, PUT, DELETE, PATCH, OPTIONS"
      );
      ctx.setHeader(
        "Access-Control-Allow-Headers",
        corsOptions.headers || "Content-Type, Authorization, X-Requested-With"
      );
      ctx.setHeader("Access-Control-Max-Age", corsOptions.maxAge || "86400");
    }

    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: ctx.headers,
      });
    }
  }

  try {
    const response = await routeHandler(ctx);
    return finalizeResponse(response, ctx);
  } catch (error) {
    console.error("Error in routeHandler:", error);
    return ctx.json({ error: "Internal Server Error" }, 500);
  }
}

function finalizeResponse(response: Response, ctx: Context): Response {
  if (response instanceof Response) {
    ctx.headers.forEach((value, key) => {
      if (!response.headers.has(key)) {
        response.headers.set(key, value);
      }
    });
    return response;
  }
  return ctx.send(response);
}
