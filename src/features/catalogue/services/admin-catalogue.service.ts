import "server-only";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { getPerfumeImageUrl } from "@/lib/supabase/storage";
import {
  listAdminPerfumeRecords,
  findAdminPerfumeRecord,
  findBestsellerCandidates,
  readCatalogueAdminOverview,
} from "../repositories/perfume.repository";
import {
  toAdminPerfume,
  toAdminPerfumeListItem,
  toBestsellerCandidate,
} from "../mappers/admin-perfume.mapper";
import type { CatalogueFilters } from "../types";

async function requireAdmin() {
  if (!(await getCurrentAdmin())) {
    throw new Error("You are not authorized.");
  }
}
export async function listAdminPerfumes(filters: CatalogueFilters = {}) {
  await requireAdmin();
  const rows = await listAdminPerfumeRecords(filters);
  return await Promise.all(
    rows.map(async (perfume) =>
      toAdminPerfumeListItem(perfume, await getPerfumeImageUrl(perfume.images[0]?.path)),
    ),
  );
}
export async function getAdminPerfume(id: string) {
  await requireAdmin();
  const perfume = await findAdminPerfumeRecord(id);
  if (!perfume) {
    return null;
  }
  const urls = new Map(
    await Promise.all(
      perfume.images.map(
        async (image) => [image.path, await getPerfumeImageUrl(image.path)] as const,
      ),
    ),
  );
  return toAdminPerfume(perfume, urls);
}
export async function getEligibleBestsellerCandidates(query = "") {
  await requireAdmin();
  const rows = await findBestsellerCandidates(query);
  return await Promise.all(
    rows.map(async (perfume) =>
      toBestsellerCandidate(perfume, await getPerfumeImageUrl(perfume.images[0]?.path)),
    ),
  );
}
export async function getCatalogueAdminOverview() {
  await requireAdmin();
  return await readCatalogueAdminOverview();
}
