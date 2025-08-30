import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Building, FolderOpen, FileText, Users } from 'lucide-react';
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
  const location = useLocation();

  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground mb-6">
      {items.map((item, index) => {
        const Icon = item.icon;
        
        // Determinar se este item está ativo baseado na rota atual
        const isActive = item.href ? location.pathname === item.href : false;

        return (
          <div key={index} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="w-4 h-4 mx-2 text-muted-foreground/60" />
            )}
            
            {item.href ? (
              <Link 
                to={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                  isActive 
                    ? 'bg-primary text-primary-foreground font-medium' 
                    : 'hover:bg-muted hover:text-foreground'
                }`}
              >
                {Icon && <Icon className="w-4 h-4" />}
                {item.label}
              </Link>
            ) : (
              <span className="flex items-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground font-medium">
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
    campaignGroupName?: string,
    campaignName?: string
  ): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [];

    // Sempre começar com Insertion Orders
    items.push({
      label: 'Insertion Orders',
      href: '/',
      icon: Building
    });

    // Se temos insertionOrderName, significa que estamos num contexto de IO específica
    if (insertionOrderName) {
      items.push({
        label: insertionOrderName,
        href: pathname.match(/\/insertion-orders\/([^\/]+)/)?.[0] + '/campanhas',
        icon: Building
      });
    }

    // Se estamos na rota de campanhas ou temos campaignGroupName
    if (pathname.includes('/campanhas') || campaignGroupName) {
      if (!insertionOrderName) {
        // Se não temos IO name, adicionar link genérico para campanhas
        items.push({
          label: 'Campanhas',
          href: pathname.includes('/campanhas') ? pathname.split('/campanhas')[0] + '/campanhas' : undefined,
          icon: Users
        });
      }
      
      // Se temos campaignGroupName específico
      if (campaignGroupName) {
        items.push({
          label: campaignGroupName,
          href: pathname.match(/\/campanhas\/([^\/]+)/)?.[0] + '/criativos',
          icon: Users
        });
      }
    }

    // Se estamos vendo criativos
    if (pathname.includes('/criativos')) {
      // Se não temos campanhas no path, adicionar Criativos genérico
      if (!pathname.includes('/campanhas/')) {
        items.push({
          label: 'Criativos',
          href: '/criativos',
          icon: FolderOpen
        });
      } else if (campaignGroupName) {
        // Se temos campaign group, já foi adicionado acima
        items.push({
          label: 'Criativos',
          icon: FolderOpen
        });
      }
    }

    // Se estivermos em detalhes de criativo específico
    if (pathname.includes('/criativos/') && campaignName && !pathname.endsWith('/new')) {
      items.push({
        label: campaignName,
        icon: FileText
      });
    }

    // Se estivermos criando novo criativo
    if (pathname.endsWith('/new')) {
      items.push({
        label: 'Novo Criativo',
        icon: FileText
      });
    }

    return items;
  };

  return { generateBreadcrumbs };
};