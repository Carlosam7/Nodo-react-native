import { roble } from "@/core/db/roble-client";
import { userProfileService } from "@/core/composition/repositories";
import { AuthService } from "../application/auth-service";

export const authService = new AuthService(roble, userProfileService);
