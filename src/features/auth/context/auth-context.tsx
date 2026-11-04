import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Env } from "@/core/config/env";
import { roble, RobleUser } from "@/core/db/roble-client";
import { friendlyErrorMessage } from "@/core/errors/failures";
import { userProfileService } from "@/core/services/user-profile-service";

export interface AuthContextValue {
  currentUser: RobleUser | null;
  signedInUser: RobleUser | null;
  isPublicSession: boolean;
  isLoading: boolean;
  isBootstrapped: boolean;
  error: string | null;
  login: (email: string, pass: string) => Promise<RobleUser>;
  register: (email: string, pass: string, name: string) => Promise<RobleUser>;
  logout: () => Promise<void>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<RobleUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBootstrapped, setIsBootstrapped] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPublicSession = useMemo(() => {
    if (!currentUser) return true;
    return (
      currentUser.isGuest ||
      currentUser.email === Env.guestEmail ||
      currentUser.role === "readonly" ||
      currentUser.role === "anonymous"
    );
  }, [currentUser]);

  const signedInUser = useMemo(() => {
    return isPublicSession ? null : currentUser;
  }, [isPublicSession, currentUser]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const restored = await roble.restoreSession();
        if (!isMounted) return;
        if (restored) {
          await userProfileService.ensureProfile(restored);
          if (isMounted) {
            setCurrentUser(restored);
            setIsBootstrapped(true);
          }
          return;
        }
      } catch {
        // Continuar al modo invitado
      }

      try {
        const guest = await roble.signInAsGuest();
        if (isMounted) {
          setCurrentUser(guest);
        }
      } catch (guestErr) {
        console.warn("No se pudo iniciar sesión de invitado:", guestErr);
      } finally {
        if (isMounted) {
          setIsBootstrapped(true);
        }
      }
    }

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(
    async (email: string, pass: string): Promise<RobleUser> => {
      setError(null);
      setIsLoading(true);
      try {
        const user = await roble.login(email, pass);
        await userProfileService.ensureProfile(user);
        setCurrentUser(user);
        return user;
      } catch (err) {
        const msg = friendlyErrorMessage(err);
        setError(msg);
        throw new Error(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const register = useCallback(
    async (email: string, pass: string, name: string): Promise<RobleUser> => {
      setError(null);
      setIsLoading(true);
      try {
        const user = await roble.register(email, pass, name);
        await userProfileService.ensureProfile(user);
        setCurrentUser(user);
        return user;
      } catch (err) {
        const msg = friendlyErrorMessage(err);
        setError(msg);
        throw new Error(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      await roble.logout();
      const guest = await roble.signInAsGuest();
      setCurrentUser(guest);
    } catch (err) {
      console.warn("Error al cerrar sesión:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (isPublicSession) return;
    try {
      const user = await roble.currentUser();
      setCurrentUser(user);
    } catch {
      // Ignorar si falla
    }
  }, [isPublicSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      signedInUser,
      isPublicSession,
      isLoading,
      isBootstrapped,
      error,
      login,
      register,
      logout,
      clearError,
      refreshUser,
    }),
    [
      currentUser,
      signedInUser,
      isPublicSession,
      isLoading,
      isBootstrapped,
      error,
      login,
      register,
      logout,
      clearError,
      refreshUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
}
