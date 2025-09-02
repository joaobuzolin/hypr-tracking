import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Profile {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export const useProfiles = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('email');

      if (error) {
        console.error('Error fetching profiles:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os usuários.",
          variant: "destructive"
        });
        return;
      }

      setProfiles(data || []);
    } catch (error) {
      console.error('Error in fetchProfiles:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao carregar os usuários.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  return {
    profiles,
    loading,
    refetch: fetchProfiles
  };
};