import React from "react";
import { UserMenu } from "@/components/UserMenu";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { Link } from "react-router-dom";

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  actions?: React.ReactNode;
  contextBar?: React.ReactNode;
  showReportsButton?: boolean;
  backButton?: { href: string; label: string };
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  title,
  subtitle,
  breadcrumbs,
  actions,
  contextBar,
  showReportsButton = true,
  backButton
}) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header with glass effect - optimized */}
      <header className="sticky top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b backdrop-saturate-150 will-change-transform">
        <div className="container mx-auto px-3 md:px-4 py-2 md:py-3">
          <div className="flex flex-col gap-2 md:flex-row md:justify-between md:items-center">
            <div className="flex items-center gap-2 md:gap-4">
              {backButton && (
                <Link to={backButton.href}>
                  <Button variant="ghost" size="sm" className="gap-2 text-xs md:text-sm">
                    {backButton.label}
                  </Button>
                </Link>
              )}
              <div className="flex-1 min-w-0 flex items-center">
                <div className="mr-4">
                  <img 
                    src="/lovable-uploads/0fcddc38-83cc-4638-b362-1485d244ceb3.png" 
                    alt="HYPR TRACKING" 
                    width="120"
                    height="28"
                    className="h-5 md:h-7 w-auto object-contain"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 md:gap-3 shrink-0">
              {showReportsButton && (
                <Link to="/reports">
                  <Button variant="outline" className="gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3">
                    <FileText className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">Relatórios</span>
                    <span className="sm:hidden">Reports</span>
                  </Button>
                </Link>
              )}
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Content with proper spacing - optimized */}
      <main className="pt-3 md:pt-4">
        <div className="container mx-auto px-3 md:px-4 pb-8 md:pb-12 lg:pb-16">
          <div className="space-y-4 md:space-y-5">
            {/* SR-only h1 for accessibility */}
            {title && <h1 className="sr-only">{title}</h1>}

            {/* Breadcrumbs */}
            {breadcrumbs && (
              <Breadcrumb items={breadcrumbs} />
            )}
            
            {/* Context Bar - optimized spacing */}
            {contextBar && (
              <section className="bg-muted/30 rounded-lg border p-3 md:p-4">
                {contextBar}
              </section>
            )}

            {/* Actions Bar - optimized */}
            {actions && (
              <section className="flex justify-end">
                {actions}
              </section>
            )}

            {/* Main Content */}
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};