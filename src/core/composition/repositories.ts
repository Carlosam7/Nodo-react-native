import { roble } from "@/core/db/roble-client";
import { CatalogService } from "@/core/infrastructure/roble-catalog-repository";
import { UserProfileService } from "@/core/infrastructure/roble-user-profile-repository";

export const catalogService = new CatalogService(roble);
export const userProfileService = new UserProfileService(roble);
