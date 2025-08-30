import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserMenu } from "@/components/UserMenu";
import { Breadcrumb } from "@/components/Breadcrumb";
import { useBreadcrumbs } from "@/components/Breadcrumb";
import { useLocation, useParams } from "react-router-dom";
import { useInsertionOrders } from "@/hooks/useInsertionOrders";
import { useCampaignGroups } from "@/hooks/useCampaignGroups";

export const AppHeader = () => {
  const location = useLocation();
  const params = useParams();
  const { insertionOrders } = useInsertionOrders();
  const { campaignGroups } = useCampaignGroups();
  const { generateBreadcrumbs } = useBreadcrumbs();

  // Get names for breadcrumb generation
  const insertionOrder = insertionOrders.find(io => io.id === params.insertionOrderId);
  const campaignGroup = campaignGroups.find(cg => cg.id === params.campaignGroupId);

  const breadcrumbItems = generateBreadcrumbs(
    insertionOrder?.client_name,
    campaignGroup?.name
  );

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4">
      <SidebarTrigger />
      
      <div className="flex items-center gap-2">
        <img 
          src="/lovable-uploads/0fcddc38-83cc-4638-b362-1485d244ceb3.png" 
          alt="Logo" 
          className="h-8 w-8"
        />
        <span className="text-lg font-semibold">Campaign Manager</span>
      </div>
      
      <div className="flex-1">
        <Breadcrumb items={breadcrumbItems} />
      </div>
      
      <UserMenu />
    </header>
  );
};