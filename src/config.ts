import fs from "node:fs/promises";
import { parse } from "yaml";
import { rootConfigSchema } from './config-schema'

export async function parseYamlConfigFile(filePath: string) {
  const configFileContent = await fs.readFile(filePath, "utf8");
  const parsed = parse(configFileContent);
  return JSON.stringify(parsed);
}

export async function validateParsedYaml(config: string) {
  const validatedConfig = await rootConfigSchema.parseAsync(JSON.parse(config));
  return validatedConfig;
}
