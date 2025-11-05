export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

export interface Chat {
  id: string
  title: string
  preview: string
  time: string
  unread: number
  avatar: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

export interface Settings {
  openRouterKey?: string
  vercelAiGateway?: string
  systemPrompts: string[]
}

const STORAGE_KEYS = {
  CHATS: "chat-app-chats",
  SETTINGS: "chat-app-settings",
} as const

export function getChats(): Chat[] {
  if (typeof window === "undefined") return []
  const stored = localStorage.getItem(STORAGE_KEYS.CHATS)
  if (!stored) return []
  return JSON.parse(stored, (key, value) => {
    if (key === "createdAt" || key === "updatedAt" || key === "timestamp") {
      return new Date(value)
    }
    return value
  })
}

export function saveChats(chats: Chat[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(chats))
}

export function createChat(title = "New Chat"): Chat {
  const now = new Date()
  return {
    id: crypto.randomUUID(),
    title,
    preview: "No messages yet",
    time: "Just now",
    unread: 0,
    avatar: title.slice(0, 2).toUpperCase(),
    messages: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function updateChat(chatId: string, updates: Partial<Chat>): void {
  const chats = getChats()
  const index = chats.findIndex((c) => c.id === chatId)
  if (index !== -1) {
    chats[index] = { ...chats[index], ...updates, updatedAt: new Date() }
    saveChats(chats)
  }
}

export function deleteChat(chatId: string): void {
  const chats = getChats()
  saveChats(chats.filter((c) => c.id !== chatId))
}

export function addMessage(chatId: string, message: Omit<Message, "id" | "timestamp">): void {
  const chats = getChats()
  const chat = chats.find((c) => c.id === chatId)
  if (chat) {
    const newMessage: Message = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    }
    chat.messages.push(newMessage)
    chat.preview = message.content.slice(0, 50) + (message.content.length > 50 ? "..." : "")
    chat.time = "Just now"
    chat.updatedAt = new Date()
    saveChats(chats)
  }
}

export function getSettings(): Settings {
  if (typeof window === "undefined") return { systemPrompts: [] }
  const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS)
  if (!stored) return { systemPrompts: [] }
  return JSON.parse(stored)
}

export function saveSettings(settings: Settings): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings))
}

export function saveChatMessages(chatId: string, messages: any[]): void {
  const chats = getChats()
  const chat = chats.find((c) => c.id === chatId)
  if (chat) {
    // Convert UIMessage format to our Message format
    chat.messages = messages.map((msg) => {
      const textContent = msg.parts
        .filter((part: any) => part.type === "text")
        .map((part: any) => part.text)
        .join("")

      return {
        id: msg.id,
        role: msg.role,
        content: textContent,
        timestamp: new Date(),
      }
    })

    // Update preview and time
    if (chat.messages.length > 0) {
      const lastMessage = chat.messages[chat.messages.length - 1]
      chat.preview = lastMessage.content.slice(0, 50) + (lastMessage.content.length > 50 ? "..." : "")
      chat.time = "Just now"
    }

    chat.updatedAt = new Date()
    saveChats(chats)
  }
}
