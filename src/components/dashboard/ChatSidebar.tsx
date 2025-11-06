import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInput,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Plus,
  Search,
  Pencil,
  Trash2,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Chat } from "@/lib/chat-storage";

interface ChatSidebarProps {
  conversations: Chat[];
  selectedChat: string | null;
  onSelectChat: (id: string) => void;
  onNewChat?: () => void;
  onDeleteChat?: (id: string) => void;
  onRenameChat?: (id: string, newTitle: string) => void;
}

export default function ChatSidebar({
  conversations,
  selectedChat,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onRenameChat,
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [selectedChatForAction, setSelectedChatForAction] = useState<
    string | null
  >(null);
  const [newChatTitle, setNewChatTitle] = useState("");

  const filteredConversations = conversations.filter((conv) =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteClick = (chatId: string) => {
    setSelectedChatForAction(chatId);
    setDeleteDialogOpen(true);
  };

  const handleRenameClick = (chat: Chat) => {
    setSelectedChatForAction(chat.id);
    setNewChatTitle(chat.title);
    setRenameDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedChatForAction && onDeleteChat) {
      onDeleteChat(selectedChatForAction);
      setDeleteDialogOpen(false);
      setSelectedChatForAction(null);
    }
  };

  const confirmRename = () => {
    if (selectedChatForAction && onRenameChat && newChatTitle.trim()) {
      onRenameChat(selectedChatForAction, newChatTitle.trim());
      setRenameDialogOpen(false);
      setSelectedChatForAction(null);
      setNewChatTitle("");
    }
  };

  return (
    <>
      <Sidebar className="border-r bg-sidebar">
        <SidebarHeader className="border-b border-sidebar-border px-4 py-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <MessageSquare className="size-5" />
              </div>
              <div>
                <h1 className="font-semibold text-base">Messages</h1>
                <p className="text-xs text-muted-foreground">
                  {conversations.length} conversations
                </p>
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="size-10 rounded-xl hover:bg-sidebar-accent"
              onClick={onNewChat}
            >
              <Plus className="size-5" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <SidebarInput
              placeholder="Search conversations..."
              className="pl-10 h-10 bg-sidebar-accent border-0 focus-visible:ring-1"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </SidebarHeader>

        <SidebarContent className="px-3 py-3">
          <SidebarMenu className="space-y-1">
            {filteredConversations.map((conv) => (
              <SidebarMenuItem key={conv.id}>
                <div className="group relative">
                  <SidebarMenuButton
                    onClick={() => onSelectChat(conv.id)}
                    isActive={selectedChat === conv.id}
                    className="h-auto py-3 px-3 rounded-xl hover:bg-sidebar-accent data-[active=true]:bg-sidebar-accent transition-colors w-full"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="flex flex-col flex-1 min-w-0 gap-1">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-semibold text-sm truncate flex-1">
                            {conv.title}
                          </span>
                        </div>
                        <p className="text-xs text truncate">{conv.preview}</p>
                        {conv.unread > 0 && (
                          <Badge
                            variant="secondary"
                            className="w-fit px-2 py-0.5 text-xs font-semibold rounded-full"
                          >
                            {conv.unread} new
                          </Badge>
                        )}
                      </div>
                    </div>
                  </SidebarMenuButton>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-lg"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRenameClick(conv);
                          }}
                        >
                          <Pencil className="size-4 mr-2 text-current" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(conv.id);
                          }}
                        >
                          <Trash2 className="size-4 mr-2 text-current" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this chat, innit?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              chat and all its messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Chat</DialogTitle>
            <DialogDescription>
              Give your chat a new name, mate.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="chat-title">Chat Title</Label>
              <Input
                id="chat-title"
                value={newChatTitle}
                onChange={(e) => setNewChatTitle(e.target.value)}
                placeholder="Enter new chat title..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    confirmRename();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={confirmRename}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
