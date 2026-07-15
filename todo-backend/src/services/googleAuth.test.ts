import { test, expect } from "bun:test";
import { generateUsername } from "./googleAuth.js";

const none = async () => false;

test("derives username from the email local-part", async () => {
  expect(await generateUsername("john.doe@gmail.com", none)).toBe("johndoe");
});

test("strips non-word characters", async () => {
  expect(await generateUsername("a+b-c.d@x.com", none)).toBe("abcd");
});

test("pads a too-short local-part", async () => {
  expect(await generateUsername("ab@x.com", none)).toBe("ab_u");
});

test("suffixes on collision", async () => {
  const taken = new Set(["johndoe"]);
  const exists = async (u: string) => taken.has(u);
  const out = await generateUsername("john.doe@gmail.com", exists);
  expect(out).not.toBe("johndoe");
  expect(out.startsWith("johndoe_")).toBe(true);
});

test("keeps trying past several collisions", async () => {
  const taken = new Set(["johndoe", "johndoe_15", "johndoe_1c"]);
  const exists = async (u: string) => taken.has(u);
  const out = await generateUsername("john.doe@gmail.com", exists);
  expect(taken.has(out)).toBe(false);
});
