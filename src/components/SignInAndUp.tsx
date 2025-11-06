import { useEffect, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuthStore } from "@/zustand/AuthStore";

export function SignInAndSignUp() {
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const navigate = useNavigate();
  const initialize = useAuthStore((state) => state.initialize);
  const signIn = useAuthStore((state) => state.signIn);
  const signUp = useAuthStore((state) => state.signUp);
  const requestPasswordReset = useAuthStore(
    (state) => state.requestPasswordReset
  );
  const isAuthLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const signinForm = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      try {
        await signIn({ email: value.email, password: value.password });
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
      try {
        await signUp({
          email: value.email,
          password: value.password,
          fullName: value.fullName,
        });
        toast.success("Account created");
        navigate({ to: "/dashboard" });
      } catch (error: any) {
        toast.error("Sign up failed", {
          description: error?.message ?? "Please try again.",
        });
      }
    },
  });

  const handleResetSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = resetEmail.trim();
    if (!email) {
      toast.error("Enter the email associated with your account.");
      return;
    }
    try {
      await requestPasswordReset(email);
      setResetSent(true);
      toast.success("Reset email sent", {
        description: "Check your inbox for instructions.",
      });
    } catch (error: any) {
      toast.error("Could not send reset email", {
        description: error?.message ?? "Please try again later.",
      });
    }
  };

  return (
    <>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
          <CardDescription>
            Sign in to your account or create a new one
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={(value) =>
              setActiveTab(value as "signin" | "signup")
            }
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
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
                                setResetEmail("");
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
                              onSubmit={handleResetSubmit}
                            >
                              <div className="space-y-2">
                                <Label htmlFor="reset-email">Email</Label>
                                <Input
                                  id="reset-email"
                                  type="email"
                                  value={resetEmail}
                                  onChange={(event) =>
                                    setResetEmail(event.target.value)
                                  }
                                  placeholder="you@example.com"
                                  required
                                />
                              </div>
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
                                <Button type="submit" disabled={isAuthLoading}>
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

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isAuthLoading}
                >
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

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isAuthLoading}
                >
                  Sign Up
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  By signing up, you agree to our{" "}
                  <Link to="/" className="underline hover:text-foreground">
                    Terms of Service
                  </Link>
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </>
  );
}
