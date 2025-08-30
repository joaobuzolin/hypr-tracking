import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  ChevronRight, 
  Building, 
  FolderOpen, 
  FileText, 
  Home,
  Layers,
  Image,
  Plus,
  BarChart3
} from 'lucide-react';

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

  const generateBreadcrumbs = (
    insertionOrderName?: string, 
    campaignName?: string
  ): BreadcrumbItem[] => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];

    // Handle insertion orders
    if (pathSegments.includes('insertion-orders')) {
      breadcrumbs.push({
        label: 'Insertion Orders',
        href: '/insertion-orders',
        icon: FolderOpen
      });

      // Handle specific insertion order
      const insertionOrderIndex = pathSegments.indexOf('insertion-orders');
      const insertionOrderId = pathSegments[insertionOrderIndex + 1];
      
      if (insertionOrderId && insertionOrderName) {
        // If we're in campaign groups or deeper
        if (pathSegments.includes('campaign-groups')) {
          breadcrumbs.push({
            label: insertionOrderName,
            href: `/insertion-orders/${insertionOrderId}/campaign-groups`,
            icon: Building
          });

          const campaignGroupIndex = pathSegments.indexOf('campaign-groups');
          const campaignGroupId = pathSegments[campaignGroupIndex + 1];
          
          if (campaignGroupId && campaignName) {
            breadcrumbs.push({
              label: campaignName,
              href: `/insertion-orders/${insertionOrderId}/campaign-groups/${campaignGroupId}/creatives`,
              icon: Layers
            });

            // Handle creatives
            if (pathSegments.includes('creatives')) {
              breadcrumbs.push({
                label: 'Creatives',
                href: `/insertion-orders/${insertionOrderId}/campaign-groups/${campaignGroupId}/creatives`,
                icon: Image
              });

              // Handle specific creative
              const creativesIndex = pathSegments.indexOf('creatives');
              const creativeId = pathSegments[creativesIndex + 1];
              
              if (creativeId && creativeId !== 'new') {
                breadcrumbs.push({
                  label: 'Creative Details',
                  icon: FileText
                });
              } else if (creativeId === 'new') {
                breadcrumbs.push({
                  label: 'New Creative',
                  icon: Plus
                });
              }
            }
          }
        }
      }
    }

    // Handle reports
    if (pathSegments.includes('reports')) {
      breadcrumbs.push({
        label: 'Reports',
        href: '/reports',
        icon: BarChart3
      });
    }

    return breadcrumbs;
  };

  return { generateBreadcrumbs };
};