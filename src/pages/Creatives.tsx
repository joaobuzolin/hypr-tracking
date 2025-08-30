import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Search } from "lucide-react";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useCampaignGroups } from "@/hooks/useCampaignGroups";
import { useInsertionOrders } from "@/hooks/useInsertionOrders";
import { CampaignCard } from "@/components/CampaignCard";
import { Breadcrumb, useBreadcrumbs } from "@/components/Breadcrumb";

// IAB Standard Ad Formats
const IAB_FORMATS = [
  { value: 'banner', label: 'Banner (728x90)' },
  { value: 'leaderboard', label: 'Leaderboard (728x90)' },
  { value: 'medium-rectangle', label: 'Medium Rectangle (300x250)' },
  { value: 'large-rectangle', label: 'Large Rectangle (336x280)' },
  { value: 'skyscraper', label: 'Skyscraper (160x600)' },
  { value: 'wide-skyscraper', label: 'Wide Skyscraper (160x600)' },
  { value: 'mobile-banner', label: 'Mobile Banner (320x50)' },
  { value: 'large-mobile-banner', label: 'Large Mobile Banner (320x100)' },
  { value: 'half-page', label: 'Half Page (300x600)' },
  { value: 'portrait', label: 'Portrait (300x1050)' },
  { value: 'square', label: 'Square (250x250)' },
  { value: 'small-square', label: 'Small Square (200x200)' },
];

const CreateCreativeDialog = ({ 
  campaignGroupId, 
  onCreativeCreated 
}: { 
  campaignGroupId: string;
  onCreativeCreated: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creativeFormat, setCreativeFormat] = useState("banner");
  const { createCampaign } = useCampaigns();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await createCampaign({
      name: name.trim(),
      description: description.trim() || undefined,
      campaign_group_id: campaignGroupId,
      creative_format: creativeFormat,
    });

    setName("");
    setDescription("");
    setCreativeFormat("banner");
    setOpen(false);
    onCreativeCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Creative
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Creative</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Creative Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter creative name"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="format">IAB Format</Label>
            <Select value={creativeFormat} onValueChange={setCreativeFormat}>
              <SelectTrigger>
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                {IAB_FORMATS.map((format) => (
                  <SelectItem key={format.value} value={format.value}>
                    {format.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter creative description"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Create Creative</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const Creatives = () => {
  const { insertionOrderId, campaignGroupId } = useParams<{ 
    insertionOrderId: string; 
    campaignGroupId: string; 
  }>();
  const [searchTerm, setSearchTerm] = useState("");
  
  const { campaigns, loading, fetchCampaigns } = useCampaigns();
  const { campaignGroups } = useCampaignGroups();
  const { insertionOrders } = useInsertionOrders();
  const { generateBreadcrumbs } = useBreadcrumbs();

  const insertionOrder = insertionOrders.find(io => io.id === insertionOrderId);
  const campaignGroup = campaignGroups.find(cg => cg.id === campaignGroupId);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Filter creatives for this campaign group
  const filteredCreatives = campaigns.filter(campaign => {
    const matchesCampaignGroup = campaign.campaign_group_id === campaignGroupId;
    const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (campaign.description && campaign.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesCampaignGroup && matchesSearch;
  });

  const handleCreativeCreated = () => {
    fetchCampaigns();
  };

  const breadcrumbItems = generateBreadcrumbs(insertionOrder?.client_name, campaignGroup?.name);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Breadcrumb items={breadcrumbItems} />
        </div>

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to={`/insertion-orders/${insertionOrderId}/campaigns`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Campaigns
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Creatives</h1>
              <p className="text-muted-foreground">
                {campaignGroup ? campaignGroup.name : 'Loading...'}
              </p>
            </div>
          </div>
          {campaignGroupId && (
            <CreateCreativeDialog
              campaignGroupId={campaignGroupId}
              onCreativeCreated={handleCreativeCreated}
            />
          )}
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search creatives..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-[200px] w-full" />
              </div>
            ))}
          </div>
        ) : filteredCreatives.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              {searchTerm ? "No creatives found matching your search." : "No creatives found."}
            </p>
            {!searchTerm && campaignGroupId && (
              <div className="mt-4">
                <CreateCreativeDialog
                  campaignGroupId={campaignGroupId}
                  onCreativeCreated={handleCreativeCreated}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCreatives.map((creative) => (
              <CampaignCard key={creative.id} campaign={creative} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Creatives;