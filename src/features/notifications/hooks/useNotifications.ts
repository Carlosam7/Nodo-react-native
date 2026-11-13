import { useCallback, useEffect, useRef, useState } from "react";
import { useServices } from "@/core/presentation/services-context";
import { useAuth } from "@/features/auth/context/auth-context";
import type { AppNotification } from "../domain/notification";

export function useNotifications() {
  const { notifications } = useServices();
  const { signedInUser } = useAuth();
  const userId = signedInUser?.id;
  const [state, setState] = useState<{ userId?: string; items: AppNotification[]; error: string | null; loading: boolean }>({ items: [], error: null, loading: true });
  const requestId = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++requestId.current;
    if (!userId) return;
    try {
      const items = await notifications.list(userId);
      if (current === requestId.current) setState({ userId, items, error: null, loading: false });
    } catch {
      if (current === requestId.current) setState((previous) => ({ userId, items: previous.userId === userId ? previous.items : [], error: "No se pudieron cargar las notificaciones.", loading: false }));
    }
  }, [notifications, userId]);
  useEffect(() => {
    const request = requestId;
    // La actualización ocurre tras completar la lectura asíncrona de Roble.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    const timer = setInterval(() => void refresh(), 30000);
    return () => { clearInterval(timer); request.current++; };
  }, [refresh]);
  const markRead = async (item: AppNotification) => {
    if (!userId) return;
    await notifications.markRead(item, userId);
    await refresh();
  };
  const items = state.userId === userId ? state.items : [];
  return { items, error: state.userId === userId ? state.error : null, loading: !!userId && (state.userId !== userId || state.loading), refresh, markRead, userId };
}
