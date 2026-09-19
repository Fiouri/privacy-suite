import { createServer } from "node:http";
import { readFile, readdir, stat } from "node:fs/promises";
import { resolve, extname } from "node:path";

/** Test-only static host. Disconnecting it proves the app does not need a server. */
export const startOfflineTestHost = async () => {
  const assets = new Map<string, { body: Buffer; type: string }>();
  const types: Record<string, string> = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".webmanifest": "application/manifest+json",
  };
  for (const name of await readdir("dist", { recursive: true })) {
    const path = resolve("dist", name);
    if (!(await stat(path)).isFile()) continue;
    assets.set("/" + name.replaceAll("\\", "/"), {
      body: await readFile(path),
      type: types[extname(name)] ?? "application/octet-stream",
    });
  }
  let connected = true;
  const server = createServer((request, response) => {
    if (!connected) {
      request.socket.destroy();
      return;
    }
    const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
    const asset = assets.get(pathname === "/" ? "/index.html" : pathname);
    if (!asset) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, {
      "Content-Type": asset.type,
      "Cache-Control": "no-cache",
    });
    response.end(asset.body);
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Could not start offline test host");
  return {
    origin: `http://127.0.0.1:${address.port}`,
    disconnect: () => {
      connected = false;
      server.closeAllConnections();
    },
    close: async () => {
      server.closeAllConnections();
      await new Promise<void>((done, reject) =>
        server.close((error) => (error ? reject(error) : done())),
      );
    },
  };
};
