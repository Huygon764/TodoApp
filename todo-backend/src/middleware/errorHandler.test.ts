import { expect, test } from "bun:test";
import type { Response } from "express";
import { errorHandler } from "./errorHandler.js";

function capture(err: Error): { status: number; body: { message?: string } } {
  let status = 0;
  let body: { message?: string } = {};
  const res = {
    status(code: number) {
      status = code;
      return this;
    },
    json(payload: { message?: string }) {
      body = payload;
      return this;
    },
  };
  errorHandler(err, {} as never, res as unknown as Response, (() => {}) as never);
  return { status, body };
}

test("malformed JSON is a 400, not a server error", () => {
  const err = new SyntaxError("Unexpected token");
  (err as SyntaxError & { status: number; type: string }).status = 400;
  (err as SyntaxError & { type: string }).type = "entity.parse.failed";

  const result = capture(err);
  expect(result.status).toBe(400);
  expect(result.body.message).toBe("Invalid JSON body");
});
