import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface CampaignGroup {
  id: string;
  name: string;
  description?: string;
  insertion_order_id: string;
  user_id?: string;
  status: string;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

export interface CampaignGroupWithCounts extends CampaignGroup {
  creatives_count: number;
  active_creatives_count: number;
}

export const useCampaignGroups = () => {
  const [campaignGroups, setCampaignGroups] = useState<CampaignGroupWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchCampaignGroups = async (insertionOrderId?: string) => {
    try {
      setLoading(true);
      
      let query = supabase
        .from("campaign_groups")
        .select(`
          id,
          name,
          description,
          insertion_order_id,
          user_id,
          status,
          start_date,
          end_date,
          created_at,
          updated_at
        `);

      if (insertionOrderId) {
        query = query.eq("insertion_order_id", insertionOrderId);
      }

      const { data: groups, error } = await query.order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching campaign groups:", error);
        toast.error("Failed to fetch campaigns");
        return;
      }

      // Fetch creative counts for each campaign group
      const groupsWithCounts = await Promise.all(
        (groups || []).map(async (group) => {
          const { count: totalCount } = await supabase
            .from("campaigns")
            .select("*", { count: "exact", head: true })
            .eq("campaign_group_id", group.id);

          // For active count, we'll use the same derivation logic as before
          const { data: eventsData } = await supabase
            .from("events")
            .select("tag_id")
            .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .in("tag_id", 
              (await supabase
                .from("tags")
                .select("id")
                .eq("campaign_id", group.id)
              ).data?.map(tag => tag.id) || []
            );

          const activeCreativesCount = new Set(
            eventsData?.map(event => event.tag_id) || []
          ).size;

          return {
            ...group,
            creatives_count: totalCount || 0,
            active_creatives_count: activeCreativesCount
          };
        })
      );

      setCampaignGroups(groupsWithCounts);
    } catch (error) {
      console.error("Error fetching campaign groups:", error);
      toast.error("Failed to fetch campaigns");
    } finally {
      setLoading(false);
    }
  };

  const createCampaignGroup = async (data: {
    name: string;
    description?: string;
    insertion_order_id: string;
    start_date?: string;
    end_date?: string;
  }) => {
    try {
      if (!user) {
        toast.error("User not authenticated");
        return;
      }

      const { error } = await supabase
        .from("campaign_groups")
        .insert([{
          ...data,
          user_id: user.id,
        }]);

      if (error) {
        console.error("Error creating campaign group:", error);
        toast.error("Failed to create campaign");
        return;
      }

      toast.success("Campaign created successfully");
      await fetchCampaignGroups(data.insertion_order_id);
    } catch (error) {
      console.error("Error creating campaign group:", error);
      toast.error("Failed to create campaign");
    }
  };

  useEffect(() => {
    if (user) {
      fetchCampaignGroups();
    }
  }, [user]);

  return {
    campaignGroups,
    loading,
    fetchCampaignGroups,
    createCampaignGroup,
  };
};