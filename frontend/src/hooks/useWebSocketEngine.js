import { useCallback, useEffect, useRef, useState } from "react";

const DEBOUNCE_MS = 50;

function getDefaultUrl() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws/simulate`;
}

export function useWebSocketEngine(url) {
  const socketRef = useRef(null);
  const pendingPayloadRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const [data, setData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  const flushPayload = useCallback(() => {
    const socket = socketRef.current;
    const payload = pendingPayloadRef.current;

    if (!socket || socket.readyState !== WebSocket.OPEN || !payload) {
      return;
    }

    socket.send(JSON.stringify(payload));
    pendingPayloadRef.current = null;
  }, []);

  const sendParameters = useCallback(
    (parameters) => {
      pendingPayloadRef.current = parameters;
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = window.setTimeout(() => {
        debounceTimerRef.current = null;
        flushPayload();
      }, DEBOUNCE_MS);
    },
    [flushPayload]
  );

  useEffect(() => {
    const socket = new WebSocket(url ?? getDefaultUrl());
    socketRef.current = socket;
    setError(null);

    socket.onopen = () => {
      setIsConnected(true);
      flushPayload();
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.error) {
          setError(message.error.message || "Engine request failed");
          return;
        }
        setError(null);
        setData(message);
      } catch {
        setError("Received an invalid response from the pricing engine");
      }
    };

    socket.onerror = () => {
      setError("Unable to reach the pricing engine");
    };

    socket.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
      socket.close();
      socketRef.current = null;
    };
  }, [flushPayload, url]);

  return { data, isConnected, error, sendParameters };
}
