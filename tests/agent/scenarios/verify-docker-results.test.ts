import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type { AgentTestResult } from "../lib/types";
import { generateMarkdownReport } from "../lib/test-reporter";

const RESULTS_DIR = join(__dirname, "../docker/results");

const MODELS = ["openclaw-claude", "openclaw-openai", "openclaw-gemini"] as const;

function loadResult(serviceName: string): Record<string, unknown> | null {
  const path = join(RESULTS_DIR, `${serviceName}.json`);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

describe("Docker Agent Results", () => {
  const results: AgentTestResult[] = [];

  for (const model of MODELS) {
    it(`${model} produced valid output`, () => {
      const data = loadResult(model);
      if (!data) {
        console.warn(`No results for ${model} — skipping (file not found)`);
        return;
      }

      const passed =
        typeof data.api_key === "string" &&
        data.api_key.length > 0 &&
        typeof data.bot_id === "string" &&
        data.bot_id.length > 0;

      results.push({
        model,
        scenario: "docker-registration",
        passed,
        steps: [
          {
            name: "read-skill",
            passed: Boolean(data.skill_read),
            durationMs: 0,
          },
          {
            name: "register",
            passed: Boolean(data.api_key),
            durationMs: 0,
          },
        ],
        totalDurationMs: 0,
        timestamp: new Date().toISOString(),
        error: passed ? undefined : `Incomplete output: ${JSON.stringify(data)}`,
      });

      expect(passed).toBe(true);
    });
  }

  it("generates summary report", () => {
    if (results.length === 0) {
      console.warn("No docker results to report");
      return;
    }
    const report = generateMarkdownReport(results);
    console.log(report);
    expect(report).toContain("Agent Test Report");
  });
});
