import { program } from "commander";
// commander is used to parse from command line tool
import { parseYamlConfigFile, validateParsedYaml } from "./config";
import { CreateServerConfig } from "./interface/serverConfig";
import { cpus, availableParallelism } from "node:os";
import { ConfigSchemaType } from "./config-schema";
import { createServer } from "./createServer";

async function main() {
  program.option("--config <path>");
  program.parse();
  const options = program.opts();
  if (options && "config" in options) {
    const validatedConfig: ConfigSchemaType = await validateParsedYaml(
      await parseYamlConfigFile(options.config)
    );
    const { workers, listen } = validatedConfig.server;
    await createServer({
      port: listen,
      workerCount: workers ?? cpus().length,
      serverConfig: validatedConfig,
    });
  }
}
main();
