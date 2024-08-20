import { z } from "zod";

function generateErrorMessage(
  type: string,
  path: (string | number)[] | string,
  options?: z.Primitive[]
) {
  const fieldName = Array.isArray(path) ? path.join(".") : path;
  const message = `${type} (${fieldName})`;
  const optionString = options ? `, options: ${options.join(" | ")}` : "";
  return message + optionString;
}

export const zodErrorMap: z.ZodErrorMap = (issue, ctx) => {
  console.log("issue", issue);
  if (issue.code === z.ZodIssueCode.invalid_type) {
    if (!ctx.data) {
      return {
        message: generateErrorMessage("Empty Mandatory Parameter", issue.path),
      };
    }
    return {
      message: generateErrorMessage("Invalid Parameter", issue.path),
    };
  }
  if (issue.code === z.ZodIssueCode.invalid_string) {
    return {
      message: generateErrorMessage("Invalid Parameter", issue.path),
    };
  }
  if (issue.code === z.ZodIssueCode.invalid_union_discriminator) {
    return {
      message: generateErrorMessage(
        "Invalid Parameter",
        issue.path,
        issue.options
      ),
    };
  }
  if (issue.code === z.ZodIssueCode.invalid_union) {
    const unionPaths = issue.unionErrors
      .map((err) => err.issues.map((issue) => issue.path.join(".")))
      .join(" | ");
    return {
      message: generateErrorMessage("Invalid Parameter", unionPaths),
    };
  }
  if (issue.code === z.ZodIssueCode.invalid_literal) {
    return {
      message: generateErrorMessage("Invalid Parameter", issue.path, [
        `${issue.expected}`,
      ]),
    };
  }
  if (
    issue.code === z.ZodIssueCode.too_small ||
    issue.code === z.ZodIssueCode.too_big
  ) {
    return {
      message: generateErrorMessage("Invalid Parameter", issue.path),
    };
  }
  return { message: ctx.defaultError };
};
