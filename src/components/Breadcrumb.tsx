import React, { memo } from 'react';
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

const BreadcrumbComponent = ({ items }: BreadcrumbProps) => {
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
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-none hover:bg-muted hover:text-foreground ${
                  isActive 
                    ? 'bg-primary text-primary-foreground font-medium' 
                    : ''
                }`}
                replace={false}
                onMouseEnter={() => {
                  // Prefetch da página no hover para navegação instantânea
                  if (item.href === '/') {
                    import('../pages/InsertionOrders').catch(() => {});
                  } else if (item.href === '/campanhas') {
                    import('../pages/Campanhas').catch(() => {});
                  } else if (item.href === '/criativos') {
                    import('../pages/Criativos').catch(() => {});
                  }
                }}
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

export const Breadcrumb = memo(BreadcrumbComponent);

// Hook personalizado para gerar breadcrumbs automaticamente - otimizado
export const useBreadcrumbs = () => {
  const location = useLocation();
  
  // Memoizar os breadcrumbs para evitar recriação desnecessária
  const generateBreadcrumbs = React.useMemo((): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [];

    // Sempre mostrar os 3 níveis da hierarquia
    items.push({
      label: 'Insertion Orders',
      href: '/',
      icon: Building
    });

    items.push({
      label: 'Campanhas',
      href: '/campanhas',
      icon: Users
    });

    items.push({
      label: 'Criativos',
      href: '/criativos',
      icon: FolderOpen
    });

    return items;
  }, [location.pathname]);

  return { generateBreadcrumbs: () => generateBreadcrumbs };
};