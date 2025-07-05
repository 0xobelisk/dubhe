import chalk from "chalk";
import { ZodError } from "zod";
import { fromZodError, ValidationError } from "zod-validation-error";

export class NotInsideProjectError extends Error {
  name = "NotInsideProjectError";
  message = "You are not inside a Dubhe project";
}

export class DubheCliError extends Error {
  name = "DubheCliError";
}

export class UpgradeError extends Error {
  name = "UpgradeError";
}

export class FsIibError extends Error {
  name = "FsIibError";
}

export function logError(error: unknown) {
  if (error instanceof ValidationError) {
    console.log(chalk.redBright(error.message));
  } else if (error instanceof ZodError) {
    // TODO currently this error shouldn't happen, use `fromZodErrorCustom`
    const validationError = fromZodError(error, {
      prefixSeparator: "\n- ",
      issueSeparator: "\n- ",
    });
    console.log(chalk.redBright(validationError.message));
  } else if (error instanceof NotInsideProjectError) {
    console.log(chalk.red(error.message));
    console.log("");
    // TODO add docs to the website and update the link to the specific page
    console.log(
      chalk.blue(
        `To learn more about Dubhe's configuration, please go to https://github.com/0xobelisk`
      )
    );
  } else if (error instanceof DubheCliError) {
    console.log(chalk.red(error));
  } else {
    console.log(error);
  }
}
