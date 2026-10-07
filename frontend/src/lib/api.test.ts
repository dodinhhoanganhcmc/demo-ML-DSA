import { afterEach, expect, it, vi } from "vitest";
import { api } from "./api";

afterEach(() => vi.unstubAllGlobals());

it("requests params through the website origin, not the visitor's localhost", async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ param_sets: [] }) });
  vi.stubGlobal("fetch", fetch);
  await api.params();
  expect(fetch).toHaveBeenCalledWith("/api/params", expect.any(Object));
});
