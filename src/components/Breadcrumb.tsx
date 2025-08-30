import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Building, FolderOpen, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export const Breadcrumb = ({ items }: BreadcrumbProps) => {

  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground mb-4">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const Icon = item.icon;

        return (
          <div key={index} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="w-4 h-4 mx-1 text-muted-foreground/60" />
            )}
            
            {isLast ? (
              <span className="flex items-center gap-1 text-foreground font-medium">
                {Icon && <Icon className="w-4 h-4" />}
                {item.label}
              </span>
            ) : item.href ? (
              <Link 
                to={item.href}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                {Icon && <Icon className="w-4 h-4" />}
                {item.label}
              </Link>
            ) : (
              <span className="flex items-center gap-1">
                {Icon && <Icon className="w-4 h-4" />}
                {item.label}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
};

// Hook personalizado para gerar breadcrumbs automaticamente
export const useBreadcrumbs = () => {
  const location = useLocation();
  const pathname = location.pathname;

  const generateBreadcrumbs = (
    insertionOrderName?: string,
    campaignName?: string
  ): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [];

    // Sempre começar com Insertion Orders (home)
    items.push({
      label: 'Insertion Orders',
      href: '/',
      icon: Building
    });

    // Se estivermos em campanhas de uma IO específica ou campanhas gerais
    if (pathname.includes('/campaigns') || pathname.startsWith('/campaigns')) {
      items.push({
        label: 'Campanhas',
        href: '/campaigns',
        icon: FolderOpen
      });
    }

    // Se estivermos em detalhes de campanha específica
    if (pathname.includes('/campaigns/') && campaignName && !pathname.endsWith('/new')) {
      items.push({
        label: campaignName,
        icon: FileText
      });
    }

    // Se estivermos criando nova campanha
    if (pathname.endsWith('/new')) {
      items.push({
        label: 'Nova Campanha',
        icon: FileText
      });
    }

    return items;
  };

  return { generateBreadcrumbs };
};