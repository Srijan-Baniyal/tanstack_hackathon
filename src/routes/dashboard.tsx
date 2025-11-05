import { useState, useEffect } from "react"
import { createFileRoute } from "@tanstack/react-router"
// import { useChat } from "@ai-sdk/react"
// import { DefaultChatTransport, type UIMessage } from "ai"
import type { UIMessage } from "ai"
import { SidebarProvider } from "@/components/ui/sidebar"
import ChatSidebar from "@/components/dashboard/ChatSidebar"
import ChatHeader from "@/components/dashboard/ChatHeader"
import ChatEmptyState from "@/components/dashboard/ChatEmptyState"
import ChatMessageArea from "@/components/dashboard/ChatMessageArea"
import ChatInput from "@/components/dashboard/ChatInput"
import {
  getChats,
  saveChats,
  createChat,
  deleteChat,
  updateChat,
  type Chat,
  // getSettings,
  saveChatMessages,
} from "@/schemas/ChatStorage"
import { toast } from "sonner"

export const Route = createFileRoute("/dashboard")({ component: Dashboard })

function Dashboard() {
  const [conversations, setConversations] = useState<Chat[]>([])
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [isNewChatMode, setIsNewChatMode] = useState(false)
  const [messages, setMessages] = useState<UIMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)

  // TODO: Uncomment when AI SDK is installed
  // const { messages, sendMessage, status, setMessages } = useChat({
  //   transport: new DefaultChatTransport({ api: "/api/chat" }),
  //   body: {
  //     settings: getSettings(),
  //   },
  //   onFinish: () => {
  //     if (selectedChatId && !isNewChatMode) {
  //       saveChatMessages(selectedChatId, messages)
  //       const updatedChats = getChats()
  //       setConversations(updatedChats)
  //     }
  //   },
  //   onError: (error: Error) => {
  //     console.error("[AI error]:", error)
  //     toast.error("Error, mate!", {
  //       description: "Failed to get AI response. Check your settings.",
  //     })
  //   },
  // })

  useEffect(() => {
    const chats = getChats()
    if (chats.length === 0) {
      setIsNewChatMode(true)
      setSelectedChatId(null)
      setConversations([])
    } else {
      setConversations(chats)
    }
  }, [])

  useEffect(() => {
    if (selectedChatId && !isNewChatMode) {
      const chat = conversations.find((c) => c.id === selectedChatId)
      if (chat && chat.messages.length > 0) {
        // Convert stored messages to UIMessage format
        const uiMessages: UIMessage[] = chat.messages.map((msg) => ({
          id: msg.id,
          role: msg.role,
          parts: [{ type: "text" as const, text: msg.content }],
        }))
        setMessages(uiMessages)
      }
    } else if (isNewChatMode) {
      // Clear messages when in new chat mode
      setMessages([])
    }
  }, [selectedChatId, conversations, isNewChatMode])

  const selectedChat = conversations.find((c) => c.id === selectedChatId) || null

  const handleNewChat = () => {
    setIsNewChatMode(true)
    setSelectedChatId(null)
    setMessages([])
  }

  const handleDeleteChat = (chatId: string) => {
    deleteChat(chatId)
    const updatedChats = conversations.filter((c) => c.id !== chatId)
    setConversations(updatedChats)
    if (selectedChatId === chatId) {
      const nextChat = updatedChats[0]
      if (nextChat) {
        setSelectedChatId(nextChat.id)
        setIsNewChatMode(false)
        const uiMessages: UIMessage[] = nextChat.messages.map((msg) => ({
          id: msg.id,
          role: msg.role,
          parts: [{ type: "text" as const, text: msg.content }],
        }))
        setMessages(uiMessages)
      } else {
        setIsNewChatMode(true)
        setSelectedChatId(null)
        setMessages([])
      }
    }
    toast.success("Chat deleted", {
      description: "Your chat has been removed.",
    })
  }

  const handleRenameChat = (chatId: string, newTitle: string) => {
    updateChat(chatId, { title: newTitle, avatar: newTitle.slice(0, 2).toUpperCase() })
    const updatedChats = getChats()
    setConversations(updatedChats)
    toast.success("Chat renamed, bruv!", {
      description: `Chat is now called "${newTitle}".`,
    })
  }

  const handleSendMessage = (message: string) => {
    // Add user message immediately
    const userMessage: UIMessage = {
      id: crypto.randomUUID(),
      role: "user",
      parts: [{ type: "text" as const, text: message }],
    }

    let currentChatId = selectedChatId

    if (isNewChatMode) {
      const firstWords = message.split(" ").slice(0, 4).join(" ")
      const chatTitle = firstWords.length > 30 ? firstWords.slice(0, 30) + "..." : firstWords
      const newChat = createChat(chatTitle || "New Chat")
      const updatedChats = [newChat, ...conversations]
      saveChats(updatedChats)
      setConversations(updatedChats)
      setSelectedChatId(newChat.id)
      setIsNewChatMode(false)
      currentChatId = newChat.id

      toast.success("Chat created, innit!", {
        description: "Your conversation has started.",
      })
    }

    setMessages((prev) => [...prev, userMessage])
    setIsStreaming(true)

    // Simulate AI response with a delay
    setTimeout(() => {
      const aiResponses = [
        "That's a great question! Let me help you with that. 🚀",
        "I understand what you're asking. Here's my take on it...",
        "Interesting! I'd be happy to assist you with that.",
        "Sure thing! Let me explain that for you.",
        "Absolutely! Here's what I think about that...",
        "Great minds think alike! Let me share some insights.",
        "Brilliant! That's exactly the right approach, innit!",
        "Cheers! I've got just the solution for you, mate.",
      ]
      
      const randomResponse = aiResponses[Math.floor(Math.random() * aiResponses.length)]
      
      const aiMessage: UIMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        parts: [{ type: "text" as const, text: randomResponse }],
      }
      
      setMessages((prev) => [...prev, aiMessage])
      setIsStreaming(false)
      
      // Save messages to localStorage
      if (currentChatId) {
        setTimeout(() => {
          setMessages((currentMessages) => {
            saveChatMessages(currentChatId, currentMessages)
            const updatedChats = getChats()
            setConversations(updatedChats)
            return currentMessages
          })
        }, 100)
      }
    }, 1500)

    // TODO: Uncomment when AI SDK is properly configured
    // sendMessage({ text: message })
  }

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId)
    setIsNewChatMode(false)
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <ChatSidebar
          conversations={conversations}
          selectedChat={selectedChatId}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
          onDeleteChat={handleDeleteChat}
          onRenameChat={handleRenameChat}
        />
        <div className="flex flex-col flex-1 overflow-hidden">
          <ChatHeader selectedChat={isNewChatMode ? null : selectedChat} />
          <div className="flex-1 overflow-hidden">
            {isNewChatMode || !selectedChat ? (
              <ChatEmptyState />
            ) : (
              <ChatMessageArea conversation={selectedChat} messages={messages} isStreaming={isStreaming} />
            )}
          </div>
          {(isNewChatMode || selectedChat) && (
            <div className="border-t p-4 md:p-6 bg-card">
              <div className="max-w-3xl mx-auto">
                <ChatInput onSendMessage={handleSendMessage} disabled={isStreaming} />
              </div>
            </div>
          )}
        </div>
      </div>
    </SidebarProvider>
  )
}
