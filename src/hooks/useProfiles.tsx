import { useProfilesQuery } from './queries/useProfilesQuery';
export type { Profile } from './queries/useProfilesQuery';

export const useProfiles = () => {
  const { data: profiles = [], isLoading: loading, refetch } = useProfilesQuery();

  return {
    profiles,
    loading,
    refetch
  };
};
