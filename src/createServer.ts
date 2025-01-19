import { CreateServerConfig } from "./interface/serverConfig";
import cluster, { Worker } from "node:cluster";
import { createServer as createHTTPServer } from "node:http";
import https from "node:http";
import { rootConfigSchema } from "./config-schema";
import {
  workerMessageResponseSchema,
  workerMessageResponseType,
  workerMessageSchema,
  workerMessageType,
} from "./serverSchema";

export async function createServer(config: CreateServerConfig) {
  const workerCount = config.workerCount;
  const worker_pool: Worker[] = [];
  if (cluster.isPrimary) {
    console.log("Master Process is up");
    for (let i = 0; i < workerCount; i++) {
      const w = cluster.fork({ config: JSON.stringify(config.serverConfig) });
      worker_pool.push(w);
      console.log("Worker Node spinned up " + i);
    }
    const server = createHTTPServer((req, res) => {
      const index = Math.floor(Math.random() * workerCount);
      const worker: Worker = worker_pool[index];
      //console.log(worker);
      const payload: workerMessageType = {
        requestType: "HTTP",
        requestHeaders: req.headers,
        body: {},
        url: `${req.url}`,
      };
      if (worker !== undefined) {
        worker.send(JSON.stringify(payload));
        worker.on("message", async (msg: string) => {            
          const reply = await workerMessageResponseSchema.parseAsync(
            JSON.parse(msg)
          );
          if (reply.errorCode) {
            res.writeHead(parseInt(reply.errorCode));
            res.end(reply.error);
            return;
          } else {
            res.writeHead(200);
            res.end(reply.data);
            return;
          }
        });
      }
      //console.log(worker);
    });
    server.listen(config.port, () => {
      console.log(`Reverse Proxy listening on Port ${config.port}`);
    });
  } else {
    console.log("Worker Node !!");
    const config = await rootConfigSchema.parseAsync(
      JSON.parse(process.env.config as string)
    );
    process.on("message", async (msg: string) => {
      const messageValidated = await workerMessageSchema.parseAsync(
        JSON.parse(msg)
      );
      const requestUrl = messageValidated.url;
      const rule = config.server.rules.filter((r) => {
        return r.path === requestUrl;
      });
      if (rule.length === 0) {
        const reply: workerMessageResponseType = {
          errorCode: "400",
          error: "Path not found",
        };
        if (process.send) {
          return process.send(JSON.stringify(reply));
        }
      }
      const isUpStream = rule[0].upstreams;
      if (isUpStream.length === 0) {
        const reply: workerMessageResponseType = {
          errorCode: "500",
          error: "UpStream not found",
        };
        if (process.send) {
          return process.send(JSON.stringify(reply));
        }
      }
      const upstream = config.server.upstreams.find((nodes) => {
        return rule[0].upstreams.some((node) => {
          return nodes.id === node;
        });
      });
      const request = https.request(
        { host: upstream?.url, path: requestUrl, method: "GET" },
        (proxyRes) => {
          let body = "";
          proxyRes.on("data", (chunk) => {
            body += chunk;
          });
          proxyRes.on("end", () => {
            const reply: workerMessageResponseType = {
              data: body,
            };
            if (process.send) {
              return process.send(JSON.stringify(reply));
            }
          });
        }
      );
      request.end();
      //console.log(`Worker:`,upstream);
    });
  }
}
