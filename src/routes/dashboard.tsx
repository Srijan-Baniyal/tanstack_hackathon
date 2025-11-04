import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import type { Conversation } from "@/components/dashboard/ChatSidebar";
import ChatSidebar from "@/components/dashboard/ChatSidebar";
import ChatHeader from "@/components/dashboard/ChatHeader";
import ChatEmptyState from "@/components/dashboard/ChatEmptyState";
import ChatMessageArea from "@/components/dashboard/ChatMessageArea";
import ChatInput from "@/components/dashboard/ChatInput";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

function Dashboard() {
  const conversations: Conversation[] = [
    {
      id: 1,
      title: "Project Alpha",
      avatar: "PA",
      preview: "Latest deployment looks good—shipping tonight.",
      time: "09:12",
      unread: 2,
    },
    {
      id: 2,
      title: "Marketing Team",
      avatar: "MT",
      preview: "Drafted the launch brief. Need final approval.",
      time: "08:47",
      unread: 0,
    },
    {
      id: 3,
      title: "Design Review",
      avatar: "DR",
      preview: "Uploading the Figma handoff in a moment.",
      time: "Yesterday",
      unread: 1,
    },
  ];
  const [selectedChat, setSelectedChat] = useState<number | null>(null);

  const selectedConversation =
    conversations.find((c) => c.id === selectedChat) || null;

  const handleSendMessage = (message: string) => {
    console.log("bruh Sending message:", message);
    // Add your message sending logic here
  };

  const handleNewChat = () => {
    console.log("bruh Creating new chat");
    // Add your new chat logic here
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <ChatSidebar
        conversations={conversations}
        selectedChat={selectedChat}
        onSelectChat={setSelectedChat}
        onNewChat={handleNewChat}
      />

      <SidebarInset>
        <ChatHeader selectedChat={selectedConversation} />

        <main className="flex flex-1 flex-col p-4 md:p-6 lg:p-8 bg-muted/30">
          <div className="flex-1 overflow-auto mb-6 rounded-2xl bg-background/50 backdrop-blur-sm border border-border/50 shadow-sm">
            {!selectedChat ? (
              <ChatEmptyState />
            ) : (
              <ChatMessageArea conversation={selectedConversation!} />
            )}
          </div>

          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={!selectedChat}
          />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
