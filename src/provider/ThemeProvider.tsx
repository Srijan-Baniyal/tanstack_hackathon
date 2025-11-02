import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useSyncExternalStore } from "react";

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  if (!mounted) {
    return null;
  }
  return (
    <>
      <NextThemesProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        storageKey="mailshift-ui-theme"
      >
        {children}
      </NextThemesProvider>
    </>
  );
}