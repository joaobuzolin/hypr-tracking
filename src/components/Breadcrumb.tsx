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
    <nav className="flex flex-wrap items-center gap-1 md:gap-2 text-xs md:text-sm text-muted-foreground mb-6 md:mb-8 mt-2 md:mt-4 overflow-x-auto">
      {items.map((item, index) => {
        const Icon = item.icon;
        
        // Determinar se este item está ativo baseado na rota atual
        const isActive = item.href ? location.pathname === item.href : false;

        return (
          <div key={index} className="flex items-center shrink-0">
            {index > 0 && (
              <ChevronRight className="w-3 h-3 md:w-4 md:h-4 mx-1 md:mx-2 text-muted-foreground/60 shrink-0" />
            )}
            
            {item.href ? (
              <Link 
                to={item.href}
                className={`flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 rounded-md transition-none hover:bg-muted hover:text-foreground text-xs md:text-sm min-w-0 ${
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
                {Icon && <Icon className="w-3 h-3 md:w-4 md:h-4 shrink-0" />}
                <span className="truncate max-w-[80px] sm:max-w-[120px] md:max-w-none">{item.label}</span>
              </Link>
            ) : (
              <span className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 rounded-md bg-primary text-primary-foreground font-medium text-xs md:text-sm min-w-0">
                {Icon && <Icon className="w-3 h-3 md:w-4 md:h-4 shrink-0" />}
                <span className="truncate max-w-[80px] sm:max-w-[120px] md:max-w-none">{item.label}</span>
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