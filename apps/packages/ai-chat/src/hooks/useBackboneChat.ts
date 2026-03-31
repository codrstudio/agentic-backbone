import { useChat } from "@ai-sdk/react";
import { useRef, useEffect, useState, useCallback } from "react";
import type { Message } from "@ai-sdk/react";

export type { Message };

const RESPONSE_TIMEOUT_MS = 30_000;

export interface UseBackboneChatOptions {
  endpoint: string;
  token: string;
  sessionId: string;
  initialMessages?: Message[];
}

export function useBackboneChat(options: UseBackboneChatOptions) {
  const [syntheticError, setSyntheticError] = useState<Error | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevLoadingRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const chat = useChat({
    api: `${options.endpoint}/api/v1/ai/conversations/${options.sessionId}/messages?format=datastream`,
    headers: { Authorization: `Bearer ${options.token}` },
    initialMessages: options.initialMessages,
    onError: () => {
      clearTimer();
      setSyntheticError(null);
    },
    onFinish: () => {
      clearTimer();
      setSyntheticError(null);
    },
  });

  const { isLoading, messages, stop } = chat;

  // --- Camada 2: timeout de resposta ---
  // Inicia timer quando começa a carregar; reseta a cada chunk recebido
  useEffect(() => {
    if (isLoading) {
      clearTimer();
      timeoutRef.current = setTimeout(() => {
        stop();
        setSyntheticError(new Error("Tempo limite atingido. O servidor nao respondeu."));
      }, RESPONSE_TIMEOUT_MS);
    } else {
      clearTimer();
    }
    return clearTimer;
  }, [isLoading, stop, clearTimer]);

  // Reset timeout quando mensagens mudam (dados chegando)
  useEffect(() => {
    if (isLoading && messages.length > 0) {
      clearTimer();
      timeoutRef.current = setTimeout(() => {
        stop();
        setSyntheticError(new Error("Tempo limite atingido. O servidor nao respondeu."));
      }, RESPONSE_TIMEOUT_MS);
    }
  }, [messages, isLoading, stop, clearTimer]);

  // --- Camada 3: deteccao de resposta vazia ---
  useEffect(() => {
    if (prevLoadingRef.current && !isLoading) {
      const lastMessage = messages[messages.length - 1];
      if (!chat.error && lastMessage?.role === "user") {
        setSyntheticError(new Error("Nenhuma resposta recebida. Tente novamente."));
      }
    }
    prevLoadingRef.current = isLoading;
  }, [isLoading, messages, chat.error]);

  const error = chat.error ?? syntheticError;

  const handleSubmit = useCallback((...args: Parameters<typeof chat.handleSubmit>) => {
    setSyntheticError(null);
    return chat.handleSubmit(...args);
  }, [chat.handleSubmit]);

  const reload = useCallback((...args: Parameters<typeof chat.reload>) => {
    setSyntheticError(null);
    return chat.reload(...args);
  }, [chat.reload]);

  return { ...chat, error, handleSubmit, reload };
}
