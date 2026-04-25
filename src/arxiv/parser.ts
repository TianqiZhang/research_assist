import { XMLParser } from "fast-xml-parser";

import type { ArxivPaper } from "../domain/types";
import { isRecord as isRecordUtil } from "../utils";

export interface ParsedArxivFeed {
  papers: ArxivPaper[];
  skipped: number;
}

type UnknownRecord = Record<string, unknown>;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: false
});

export function parseArxivFeed(xml: string): ParsedArxivFeed {
  const parsed = parser.parse(xml) as UnknownRecord;
  const feed = asRecord(parsed.feed);

  if (!feed) {
    throw new Error("arXiv feed is missing feed root");
  }

  const entries = toArray(feed.entry);
  const papers: ArxivPaper[] = [];
  let skipped = 0;

  for (const entryValue of entries) {
    const entry = asRecord(entryValue);

    if (!entry) {
      skipped += 1;
      continue;
    }

    const paper = parseEntry(entry);

    if (paper) {
      papers.push(paper);
    } else {
      skipped += 1;
    }
  }

  return {
    papers,
    skipped
  };
}

function parseEntry(entry: UnknownRecord): ArxivPaper | null {
  const rawId = asString(entry.id);
  const arxivId = rawId ? extractArxivId(rawId) : undefined;
  const title = normalizeWhitespace(asString(entry.title));
  const abstract = normalizeWhitespace(asString(entry.summary));
  const publishedAt = normalizeDate(asString(entry.published));

  if (!rawId || !arxivId || !title || !abstract || !publishedAt) {
    return null;
  }

  const links = toArray(entry.link).map(asRecord).filter(isRecord);
  const absUrl = findAbsUrl(links) ?? `https://arxiv.org/abs/${arxivId}`;
  const pdfUrl = findPdfUrl(links);
  const categories = toArray(entry.category)
    .map(asRecord)
    .filter(isRecord)
    .map((category) => asString(category["@_term"]))
    .filter(isPresent);
  const primaryCategory =
    asString(asRecord(entry["arxiv:primary_category"])?.["@_term"]) ??
    categories[0];

  return {
    arxivId,
    title,
    abstract,
    authors: parseAuthors(entry.author),
    categories,
    primaryCategory,
    publishedAt,
    updatedAt: normalizeDate(asString(entry.updated)),
    pdfUrl,
    absUrl,
    metadata: {
      source: "arxiv",
      raw_id: rawId
    }
  };
}

export function normalizeWhitespace(value: string | undefined): string {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

export function extractArxivId(value: string): string {
  const withoutQuery = value.split(/[?#]/)[0] ?? value;
  const id = withoutQuery.includes("/abs/")
    ? withoutQuery.split("/abs/").at(-1)
    : withoutQuery.split("/").at(-1);

  return normalizeWhitespace(id).replace(/v\d+$/i, "");
}

function parseAuthors(value: unknown): string[] {
  return toArray(value)
    .map(asRecord)
    .filter(isRecord)
    .map((author) => normalizeWhitespace(asString(author.name)))
    .filter(isPresent);
}

function findAbsUrl(links: UnknownRecord[]): string | undefined {
  return links
    .map((link) => ({
      href: asString(link["@_href"]),
      rel: asString(link["@_rel"]),
      type: asString(link["@_type"])
    }))
    .find((link) => link.href && (link.rel === "alternate" || link.type === "text/html"))
    ?.href;
}

function findPdfUrl(links: UnknownRecord[]): string | undefined {
  return links
    .map((link) => ({
      href: asString(link["@_href"]),
      title: asString(link["@_title"]),
      type: asString(link["@_type"])
    }))
    .find(
      (link) =>
        link.href && (link.title?.toLowerCase() === "pdf" || link.type === "application/pdf")
    )?.href;
}

function normalizeDate(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function toArray(value: unknown): unknown[] {
  if (value === undefined || value === null) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function asRecord(value: unknown): UnknownRecord | undefined {
  return isRecord(value) ? value : undefined;
}

function isRecord(value: unknown): value is UnknownRecord {
  return isRecordUtil(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function isPresent(value: string | undefined): value is string {
  return Boolean(value);
}
