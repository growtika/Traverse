import { describe, expect, it } from "vitest";
import { parseHtml } from "../src/lib/parse";

const html = `
<html>
  <head>
    <title>Acme Robotics</title>
    <meta name="description" content="Warehouse robots for mid-market 3PLs." />
  </head>
  <body>
    <h1>Warehouse robots that dock themselves</h1>
    <a href="/pricing">See pricing</a>
    <form action="/demo" method="post">
      <input type="email" name="work_email" placeholder="Work email" />
      <input type="text" name="company" />
      <button>Book demo</button>
    </form>
  </body>
</html>
`;

describe("parseHtml", () => {
  it("extracts title, links, and form fields without submitting", () => {
    const page = parseHtml(html, "https://acme.test");
    expect(page.title).toBe("Acme Robotics");
    expect(page.links[0]?.href).toBe("https://acme.test/pricing");
    expect(page.forms[0]?.fields.map((f) => f.name)).toEqual(["work_email", "company"]);
  });
});
