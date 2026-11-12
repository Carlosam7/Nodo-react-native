import { createContext, useContext, type ReactNode } from "react";
import type { ApplicantOperations, ProjectOperations } from "@/core/application/services";
import type { ChatOperations } from "@/features/chat/application/chat-service";

export interface AppServices {
  projects: ProjectOperations;
  applicants: ApplicantOperations;
  chat: ChatOperations;
}

const ServicesContext = createContext<AppServices | null>(null);

export function ServicesProvider({ services, children }: { services: AppServices; children: ReactNode }) {
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

export function useServices(): AppServices {
  const services = useContext(ServicesContext);
  if (!services) throw new Error("ServicesProvider no está disponible");
  return services;
}
