import type { CommandModule } from "yargs";
import { execSync } from "child_process";
import chalk from "chalk";

type Options = {
  packagePath: string;
};

const commandModule: CommandModule<Options, Options> = {
  command: "test",

  describe: "Run tests in Dubhe contracts",

  builder(yargs) {
    return yargs.options({
      packagePath: {
        type: "string",
        default: ".",
        description: "Options to pass to forge test",
      },
    });
  },

  async handler({ packagePath }) {
    // Start an internal anvil process if no world address is provided
    try {
      execSync(`sui move test --path ${packagePath}`, {
        encoding: "utf-8",
      });
    } catch (error: any) {
      console.error(chalk.red("Error executing sui move test:"));
      console.log(error.stdout);
      process.exit(0);
    }
  },
};

export default commandModule;
