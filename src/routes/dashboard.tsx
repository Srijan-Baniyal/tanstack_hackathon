import { useEffect } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { SidebarProvider } from "../components/ui/sidebar";
import ChatSidebar from "../components/dashboard/ChatSidebar";
import ChatHeader from "../components/dashboard/ChatHeader";
import ChatEmptyState from "../components/dashboard/ChatEmptyState";
import ChatMessageArea from "../components/dashboard/ChatMessageArea";
import ChatInput from "../components/dashboard/ChatInput";
import { AuthHealthCheck } from "../components/AuthHealthCheck";
import { useChatStore } from "../zustand/ChatStore";
import { useAuthStore } from "../zustand/AuthStore";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      {
        title: "Dashboard - MeshMind",
      },
      {
        name: "description",
        content: "Access your MeshMind dashboard to manage chats, integrate AI models, and collaborate on projects.",
      },
      {
        name: "robots",
        content: "noindex, nofollow", // Since it's protected
      },
    ],
  }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const authState = useAuthStore.getState();
    await authState.initialize();
    const accessToken = await authState.getValidAccessToken();
    if (!accessToken) {
      throw redirect({ to: "/signinandsignup" });
    }
  },
  component: Dashboard,
});

function Dashboard() {
  const signOut = useAuthStore((state) => state.signOut);
  const tokens = useAuthStore((state) => state.tokens);
  const isAuthLoading = useAuthStore((state) => state.isLoading);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthLoading) return;
    if (!tokens?.accessToken) {
      signOut();
      navigate({ to: "/signinandsignup" });
    }
  }, [tokens, signOut, navigate, isAuthLoading]);

  const conversations = useChatStore((state) => state.conversations);
  const selectedChatId = useChatStore((state) => state.selectedChatId);
  const isNewChatMode = useChatStore((state) => state.isNewChatMode);
  const messages = useChatStore((state) => state.messages);
  const isStreaming = useChatStore((state) => state.isStreaming);
  const initialize = useChatStore((state) => state.initialize);
  const startNewChat = useChatStore((state) => state.startNewChat);
  const selectChat = useChatStore((state) => state.selectChat);
  const deleteChat = useChatStore((state) => state.deleteChat);
  const renameChat = useChatStore((state) => state.renameChat);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const selectedChat = useChatStore(
    (state) =>
      state.conversations.find((chat) => chat.id === state.selectedChatId) ??
      null
  );

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <SidebarProvider>
      <AuthHealthCheck />
      <div className="flex h-screen w-full">
        <ChatSidebar
          conversations={conversations}
          selectedChat={selectedChatId}
          onSelectChat={selectChat}
          onNewChat={startNewChat}
          onDeleteChat={deleteChat}
          onRenameChat={renameChat}
        />
        <div className="flex flex-col flex-1 overflow-hidden">
          <ChatHeader selectedChat={isNewChatMode ? null : selectedChat} />
          <div className="flex-1 overflow-hidden">
            {isNewChatMode || !selectedChat ? (
              <ChatEmptyState />
            ) : (
              <ChatMessageArea
                conversation={selectedChat}
                messages={messages}
                isStreaming={isStreaming}
              />
            )}
          </div>
          {(isNewChatMode || selectedChat) && (
            <div className="p-4 md:p-6">
              <div className="max-w-3xl mx-auto">
                <ChatInput onSendMessage={sendMessage} disabled={isStreaming} />
              </div>
            </div>
          )}
        </div>
      </div>
    </SidebarProvider>
  );
}
