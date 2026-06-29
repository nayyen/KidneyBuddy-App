import AppShell from "@/components/shell/AppShell";
import { Toaster } from "@/components/ui/sonner";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AppShell>{children}</AppShell>
      <Toaster position="bottom-center" />
    </>
  );
}
