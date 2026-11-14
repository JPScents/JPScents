import "server-only";
import { requireAdmin, type AdminIdentity } from "@/modules/access/server";
import { getPerfumeImageUrl } from "@/infrastructure/supabase/perfume-images";
import {
  listAdminPerfumeRecords,
  findAdminPerfumeRecord,
  findBestsellerCandidates,
  readCatalogueAdminOverview,
} from "../../repositories/perfume.repository";
import {
  toAdminPerfume,
  toAdminPerfumeListItem,
  toBestsellerCandidate,
} from "../../mappers/admin/perfume.mapper";
import type { CatalogueFilters } from "../../types";

export async function listAdminPerfumes(
  admin: AdminIdentity | null,
  filters: CatalogueFilters = {},
) {
  requireAdmin(admin);
  const rows = await listAdminPerfumeRecords(filters);
  return await Promise.all(
    rows.map(async (perfume) =>
      toAdminPerfumeListItem(perfume, await getPerfumeImageUrl(perfume.images[0]?.path)),
    ),
  );
}
export async function getAdminPerfume(admin: AdminIdentity | null, id: string) {
  requireAdmin(admin);
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
export async function getEligibleBestsellerCandidates(admin: AdminIdentity | null, query = "") {
  requireAdmin(admin);
  const rows = await findBestsellerCandidates(query);
  return await Promise.all(
    rows.map(async (perfume) =>
      toBestsellerCandidate(perfume, await getPerfumeImageUrl(perfume.images[0]?.path)),
    ),
  );
}
export async function getCatalogueAdminOverview(admin: AdminIdentity | null) {
  requireAdmin(admin);
  return await readCatalogueAdminOverview();
}
