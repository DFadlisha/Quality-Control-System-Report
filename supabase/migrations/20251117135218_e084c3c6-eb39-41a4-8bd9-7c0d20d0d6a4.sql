-- Create parts master table
CREATE TABLE public.parts_master (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  part_no TEXT NOT NULL UNIQUE,
  part_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sorting logs table
CREATE TABLE public.sorting_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  part_no TEXT NOT NULL,
  part_name TEXT NOT NULL,
  quantity_all_sorting INTEGER NOT NULL,
  quantity_ng INTEGER NOT NULL,
  logged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.parts_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sorting_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for parts_master (read-only for all)
CREATE POLICY "Anyone can view parts"
ON public.parts_master
FOR SELECT
USING (true);

-- Create policies for sorting_logs (anyone can insert and view)
CREATE POLICY "Anyone can insert sorting logs"
ON public.sorting_logs
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view sorting logs"
ON public.sorting_logs
FOR SELECT
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates on parts_master
CREATE TRIGGER update_parts_master_updated_at
BEFORE UPDATE ON public.parts_master
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample parts data
INSERT INTO public.parts_master (part_no, part_name) VALUES
  ('P001-A123', 'Brake Pad Assembly'),
  ('P002-B456', 'Oil Filter Standard'),
  ('P003-C789', 'Air Filter Premium'),
  ('P004-D012', 'Spark Plug Set'),
  ('P005-E345', 'Fuel Pump Module'),
  ('P006-F678', 'Transmission Seal Kit'),
  ('P007-G901', 'Radiator Cap Assembly'),
  ('P008-H234', 'Timing Belt Premium'),
  ('P009-I567', 'Water Pump Complete'),
  ('P010-J890', 'Alternator Bearing Set');

-- Create index for faster part_no lookups
CREATE INDEX idx_parts_master_part_no ON public.parts_master(part_no);
CREATE INDEX idx_sorting_logs_logged_at ON public.sorting_logs(logged_at DESC);
CREATE INDEX idx_sorting_logs_part_no ON public.sorting_logs(part_no);