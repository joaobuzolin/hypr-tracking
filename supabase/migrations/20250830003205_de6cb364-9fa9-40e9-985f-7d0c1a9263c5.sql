-- Add foreign key constraint between insertion_orders.user_id and profiles.id
ALTER TABLE public.insertion_orders 
ADD CONSTRAINT insertion_orders_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Remove the project_name column since projects are now campaigns
ALTER TABLE public.insertion_orders 
DROP COLUMN IF EXISTS project_name;