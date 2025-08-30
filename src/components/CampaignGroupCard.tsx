import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Palette, Calendar, Target } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CampaignGroupWithCounts } from "@/hooks/useCampaignGroups";
import { Link } from "react-router-dom";
import { format } from "date-fns";

interface CampaignGroupCardProps {
  campaignGroup: CampaignGroupWithCounts;
  onEdit: (campaignGroup: CampaignGroupWithCounts) => void;
}

export const CampaignGroupCard = ({ campaignGroup, onEdit }: CampaignGroupCardProps) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
      case 'completed':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          <Link 
            to={`/insertion-orders/${campaignGroup.insertion_order_id}/campaigns/${campaignGroup.id}/creatives`}
            className="hover:underline"
          >
            {campaignGroup.name}
          </Link>
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge 
            variant="secondary" 
            className={getStatusColor(campaignGroup.status)}
          >
            {campaignGroup.status}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(campaignGroup)}>
                Edit Campaign
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        {campaignGroup.description && (
          <p className="text-sm text-muted-foreground mb-3">
            {campaignGroup.description}
          </p>
        )}
        
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium">{campaignGroup.creatives_count}</p>
              <p className="text-muted-foreground">Total Creatives</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-green-500" />
            <div>
              <p className="font-medium">{campaignGroup.active_creatives_count}</p>
              <p className="text-muted-foreground">Active Creatives</p>
            </div>
          </div>
          
          {campaignGroup.start_date && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">
                  {format(new Date(campaignGroup.start_date), "MMM dd")}
                </p>
                <p className="text-muted-foreground">Start Date</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};