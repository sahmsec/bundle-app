/**
 * Bundle service — use-case layer. Owns the domain rules (handle uniqueness,
 * pagination bounds) and orchestrates the repository. Framework-agnostic.
 */
import type { Bundle } from "@prisma/client";
import * as repo from "../repositories/bundle.server";
import type { BundleSortField } from "../repositories/bundle.server";
import { slugify } from "../utils/slug";
import type { BundleInput } from "./bundle.schema";

const MAX_HANDLE_ATTEMPTS = 100;

/** Generate a handle unique among the shop's LIVE bundles (respects soft-delete). */
async function generateUniqueHandle(
  shopId: string,
  title: string,
  exceptId?: string,
): Promise<string> {
  const base = slugify(title) || "bundle";
  let handle = base;
  let n = 1;
  while (await repo.handleExists(shopId, handle, exceptId)) {
    n += 1;
    if (n > MAX_HANDLE_ATTEMPTS) {
      handle = `${base}-${n}-${Math.floor(Math.random() * 1_000_000)}`;
      break;
    }
    handle = `${base}-${n}`;
  }
  return handle;
}

function normalizeDescription(description: string | undefined): string | null {
  const trimmed = description?.trim();
  return trimmed ? trimmed : null;
}

export async function createBundle(shopId: string, input: BundleInput): Promise<Bundle> {
  const handle = await generateUniqueHandle(shopId, input.title);
  return repo.createBundle({
    shopId,
    handle,
    title: input.title,
    description: normalizeDescription(input.description),
    type: input.type,
    status: input.status,
    pricingType: input.pricingType,
    pricingValue: input.pricingValue,
  });
}

export async function updateBundle(
  shopId: string,
  id: string,
  input: BundleInput,
): Promise<Bundle | null> {
  const existing = await repo.getBundleById(shopId, id);
  if (!existing) return null;

  // Only regenerate the handle when the title actually changed.
  const handle =
    existing.title === input.title
      ? existing.handle
      : await generateUniqueHandle(shopId, input.title, id);

  await repo.updateBundle(shopId, id, {
    title: input.title,
    handle,
    description: normalizeDescription(input.description),
    type: input.type,
    status: input.status,
    pricingType: input.pricingType,
    pricingValue: input.pricingValue,
  });

  return repo.getBundleById(shopId, id);
}

export async function deleteBundle(shopId: string, id: string): Promise<boolean> {
  const result = await repo.softDeleteBundle(shopId, id);
  return result.count > 0;
}

export function getBundle(shopId: string, id: string): Promise<Bundle | null> {
  return repo.getBundleById(shopId, id);
}

export interface ListBundlesInput {
  shopId: string;
  q?: string;
  status?: BundleInput["status"];
  sort?: BundleSortField;
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export async function listBundles(input: ListBundlesInput) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 20));

  const { items, total } = await repo.listBundles({
    shopId: input.shopId,
    q: input.q,
    status: input.status,
    sort: input.sort ?? "createdAt",
    order: input.order ?? "desc",
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return {
    items,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}
