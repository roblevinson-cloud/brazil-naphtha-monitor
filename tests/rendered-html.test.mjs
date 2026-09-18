import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Brazil Naphtha Monitor", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Brazil Naphtha Monitor<\/title>/i);
  assert.match(html, /The Brazil naphtha arrival board\./);
  assert.match(html, /Arrival board/);
  assert.match(html, /Delivery history/);
  assert.match(html, /Crackers &amp; supply/);
  assert.match(html, /Data ledger/);
  assert.doesNotMatch(html, /Your site is taking shape/);
});

test("published customs data remains expressed in kilotonnes", async () => {
  const dashboardUrl = new URL("../public/data/dashboard.json", import.meta.url);
  const dashboard = JSON.parse(await readFile(dashboardUrl, "utf8"));
  const ytdKt = dashboard.monthly.reduce((total, month) => total + month.total_kt, 0);

  assert.ok(dashboard.monthly.length >= 8);
  assert.ok(dashboard.monthly.every((month) => month.total_kt < 1000));
  assert.ok(ytdKt > 1000 && ytdKt < 5000);
});
