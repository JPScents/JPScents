import { writeFileSync } from "node:fs";

import type { Reporter, Suite } from "@playwright/test/reporter";

export default class BrowserEvidence implements Reporter {
  private suite?: Suite;

  onBegin(_config: unknown, suite: Suite) {
    this.suite = suite;
  }

  onEnd() {
    const stats = { expected: 0, unexpected: 0, flaky: 0, skipped: 0 };
    for (const test of this.suite?.allTests() ?? []) {
      const outcome = test.outcome();
      stats[outcome]++;
      if (outcome !== "expected") {
        const error = test.results.at(-1)?.errors[0];
        const line =
          error?.location?.line ?? error?.stack?.match(/release\.spec\.ts:(\d+):\d+/)?.[1];
        const operation = error?.message?.match(/\b(?:locator|page|route|browser)\.\w+:/)?.[0];
        const timeout = error?.message?.match(/(?:Test|Timeout).*?\bexceeded/i)
          ? "timed out"
          : null;
        const details = [operation, timeout, line ? `at line ${line}` : null]
          .filter(Boolean)
          .join(" ");
        console.error(`${test.title}: ${outcome} ${details}`.trim());
      }
    }
    const path = process.env.JP_E2E_REPORT_PATH;
    if (path) {
      writeFileSync(path, JSON.stringify(stats), { flag: "wx", mode: 0o600 });
    }
  }

  printsToStdio() {
    return true;
  }
}
