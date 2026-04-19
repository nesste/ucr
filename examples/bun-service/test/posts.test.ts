import { expect, test } from "bun:test";

import { retry } from "../ucr/presets/service-preset";
import { healthRoute } from "../server/routes/health";
import { postService } from "../ucr/posts/domain/runtime";

test("post service manages in-memory posts", async () => {
  const created = await postService.createPost({
    title: "Example title",
    views: 42,
    published: true,
    publishedAt: "2026-04-19",
  });

  expect(created.id.length).toBeGreaterThan(0);

  const listed = await postService.listPosts();
  expect(listed.length).toBeGreaterThanOrEqual(1);
});

test("health route responds with ok payload", async () => {
  const response = await healthRoute.methods.GET!(
    new Request("http://localhost/health"),
    {},
  );
  const payload = await response.json();

  expect(response.status).toBe(200);
  expect(payload.ok).toBe(true);
});

test("service preset exports retry helper", async () => {
  const output = await retry(async () => "ok", {
    attempts: 1,
  });

  expect(output).toBe("ok");
});
