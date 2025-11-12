import { useEffect, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInput,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  MoreVertical,
  Settings,
  LogOut,
  Loader2,
  ChevronUp,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Chat } from "@/lib/chat-storage";
import { toast } from "sonner";
import { useAuthStore } from "@/zustand/AuthStore";
import { useChatStore } from "@/zustand/ChatStore";

const getInitials = (fullName: string, email: string) => {
  const trimmed = fullName.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/);
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
    const combined = `${first}${last}`.toUpperCase();
    if (combined.trim()) {
      return combined;
    }
  }
  const fallback = email.split("@")[0] ?? "";
  return fallback.slice(0, 2).toUpperCase() || "MM";
};

// Zod schemas
const renameChatSchema = z.object({
  title: z.string().min(1, "Chat title cannot be empty").trim(),
});

const profileSchema = z.object({
  fullName: z.string().min(1, "Full name cannot be empty").trim(),
  email: z.string().email("Invalid email address").trim(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[a-zA-Z]/, "Password must contain at least one letter")
      .regex(/\d/, "Password must contain at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

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
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const changePassword = useAuthStore((state) => state.changePassword);
  const deleteAccount = useAuthStore((state) => state.deleteAccount);
  const resetChats = useChatStore((state) => state.reset);

  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [selectedChatForAction, setSelectedChatForAction] = useState<
    string | null
  >(null);
  const [advancedDialogOpen, setAdvancedDialogOpen] = useState(false);
  const [accountDeleteDialogOpen, setAccountDeleteDialogOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // TanStack Form for renaming chat
  const renameForm = useForm({
    defaultValues: {
      title: "",
    },
    onSubmit: async ({ value }) => {
      const result = renameChatSchema.safeParse(value);
      if (!result.success) {
        const error = result.error.issues[0];
        toast.error(error.message);
        return;
      }
      if (selectedChatForAction && onRenameChat) {
        onRenameChat(selectedChatForAction, result.data.title);
        setRenameDialogOpen(false);
        setSelectedChatForAction(null);
        renameForm.reset();
      }
    },
  });

  // TanStack Form for profile
  const profileForm = useForm({
    defaultValues: {
      fullName: "",
      email: "",
    },
    onSubmit: async ({ value }) => {
      if (!user) {
        toast.error("You need to be signed in first.");
        return;
      }

      const result = profileSchema.safeParse(value);
      if (!result.success) {
        const error = result.error.issues[0];
        toast.error(error.path.join("."), {
          description: error.message,
        });
        return;
      }

      try {
        await updateProfile(result.data);
        toast.success("Profile updated", {
          description: "Your changes have been saved.",
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Something went wrong.";
        toast.error("Update failed", {
          description: message,
        });
      }
    },
  });

  // TanStack Form for password
  const passwordForm = useForm({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    onSubmit: async ({ value }) => {
      if (!user) {
        toast.error("You need to be signed in first.");
        return;
      }

      const result = passwordSchema.safeParse(value);
      if (!result.success) {
        const error = result.error.issues[0];
        toast.error("Validation error", {
          description: error.message,
        });
        return;
      }

      try {
        await changePassword({
          currentPassword: result.data.currentPassword,
          newPassword: result.data.newPassword,
        });
        toast.success("Password updated", {
          description: "Use your new password next time you sign in.",
        });
        passwordForm.reset();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to change password.";
        toast.error("Update failed", {
          description: message,
        });
      }
    },
  });

  const filteredConversations = conversations.filter((conv) =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteClick = (chatId: string) => {
    setSelectedChatForAction(chatId);
    setDeleteDialogOpen(true);
  };

  const handleRenameClick = (chat: Chat) => {
    setSelectedChatForAction(chat.id);
    renameForm.setFieldValue("title", chat.title);
    setRenameDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedChatForAction && onDeleteChat) {
      onDeleteChat(selectedChatForAction);
      setDeleteDialogOpen(false);
      setSelectedChatForAction(null);
    }
  };

  useEffect(() => {
    if (!advancedDialogOpen || !user) {
      return;
    }
    profileForm.setFieldValue("fullName", user.fullName);
    profileForm.setFieldValue("email", user.email);
  }, [advancedDialogOpen, user, profileForm]);

  useEffect(() => {
    if (!advancedDialogOpen) {
      passwordForm.reset();
      setAccountDeleteDialogOpen(false);
    }
  }, [advancedDialogOpen, passwordForm]);

  useEffect(() => {
    if (!user) {
      setAdvancedDialogOpen(false);
      setAccountDeleteDialogOpen(false);
    }
  }, [user]);

  const handleSignOut = () => {
    setAdvancedDialogOpen(false);
    setAccountDeleteDialogOpen(false);
    signOut();
    resetChats();
    toast.info("Signed out", {
      description: "Come back soon!",
    });
  };

  const handleConfirmDeleteAccount = async () => {
    if (!user) {
      toast.error("You need to be signed in first.");
      return;
    }

    setIsDeletingAccount(true);
    try {
      await deleteAccount();
      resetChats();
      setAccountDeleteDialogOpen(false);
      setAdvancedDialogOpen(false);
      toast.success("Account deleted", {
        description: "All your data has been removed.",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not delete account.";
      toast.error("Deletion failed", {
        description: message,
      });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <>
      <Sidebar className="border-r bg-sidebar">
        <SidebarHeader className="border-b border-sidebar-border px-4 py-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="font-semibold text-base">MeshMind</h1>
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
                      <DropdownMenuTrigger asChild className="bg-transparent">
                        <Button
                          size="icon"
                          className="size-8 rounded-lg hover:bg-transparent data-[state=open]:opacity-100"
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
        {user && (
          <SidebarFooter className="border-t border-sidebar-border px-3 py-4">
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton className="h-auto py-3 px-3 rounded-xl transition-colors w-full group/footer hover:bg-sidebar-border/60 hover:text-sidebar-foreground data-[state=open]:hover:bg-sidebar-border/60 data-[state=open]:hover:text-sidebar-foreground">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="size-9 shrink-0 text-primary">
                          {user.avatarUrl && (
                            <AvatarImage
                              src={user.avatarUrl}
                              alt={user.fullName}
                            />
                          )}
                          <AvatarFallback className="bg-primary/10 font-semibold text-xs">
                            {getInitials(user.fullName, user.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col flex-1 min-w-0 gap-1">
                          <span className="font-semibold text-sm truncate">
                            {user.fullName}
                          </span>
                          <p className="text-xs text truncate">{user.email}</p>
                        </div>
                        <ChevronUp className="size-4 shrink-0 mt-0.5 text-current transition-transform group-data-[state=open]/footer:rotate-180" />
                      </div>
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    side="top"
                    className="w-(--radix-dropdown-menu-trigger-width)"
                  >
                    <DropdownMenuItem
                      onClick={() => {
                        setAdvancedDialogOpen(true);
                      }}
                    >
                      <Settings className="size-4 mr-2 text-current" />
                      Advanced
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        handleSignOut();
                      }}
                    >
                      <LogOut className="size-4 mr-2 text-current" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        )}
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
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              renameForm.handleSubmit();
            }}
            className="space-y-4 py-4"
          >
            <renameForm.Field name="title">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="chat-title">Chat Title</Label>
                  <Input
                    id="chat-title"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Enter new chat title..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        renameForm.handleSubmit();
                      }
                    }}
                  />
                </div>
              )}
            </renameForm.Field>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenameDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={advancedDialogOpen} onOpenChange={setAdvancedDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Advanced account controls</DialogTitle>
            <DialogDescription>
              Manage your personal information and security settings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-8 py-2">
            <section className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold">Profile</h3>
                <p className="text-xs text-muted-foreground">
                  Update your display name and email address.
                </p>
              </div>
              <form
                className="space-y-3"
                autoComplete="off"
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  profileForm.handleSubmit();
                }}
              >
                <profileForm.Field name="fullName">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="profile-full-name">Full name</Label>
                      <Input
                        id="profile-full-name"
                        value={field.state.value}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        placeholder="Enter your name"
                        autoComplete="off"
                      />
                    </div>
                  )}
                </profileForm.Field>

                <profileForm.Field name="email">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="profile-email">Email address</Label>
                      <Input
                        id="profile-email"
                        type="email"
                        value={field.state.value}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        placeholder="name@example.com"
                        autoComplete="off"
                      />
                    </div>
                  )}
                </profileForm.Field>

                <DialogFooter className="px-0">
                  <Button
                    type="submit"
                    disabled={profileForm.state.isSubmitting}
                  >
                    {profileForm.state.isSubmitting && (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    )}
                    Save changes
                  </Button>
                </DialogFooter>
              </form>
            </section>

            <section className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold">Password</h3>
                <p className="text-xs text-muted-foreground">
                  Choose a strong password that you have not used elsewhere.
                </p>
              </div>
              <form
                className="space-y-3"
                autoComplete="off"
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  passwordForm.handleSubmit();
                }}
              >
                <passwordForm.Field name="currentPassword">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Current password</Label>
                      <Input
                        id="current-password"
                        type="password"
                        value={field.state.value}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        placeholder="••••••••"
                        autoComplete="off"
                      />
                    </div>
                  )}
                </passwordForm.Field>

                <passwordForm.Field name="newPassword">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={field.state.value}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        placeholder="At least 8 characters"
                        autoComplete="new-password"
                      />
                    </div>
                  )}
                </passwordForm.Field>

                <passwordForm.Field name="confirmPassword">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">
                        Confirm new password
                      </Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={field.state.value}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        placeholder="Repeat your new password"
                        autoComplete="new-password"
                      />
                    </div>
                  )}
                </passwordForm.Field>

                <DialogFooter className="px-0">
                  <Button
                    type="submit"
                    disabled={passwordForm.state.isSubmitting}
                  >
                    {passwordForm.state.isSubmitting && (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    )}
                    Update password
                  </Button>
                </DialogFooter>
              </form>
            </section>

            <section className="space-y-3 rounded-xl border p-4">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold">Danger zone</h3>
                <p className="text-xs text-muted-foreground">
                  Deleting your account permanently removes all chats and
                  messages.
                </p>
              </div>
              <Button
                type="button"
                onClick={() => setAccountDeleteDialogOpen(true)}
              >
                Delete account
              </Button>
            </section>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={accountDeleteDialogOpen}
        onOpenChange={setAccountDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This action removes every chat, message, and API key associated
              with your profile. There is no way to undo this.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingAccount}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteAccount}
              disabled={isDeletingAccount}
            >
              {isDeletingAccount && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              Delete everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
