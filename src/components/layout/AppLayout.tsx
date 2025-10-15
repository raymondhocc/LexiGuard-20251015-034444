import React from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { cn } from "@/lib/utils";
type AppLayoutProps = {
  children: React.ReactNode;
  className?: string;
};
export function AppLayout({ children, className }: AppLayoutProps): JSX.Element {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen flex-row bg-background">
        <AppSidebar />
        <div className={cn("flex-1 flex flex-col", className)}>
          <Header />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </div>
      </div>
    </SidebarProvider>
  );
}