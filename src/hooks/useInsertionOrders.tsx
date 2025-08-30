import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface InsertionOrder {
  id: string;
  user_id: string;
  client_name: string;
  description?: string;
  status: 'active' | 'paused' | 'completed';
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

export interface InsertionOrderWithMetrics extends InsertionOrder {
  campaigns_count: number;
  total_tags: number;
  total_clicks: number;
  profile?: {
    email: string;
  };
}

export const useInsertionOrders = () => {
  const [insertionOrders, setInsertionOrders] = useState<InsertionOrderWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchInsertionOrders = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch insertion orders with campaigns count and metrics
      const { data: insertionOrdersData, error } = await supabase
        .from('insertion_orders')
        .select(`
          *,
          profiles!insertion_orders_user_id_fkey(email),
          campaigns(
            id,
            tags(
              id,
              events(event_type)
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching insertion orders:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar as insertion orders.",
          variant: "destructive"
        });
        return;
      }

      // Process data to calculate metrics
      const processedData = insertionOrdersData.map((io: any) => {
        const campaigns = io.campaigns || [];
        const campaigns_count = campaigns.length;
        
        let total_tags = 0;
        let total_clicks = 0;

        campaigns.forEach((campaign: any) => {
          const tags = campaign.tags || [];
          total_tags += tags.length;

          tags.forEach((tag: any) => {
            const events = tag.events || [];
            total_clicks += events.filter((e: any) => 
              e.event_type === 'click' || e.event_type === 'pin_click'
            ).length;
          });
        });

        return {
          ...io,
          campaigns_count,
          total_tags,
          total_clicks,
          profile: Array.isArray(io.profiles) ? io.profiles[0] : io.profiles
        };
      });

      setInsertionOrders(processedData);
    } catch (error) {
      console.error('Error in fetchInsertionOrders:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao carregar insertion orders.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const createInsertionOrder = async (orderData: {
    client_name: string;
    description?: string;
    start_date?: string;
    end_date?: string;
  }) => {
    if (!user) return { error: 'Usuário não autenticado' };

    try {
      const { data, error } = await supabase
        .from('insertion_orders')
        .insert([{
          ...orderData,
          user_id: user.id,
          status: 'active'
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating insertion order:', error);
        return { error: 'Erro ao criar insertion order' };
      }

      // Refresh the list
      fetchInsertionOrders();
      return { data, error: null };
    } catch (error) {
      console.error('Error in createInsertionOrder:', error);
      return { error: 'Erro inesperado ao criar insertion order' };
    }
  };

  const updateInsertionOrder = async (id: string, updates: Partial<InsertionOrder>) => {
    if (!user) return { error: 'Usuário não autenticado' };

    try {
      const { data, error } = await supabase
        .from('insertion_orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating insertion order:', error);
        return { error: 'Erro ao atualizar insertion order' };
      }

      // Refresh the list
      fetchInsertionOrders();
      return { data, error: null };
    } catch (error) {
      console.error('Error in updateInsertionOrder:', error);
      return { error: 'Erro inesperado ao atualizar insertion order' };
    }
  };

  const deleteInsertionOrder = async (id: string) => {
    if (!user) return { error: 'Usuário não autenticado' };

    try {
      const { error } = await supabase
        .from('insertion_orders')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting insertion order:', error);
        return { error: 'Erro ao deletar insertion order' };
      }

      // Refresh the list
      fetchInsertionOrders();
      return { error: null };
    } catch (error) {
      console.error('Error in deleteInsertionOrder:', error);
      return { error: 'Erro inesperado ao deletar insertion order' };
    }
  };

  useEffect(() => {
    fetchInsertionOrders();
  }, [fetchInsertionOrders]);

  return {
    insertionOrders,
    loading,
    fetchInsertionOrders,
    createInsertionOrder,
    updateInsertionOrder,
    deleteInsertionOrder
  };
};