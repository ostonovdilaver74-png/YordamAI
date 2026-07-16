import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { useAuth } from "./AuthContext";

import {
  createConversation,
  deleteConversation,
  getConversationMessages,
  getConversations,
} from "../services/conversationService";

const ConversationContext = createContext(null);

export function ConversationProvider({ children }) {
  const { token, user } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [conversationError, setConversationError] = useState("");

  const loadConversations = useCallback(async () => {
    if (!token || !user) {
      setConversations([]);
      return;
    }

    try {
      setConversationError("");

      const result = await getConversations();

      if (!result.success) {
        throw new Error(
          result.message ||
            result.error ||
            "Chat tarixini yuklab bo‘lmadi"
        );
      }

      setConversations(result.conversations || []);
    } catch (error) {
      console.error("CHAT TARIXI XATOSI:", error);
      setConversationError(error.message);
    }
  }, [token, user]);

  const newChat = async () => {
    if (!token) {
      return null;
    }

    try {
      setConversationLoading(true);
      setConversationError("");

      const result = await createConversation();

      if (!result.success) {
        throw new Error(
          result.message ||
            result.error ||
            "Yangi chat yaratilmadi"
        );
      }

      setActiveConversation(result.conversation);
      setMessages([]);

      await loadConversations();

      return result.conversation;
    } catch (error) {
      console.error("YANGI CHAT XATOSI:", error);
      setConversationError(error.message);
      return null;
    } finally {
      setConversationLoading(false);
    }
  };

  const openConversation = async (conversationId) => {
    if (!conversationId) {
      return;
    }

    try {
      setConversationLoading(true);
      setConversationError("");

      const result = await getConversationMessages(conversationId);

      if (!result.success) {
        throw new Error(
          result.message ||
            result.error ||
            "Chatni ochib bo‘lmadi"
        );
      }

      setActiveConversation(result.conversation);
      setMessages(result.messages || []);
    } catch (error) {
      console.error("CHATNI OCHISH XATOSI:", error);
      setConversationError(error.message);
    } finally {
      setConversationLoading(false);
    }
  };

  const removeConversation = async (conversationId) => {
    if (!conversationId) {
      return;
    }

    try {
      setConversationError("");

      const result = await deleteConversation(conversationId);

      if (!result.success) {
        throw new Error(
          result.message ||
            result.error ||
            "Chat o‘chirilmadi"
        );
      }

      setConversations((previous) =>
        previous.filter(
          (conversation) => conversation._id !== conversationId
        )
      );

      if (activeConversation?._id === conversationId) {
        setActiveConversation(null);
        setMessages([]);
      }
    } catch (error) {
      console.error("CHATNI O‘CHIRISH XATOSI:", error);
      setConversationError(error.message);
    }
  };

  const activateConversation = (conversation) => {
  if (!conversation) {
    return;
  }

  setActiveConversation(conversation);

  setConversations((previous) => {
    const exists = previous.some(
      (item) => item._id === conversation._id
    );

    if (!exists) {
      return [conversation, ...previous];
    }

    return previous.map((item) =>
      item._id === conversation._id
        ? { ...item, ...conversation }
        : item
    );
  });
};

  const clearConversationState = () => {
    setConversations([]);
    setActiveConversation(null);
    setMessages([]);
    setConversationError("");
  };

  useEffect(() => {
    if (token && user) {
      loadConversations();
    } else {
      clearConversationState();
    }
  }, [token, user, loadConversations]);

  return (
    <ConversationContext.Provider
      value={{
        conversations,
        activeConversation,
        messages,
        conversationLoading,
        conversationError,

        setMessages,
        setConversationError,
        activateConversation,
        loadConversations,
        newChat,
        openConversation,
        removeConversation,
      }}
    >
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversation() {
  const context = useContext(ConversationContext);

  if (!context) {
    throw new Error(
      "useConversation ConversationProvider ichida ishlatilishi kerak"
    );
  }

  return context;
}