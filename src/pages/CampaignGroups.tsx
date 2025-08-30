import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Search } from "lucide-react";
import { useCampaignGroups } from "@/hooks/useCampaignGroups";
import { useInsertionOrders } from "@/hooks/useInsertionOrders";
import { CampaignGroupCard } from "@/components/CampaignGroupCard";
import { EditCampaignGroupDialog } from "@/components/EditCampaignGroupDialog";
import { CampaignGroupWithCounts } from "@/hooks/useCampaignGroups";
import { Breadcrumb } from "@/components/Breadcrumb";
import { useBreadcrumbs } from "@/components/Breadcrumb";

const CreateCampaignGroupDialog = ({ 
  insertionOrderId, 
  onCampaignGroupCreated 
}: { 
  insertionOrderId: string;
  onCampaignGroupCreated: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { createCampaignGroup } = useCampaignGroups();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await createCampaignGroup({
      name: name.trim(),
      description: description.trim() || undefined,
      insertion_order_id: insertionOrderId,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    });

    setName("");
    setDescription("");
    setStartDate("");
    setEndDate("");
    setOpen(false);
    onCampaignGroupCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Campaign
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Campaign</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Campaign Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter campaign name"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter campaign description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Create Campaign</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const CampaignGroups = () => {
  const { insertionOrderId } = useParams<{ insertionOrderId: string }>();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingCampaignGroup, setEditingCampaignGroup] = useState<CampaignGroupWithCounts | null>(null);
  
  const { campaignGroups, loading, fetchCampaignGroups } = useCampaignGroups();
  const { insertionOrders } = useInsertionOrders();
  const { generateBreadcrumbs } = useBreadcrumbs();

  const insertionOrder = insertionOrders.find(io => io.id === insertionOrderId);

  useEffect(() => {
    if (insertionOrderId) {
      fetchCampaignGroups(insertionOrderId);
    }
  }, [insertionOrderId, fetchCampaignGroups]);

  const filteredCampaignGroups = campaignGroups.filter(campaignGroup =>
    campaignGroup.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (campaignGroup.description && campaignGroup.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleEditSave = async (data: { name: string; description?: string; start_date?: string; end_date?: string }) => {
    if (!editingCampaignGroup) return;
    
    // Update logic would go here - similar to createCampaignGroup but with UPDATE
    console.log("Update campaign group:", editingCampaignGroup.id, data);
    setEditingCampaignGroup(null);
    await fetchCampaignGroups(insertionOrderId);
  };

  const breadcrumbItems = generateBreadcrumbs(insertionOrder?.client_name);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Breadcrumb items={breadcrumbItems} />
        </div>

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/insertion-orders">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Insertion Orders
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Campaigns</h1>
              <p className="text-muted-foreground">
                {insertionOrder ? insertionOrder.client_name : 'Loading...'}
              </p>
            </div>
          </div>
          {insertionOrderId && (
            <CreateCampaignGroupDialog
              insertionOrderId={insertionOrderId}
              onCampaignGroupCreated={() => fetchCampaignGroups(insertionOrderId)}
            />
          )}
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search campaigns..."
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
        ) : filteredCampaignGroups.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              {searchTerm ? "No campaigns found matching your search." : "No campaigns found."}
            </p>
            {!searchTerm && insertionOrderId && (
              <CreateCampaignGroupDialog
                insertionOrderId={insertionOrderId}
                onCampaignGroupCreated={() => fetchCampaignGroups(insertionOrderId)}
              />
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCampaignGroups.map((campaignGroup) => (
              <CampaignGroupCard
                key={campaignGroup.id}
                campaignGroup={campaignGroup}
                onEdit={setEditingCampaignGroup}
              />
            ))}
          </div>
        )}

        <EditCampaignGroupDialog
          campaignGroup={editingCampaignGroup}
          open={!!editingCampaignGroup}
          onOpenChange={(open) => !open && setEditingCampaignGroup(null)}
          onSave={handleEditSave}
        />
      </div>
    </div>
  );
};

export default CampaignGroups;