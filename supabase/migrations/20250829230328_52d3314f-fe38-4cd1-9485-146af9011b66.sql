-- Enable realtime for events table
ALTER TABLE public.events REPLICA IDENTITY FULL;

-- Add the table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;