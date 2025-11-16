import { useEffect, useState, type ComponentType, type SVGProps } from "react";
import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { toast } from "sonner";
import { Github } from "lucide-react";
import { useAuthStore } from "../zustand/AuthStore";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

type OAuthProvider = "google" | "github";

const GoogleIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 48 48"
    aria-hidden="true"
    focusable="false"
    className={className}
    width={16}
    height={16}
    {...props}
  >
    <path
      fill="#FFC107"
      d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
    />
    <path
      fill="#FF3D00"
      d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
    />
    <path
      fill="#4CAF50"
      d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
    />
    <path
      fill="#1976D2"
      d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
    />
  </svg>
);

// Zod schemas
const signInSchema = z.object({
  email: z.email("Invalid email address").min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

const signUpSchema = z.object({
  fullName: z.string().min(1, "Full name is required").trim(),
  email: z.email("Invalid email address").min(1, "Email is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-zA-Z]/, "Password must contain at least one letter")
    .regex(/\d/, "Password must contain at least one number"),
});

const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email address").min(1, "Email is required"),
});

export function SignInAndSignUp() {
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signup");
  const [resetSent, setResetSent] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const navigate = useNavigate();
  const initialize = useAuthStore((state) => state.initialize);
  const signIn = useAuthStore((state) => state.signIn);
  const signUp = useAuthStore((state) => state.signUp);
  const requestPasswordReset = useAuthStore(
    (state) => state.requestPasswordReset
  );
  const startOAuth = useAuthStore((state) => state.startOAuth);
  const isAuthLoading = useAuthStore((state) => state.isLoading);
  const isBusy = isAuthLoading || isRedirecting;

  const oauthProviders: Array<{
    provider: OAuthProvider;
    label: string;
    Icon: ComponentType<SVGProps<SVGSVGElement>>;
  }> = [
    { provider: "google", label: "Continue with Google", Icon: GoogleIcon },
    { provider: "github", label: "Continue with GitHub", Icon: Github },
  ];

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const handleOAuth = async (provider: OAuthProvider) => {
    setIsRedirecting(true);
    try {
      const { authorizationUrl, state } = await startOAuth(provider);
      if (typeof window !== "undefined") {
        try {
          window.sessionStorage.setItem(
            "meshmind.oauth.pending",
            JSON.stringify({ provider, state, issuedAt: Date.now() })
          );
        } catch {
          // Ignore session storage access issues
        }
        window.location.href = authorizationUrl;
        return;
      }
      setIsRedirecting(false);
    } catch (error: unknown) {
      setIsRedirecting(false);
      const description =
        error instanceof Error ? error.message : "Please try again.";
      toast.error("Could not start sign-in", {
        description,
      });
    }
  };

  const signinForm = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      const result = signInSchema.safeParse(value);
      if (!result.success) {
        const error = result.error.issues[0];
        toast.error("Validation error", {
          description: error.message,
        });
        return;
      }

      try {
        await signIn(result.data);
        toast.success("Signed in successfully");
        navigate({ to: "/dashboard" });
      } catch (error: any) {
        toast.error("Sign in failed", {
          description:
            error?.message ?? "Check your credentials and try again.",
        });
      }
    },
  });

  const signupForm = useForm({
    defaultValues: {
      email: "",
      password: "",
      fullName: "",
    },
    onSubmit: async ({ value }) => {
      const result = signUpSchema.safeParse(value);
      if (!result.success) {
        const error = result.error.issues[0];
        toast.error("Validation error", {
          description: error.message,
        });
        return;
      }

      try {
        await signUp(result.data);
        toast.success("Account created");
        navigate({ to: "/dashboard" });
      } catch (error: any) {
        toast.error("Sign up failed", {
          description: error?.message ?? "Please try again.",
        });
      }
    },
  });

  const resetPasswordForm = useForm({
    defaultValues: {
      email: "",
    },
    onSubmit: async ({ value }) => {
      const result = resetPasswordSchema.safeParse(value);
      if (!result.success) {
        const error = result.error.issues[0];
        toast.error("Validation error", {
          description: error.message,
        });
        return;
      }

      try {
        await requestPasswordReset(result.data.email);
        setResetSent(true);
        toast.success("Reset email sent", {
          description: "Check your inbox for instructions.",
        });
      } catch (error: any) {
        toast.error("Could not send reset email", {
          description: error?.message ?? "Please try again later.",
        });
      }
    },
  });

  return (
    <>
      {/* Static grid background - horizontal lines */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={`h-${i}`}
            className="absolute h-px bg-border opacity-40"
            style={{
              top: `${i * 40}px`,
              left: 0,
              right: 0,
            }}
          />
        ))}
      </div>

      {/* Static grid background - vertical lines */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={`v-${i}`}
            className="absolute w-px bg-border opacity-40"
            style={{
              left: `${i * 40}px`,
              top: 0,
              bottom: 0,
            }}
          />
        ))}
      </div>

      <Card className="w-full max-w-md relative z-10">
        <CardHeader>
          <CardTitle>Welcome to MeshMind</CardTitle>
          <CardDescription>
            {activeTab === "signup"
              ? "Create an account to get started"
              : "Sign in to your account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={(value) =>
              setActiveTab(value as "signup" | "signin")
            }
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
              <TabsTrigger value="signin">Sign In</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  signinForm.handleSubmit();
                }}
                className="space-y-4"
              >
                <div className="space-y-4">
                  <div className="grid gap-3">
                    {oauthProviders.map(({ provider, label, Icon }) => (
                      <Button
                        key={provider}
                        type="button"
                        variant="outline"
                        className="w-full"
                        disabled={isBusy}
                        onClick={() => handleOAuth(provider)}
                      >
                        <Icon className="mr-2 size-4" />
                        {label}
                      </Button>
                    ))}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" aria-hidden="true" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">
                        Or continue with email
                      </span>
                    </div>
                  </div>
                </div>
                <signinForm.Field name="email">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="you@example.com"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        required
                      />
                    </div>
                  )}
                </signinForm.Field>

                <signinForm.Field name="password">
                  {(field) => (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="signin-password">Password</Label>
                        <Dialog
                          open={isResetOpen}
                          onOpenChange={setIsResetOpen}
                        >
                          <DialogTrigger asChild>
                            <button
                              type="button"
                              className="text-sm text-primary hover:underline"
                              onClick={() => {
                                setResetSent(false);
                                resetPasswordForm.reset();
                              }}
                            >
                              Forgot password?
                            </button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Reset password</DialogTitle>
                            </DialogHeader>
                            <form
                              className="space-y-4"
                              onSubmit={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                resetPasswordForm.handleSubmit();
                              }}
                            >
                              <resetPasswordForm.Field name="email">
                                {(field) => (
                                  <div className="space-y-2">
                                    <Label htmlFor="reset-email">Email</Label>
                                    <Input
                                      id="reset-email"
                                      type="email"
                                      value={field.state.value}
                                      onChange={(event) =>
                                        field.handleChange(event.target.value)
                                      }
                                      placeholder="you@example.com"
                                      required
                                    />
                                  </div>
                                )}
                              </resetPasswordForm.Field>
                              {resetSent && (
                                <p className="text-sm text-muted-foreground">
                                  If an account exists for this email, you will
                                  receive a reset link shortly.
                                </p>
                              )}
                              <div className="flex justify-end space-x-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  onClick={() => setIsResetOpen(false)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  type="submit"
                                  disabled={
                                    isAuthLoading ||
                                    resetPasswordForm.state.isSubmitting
                                  }
                                >
                                  Send reset link
                                </Button>
                              </div>
                            </form>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="••••••••"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        required
                      />
                    </div>
                  )}
                </signinForm.Field>

                <Button type="submit" className="w-full" disabled={isBusy}>
                  Sign In
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  signupForm.handleSubmit();
                }}
                className="space-y-4"
              >
                <div className="space-y-4">
                  <div className="grid gap-3">
                    {oauthProviders.map(({ provider, label, Icon }) => (
                      <Button
                        key={provider}
                        type="button"
                        variant="outline"
                        className="w-full"
                        disabled={isBusy}
                        onClick={() => handleOAuth(provider)}
                      >
                        <Icon className="mr-2 size-4" />
                        {label}
                      </Button>
                    ))}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" aria-hidden="true" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">
                        Or sign up with email
                      </span>
                    </div>
                  </div>
                </div>
                <signupForm.Field name="fullName">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="signup-fullname">Full Name</Label>
                      <Input
                        id="signup-fullname"
                        type="text"
                        placeholder="Jane Doe"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        required
                      />
                    </div>
                  )}
                </signupForm.Field>

                <signupForm.Field name="email">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@example.com"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        required
                      />
                    </div>
                  )}
                </signupForm.Field>

                <signupForm.Field name="password">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        required
                      />
                    </div>
                  )}
                </signupForm.Field>

                <Button type="submit" className="w-full" disabled={isBusy}>
                  Sign Up
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  By signing up, you agree to our{" "}
                  <TooltipProvider>
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                        <span className="underline decoration-dotted cursor-help hover:text-foreground transition-colors">
                          Terms of Service
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="bg-popover text-popover-foreground border shadow-md">
                        <p className="text-sm">It's open source. No terms and conditions. 🎉</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </>
  );
}
