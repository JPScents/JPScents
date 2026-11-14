import "server-only";

import { cache } from "react";

import { getPerfumeBySlug } from "@/modules/catalogue/server";

export const getPerfumeDetail = cache(getPerfumeBySlug);
