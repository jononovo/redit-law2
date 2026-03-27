import type { AgentTestResult } from "./types";

export function generateMarkdownReport(results: AgentTestResult[]): string {
  const lines: string[] = [
    "# Agent Test Report",
    "",
    `**Generated:** ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    "| Model | Scenario | Result | Duration |",
    "|-------|----------|--------|----------|",
  ];

  for (const r of results) {
    const icon = r.passed ? "PASS" : "FAIL";
    const duration = `${(r.totalDurationMs / 1000).toFixed(1)}s`;
    lines.push(`| ${r.model} | ${r.scenario} | ${icon} | ${duration} |`);
  }

  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  lines.push("", `**Total:** ${passed}/${total} passed`, "");

  const failures = results.filter((r) => !r.passed);
  if (failures.length > 0) {
    lines.push("## Failures", "");
    for (const f of failures) {
      lines.push(`### ${f.model} — ${f.scenario}`);
      if (f.error) lines.push(`Error: ${f.error}`);
      for (const step of f.steps.filter((s) => !s.passed)) {
        lines.push(`- Step "${step.name}": ${step.error || "failed"}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

export function printReport(results: AgentTestResult[]): void {
  console.log(generateMarkdownReport(results));
}
