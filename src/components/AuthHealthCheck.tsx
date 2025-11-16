import { useEffect } from "react";
import { useAuthStore } from "../zustand/AuthStore";
import { toast } from "sonner";

/**
 * AuthHealthCheck component that monitors authentication health
 * and handles stale/invalid tokens gracefully
 */
export function AuthHealthCheck() {
  const user = useAuthStore((state) => state.user);
  const tokens = useAuthStore((state) => state.tokens);
  const signOut = useAuthStore((state) => state.signOut);

  useEffect(() => {
    // Only run checks if user is authenticated
    if (!user || !tokens) {
      return;
    }

    // Check if tokens are valid JWT format
    const checkTokenValidity = () => {
      try {
        const accessToken = tokens.accessToken;
        
        // Basic JWT format check (should have 3 parts separated by dots)
        const parts = accessToken.split(".");
        if (parts.length !== 3) {
          console.error("AuthHealthCheck: Access token has invalid format");
          handleInvalidTokens();
          return false;
        }

        // Try to decode the payload to check expiry
        const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
        
        if (payload.exp) {
          const expiryTime = payload.exp * 1000; // Convert to milliseconds
          const now = Date.now();
          
          if (expiryTime < now) {
            console.warn("AuthHealthCheck: Access token is expired");
            // Don't immediately sign out, let the refresh mechanism handle it
            return false;
          }
        }

        return true;
      } catch (error) {
        console.error("AuthHealthCheck: Error checking token validity", error);
        handleInvalidTokens();
        return false;
      }
    };

    const handleInvalidTokens = () => {
      toast.error("Session Invalid", {
        description: "Your session is no longer valid. Please sign in again.",
        duration: 5000,
      });
      signOut();
    };

    // Run initial check
    checkTokenValidity();

    // Set up periodic health check (every 30 seconds)
    const intervalId = setInterval(() => {
      checkTokenValidity();
    }, 30000);

    return () => {
      clearInterval(intervalId);
    };
  }, [user, tokens, signOut]);

  return null; // This is a non-visual component
}
