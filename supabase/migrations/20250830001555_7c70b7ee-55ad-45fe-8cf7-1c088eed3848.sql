-- Create insertion_orders table
CREATE TABLE public.insertion_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_name TEXT NOT NULL,
  project_name TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.insertion_orders ENABLE ROW LEVEL SECURITY;

-- Create policies for insertion_orders
CREATE POLICY "Authenticated users can view all insertion orders" 
ON public.insertion_orders 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create insertion orders" 
ON public.insertion_orders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update all insertion orders" 
ON public.insertion_orders 
FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can delete all insertion orders" 
ON public.insertion_orders 
FOR DELETE 
USING (true);

-- Add insertion_order_id to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN insertion_order_id UUID REFERENCES public.insertion_orders(id) ON DELETE CASCADE;

-- Create trigger for automatic timestamp updates on insertion_orders
CREATE TRIGGER update_insertion_orders_updated_at
BEFORE UPDATE ON public.insertion_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_campaigns_insertion_order_id ON public.campaigns(insertion_order_id);
CREATE INDEX idx_insertion_orders_user_id ON public.insertion_orders(user_id);
CREATE INDEX idx_insertion_orders_status ON public.insertion_orders(status);