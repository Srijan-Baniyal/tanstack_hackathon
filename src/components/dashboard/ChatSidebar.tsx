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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Plus, Search } from "lucide-react";

export interface Conversation {
  id: number;
  title: string;
  preview: string;
  time: string;
  unread: number;
  avatar: string;
}

interface ChatSidebarProps {
  conversations: Conversation[];
  selectedChat: number | null;
  onSelectChat: (id: number) => void;
  onNewChat?: () => void;
}

export default function ChatSidebar({
  conversations,
  selectedChat,
  onSelectChat,
  onNewChat,
}: ChatSidebarProps) {
  return (
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
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-3">
        <SidebarMenu className="space-y-1">
          {conversations.map((conv) => (
            <SidebarMenuItem key={conv.id}>
              <SidebarMenuButton
                onClick={() => onSelectChat(conv.id)}
                isActive={selectedChat === conv.id}
                className="h-auto py-3 px-3 rounded-xl hover:bg-sidebar-accent data-[active=true]:bg-sidebar-accent transition-colors"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <Avatar className="size-11 shrink-0 border-2 border-sidebar-border">
                    <AvatarFallback className="bg-muted text-foreground font-semibold text-sm">
                      {conv.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col flex-1 min-w-0 gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm truncate">
                        {conv.title}
                      </span>
                      <span className="text-xs shrink-0">
                        {conv.time}
                      </span>
                    </div>
                    <p className="text-xs truncate leading-relaxed">
                      {conv.preview}
                    </p>
                    {conv.unread > 0 && (
                      <Badge variant="secondary" className="w-fit px-2 py-0.5 text-xs font-semibold rounded-full">
                        {conv.unread} new
                      </Badge>
                    )}
                  </div>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      {/* <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-sidebar-accent transition-colors cursor-pointer">
          <Avatar className="size-10 border-2 border-background">
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">JD</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">John Doe</p>
            <p className="text-xs text-muted-foreground truncate">Online</p>
          </div>
        </div>
      </SidebarFooter> */}
    </Sidebar>
  );
}
