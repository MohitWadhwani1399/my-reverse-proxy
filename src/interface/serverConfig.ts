import { ConfigSchemaType } from "../config-schema";

export interface CreateServerConfig {
  port: number;
  workerCount: number;
  serverConfig: ConfigSchemaType;
}
