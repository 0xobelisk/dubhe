export function extractPotentialAbortHints(output: string, maxLines: number = 20): string[] {
  const lines = output.split(/\r?\n/);
  const matched = lines.filter((line) =>
    /(Move abort|Assertion|FAIL|error\[|Execution Error|abort code)/i.test(line)
  );
  const unique = Array.from(new Set(matched.map((line) => line.trim()).filter(Boolean)));
  return unique.slice(0, maxLines);
}
