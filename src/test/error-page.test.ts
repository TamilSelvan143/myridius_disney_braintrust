import { describe, expect, it } from "vitest";

import { renderErrorPage } from "@/lib/error-page";

describe("renderErrorPage", () => {
  it("returns a complete HTML document", () => {
    const html = renderErrorPage();
    expect(html).toContain("<!doctype html>");
    expect(html).toContain('<html lang="en">');
    expect(html.trim().endsWith("</html>")).toBe(true);
  });

  it("includes the error message and both recovery actions", () => {
    const html = renderErrorPage();
    expect(html).toContain("This page didn't load");
    expect(html).toContain("Try again");
    expect(html).toContain('href="/"'); // Go home link
    expect(html).toContain("location.reload()");
  });
});
