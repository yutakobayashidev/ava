import { createServer } from "node:http";

export async function getRandomPort(): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const server = createServer();

    server.listen(0, () => {
      const address = server.address();

      if (
        typeof address === "object" &&
        address !== null &&
        "port" in address &&
        typeof address.port === "number"
      ) {
        const port = address.port;
        server.close();
        resolve(port);
      } else {
        reject(new Error("Failed to get a port"));
      }
    });
  });
}
