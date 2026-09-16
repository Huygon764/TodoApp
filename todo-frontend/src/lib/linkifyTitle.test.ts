import { test, expect } from "bun:test";
import { linkifyTitle } from "./linkifyTitle.js";

test("plain text stays a single text segment", () => {
  expect(linkifyTitle("Read a book")).toEqual([
    { kind: "text", value: "Read a book" },
  ]);
});

test("an http URL becomes a link", () => {
  expect(linkifyTitle("http://example.com")).toEqual([
    { kind: "link", value: "http://example.com", href: "http://example.com" },
  ]);
});

test("an https URL in surrounding text is split out", () => {
  expect(linkifyTitle("See https://example.com/docs now")).toEqual([
    { kind: "text", value: "See " },
    {
      kind: "link",
      value: "https://example.com/docs",
      href: "https://example.com/docs",
    },
    { kind: "text", value: " now" },
  ]);
});

test("multiple http URLs are all linked", () => {
  expect(
    linkifyTitle("http://a.example https://b.example/path"),
  ).toEqual([
    { kind: "link", value: "http://a.example", href: "http://a.example" },
    { kind: "text", value: " " },
    {
      kind: "link",
      value: "https://b.example/path",
      href: "https://b.example/path",
    },
  ]);
});

test("javascript URLs stay text", () => {
  expect(linkifyTitle("javascript:alert(1)")).toEqual([
    { kind: "text", value: "javascript:alert(1)" },
  ]);
});

test("a bare www host stays text", () => {
  expect(linkifyTitle("www.example.com")).toEqual([
    { kind: "text", value: "www.example.com" },
  ]);
});

test("ftp URLs stay text", () => {
  expect(linkifyTitle("ftp://example.com/file")).toEqual([
    { kind: "text", value: "ftp://example.com/file" },
  ]);
});

test("trailing punctuation is not part of the href", () => {
  expect(linkifyTitle("Open https://example.com.")).toEqual([
    { kind: "text", value: "Open " },
    {
      kind: "link",
      value: "https://example.com",
      href: "https://example.com",
    },
    { kind: "text", value: "." },
  ]);
});

test("HTTP scheme matching is case-insensitive", () => {
  expect(linkifyTitle("HTTP://Example.COM/A")).toEqual([
    {
      kind: "link",
      value: "HTTP://Example.COM/A",
      href: "HTTP://Example.COM/A",
    },
  ]);
});
