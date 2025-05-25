import createBaseCtx from "./ctx";
import { Context, RuntimeAdapter } from "./types";

export async function handleRequest(
  req: Request,
  server: unknown,
  runtime: RuntimeAdapter,
  routeHandler: (ctx: Context) => Promise<Response> | Response
): Promise<Response> {
  const url = new URL(req.url);
  const ctx = createBaseCtx(req, server, url, runtime);

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
