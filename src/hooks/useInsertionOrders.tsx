import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { useInsertionOrdersQuery } from './queries/useInsertionOrdersQuery';
import { useQueryClient } from '@tanstack/react-query';

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
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: insertionOrders = [], isLoading: loading, refetch } = useInsertionOrdersQuery();


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

      // Invalidate queries to refresh
      queryClient.invalidateQueries({ queryKey: ['insertion-orders'] });
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

      // Invalidate queries to refresh
      queryClient.invalidateQueries({ queryKey: ['insertion-orders'] });
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

      // Invalidate queries to refresh
      queryClient.invalidateQueries({ queryKey: ['insertion-orders'] });
      return { error: null };
    } catch (error) {
      console.error('Error in deleteInsertionOrder:', error);
      return { error: 'Erro inesperado ao deletar insertion order' };
    }
  };

  return {
    insertionOrders,
    loading,
    createInsertionOrder,
    updateInsertionOrder,
    deleteInsertionOrder
  };
};