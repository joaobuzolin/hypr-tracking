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
      {/* Fixed Header with glass effect */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/70 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              {backButton && (
                <Link to={backButton.href}>
                  <Button variant="ghost" size="sm" className="gap-2">
                    {backButton.label}
                  </Button>
                </Link>
              )}
              <div>
                <div className="mb-1">
                  <img 
                    src="/lovable-uploads/0fcddc38-83cc-4638-b362-1485d244ceb3.png" 
                    alt="HYPR TRACKING" 
                    className="h-7 object-contain"
                  />
                </div>
                {(title || subtitle) && (
                  <div>
                    {title && <h1 className="text-2xl font-semibold">{title}</h1>}
                    {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              {showReportsButton && (
                <Link to="/reports">
                  <Button variant="outline" className="gap-2">
                    <FileText className="w-4 h-4" />
                    Relatórios
                  </Button>
                </Link>
              )}
              <UserMenu />
            </div>
          </div>
        </div>
      </div>

      {/* Content with proper spacing */}
      <div className="pt-28">
        <div className="container mx-auto px-4">
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