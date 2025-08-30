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
      {/* Sticky Header with glass effect */}
      <div className="sticky top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b">
        <div className="container mx-auto px-3 md:px-4 py-3 md:py-4">
          <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-start">
            <div className="flex items-center gap-2 md:gap-4">
              {backButton && (
                <Link to={backButton.href}>
                  <Button variant="ghost" size="sm" className="gap-2 text-xs md:text-sm">
                    {backButton.label}
                  </Button>
                </Link>
              )}
              <div className="flex-1 min-w-0">
                <div className="mb-1">
                  <img 
                    src="/lovable-uploads/0fcddc38-83cc-4638-b362-1485d244ceb3.png" 
                    alt="HYPR TRACKING" 
                    className="h-5 md:h-7 object-contain"
                  />
                </div>
                {(title || subtitle) && (
                  <div>
                    {title && <h1 className="text-lg md:text-2xl font-semibold truncate">{title}</h1>}
                    {subtitle && <p className="text-xs md:text-sm text-muted-foreground truncate">{subtitle}</p>}
                  </div>
                )}
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
      </div>

      {/* Content with proper spacing */}
      <div className="pt-4 md:pt-6">
        <div className="container mx-auto px-3 md:px-4">
          <div className="space-y-6">
            {/* Breadcrumbs */}
            {breadcrumbs && (
              <Breadcrumb items={breadcrumbs} />
            )}
            
            {/* Context Bar (e.g., IO selector) */}
            {contextBar && (
              <div className="bg-muted/30 rounded-lg border p-4">
                {contextBar}
              </div>
            )}

            {/* Actions Bar */}
            {actions && (
              <div className="flex justify-end">
                {actions}
              </div>
            )}

            {/* Main Content */}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};