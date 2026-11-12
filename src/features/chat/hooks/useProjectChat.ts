import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { friendlyErrorMessage } from "@/core/errors/failures";
import { ValidationFailure } from "@/core/domain/validation-failure";
import { useServices } from "@/core/presentation/services-context";
import { useAuth } from "@/features/auth/context/auth-context";
import type { ChatMessage } from "../domain/message";

export function useProjectChat(projectId?: string) {
  const { chat } = useServices();
  const { signedInUser } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [accessKey, setAccessKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const fetchVersion = useRef(0);
  const currentKey = useRef<string | null>(null);
  const viewerKey = projectId && signedInUser ? `${projectId}:${signedInUser.id}` : null;

  useFocusEffect(useCallback(() => {
    let active = true;
    let fetching = false;
    currentKey.current = viewerKey;
    const refresh = async () => {
      if (fetching) return;
      if (!projectId || !signedInUser) {
        if (active) { setError("Inicia sesión para acceder al chat del equipo."); setLoading(false); }
        return;
      }
      fetching = true;
      const version = fetchVersion.current;
      try {
        const result = await chat.fetchMessages(projectId, signedInUser);
        if (active && version === fetchVersion.current) { setMessages(result); setAccessKey(viewerKey); setError(null); }
      } catch (err) {
        if (active) {
          if (err instanceof ValidationFailure) { setAccessKey(null); setMessages([]); }
          setError(friendlyErrorMessage(err));
        }
      } finally { fetching = false; if (active) setLoading(false); }
    };
    void refresh();
    const interval = setInterval(() => void refresh(), 10000);
    return () => { active = false; currentKey.current = null; clearInterval(interval); };
  }, [chat, projectId, signedInUser, viewerKey]));

  const send = async () => {
    if (!projectId || !signedInUser || accessKey !== viewerKey || busy.current || !text.trim()) return;
    const requestKey = viewerKey;
    busy.current = true;
    setSending(true);
    setError(null);
    try {
      const message = await chat.sendMessage(projectId, signedInUser, text);
      if (currentKey.current === requestKey) {
        fetchVersion.current++;
        setMessages((previous) => previous.some((item) => item.id === message.id) ? previous : [...previous, message]);
        setText("");
      }
    } catch (err) { if (currentKey.current === requestKey) setError(friendlyErrorMessage(err)); }
    finally { busy.current = false; setSending(false); }
  };
  return { messages, text, setText, loading, sending, error, send, authorized: Boolean(viewerKey && accessKey === viewerKey), userId: signedInUser?.id };
}
