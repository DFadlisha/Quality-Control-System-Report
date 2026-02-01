-- 1. Ensure ng_type column exists (Safe to run if already exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sorting_logs' AND column_name='ng_type') THEN
        ALTER TABLE public.sorting_logs ADD COLUMN ng_type text;
    END IF;
END $$;

-- 2. Insert Factories
INSERT INTO public.factories (company_name, location)
VALUES 
    ('NES Manufacturing Hub', 'Bayan Lepas, Penang'),
    ('Global Components', 'Kulim, Kedah'),
    ('Precision Parts Ltd', 'Batu Kawan, Penang')
ON CONFLICT DO NOTHING;

-- 3. Insert Parts
INSERT INTO public.parts_master (part_no, part_name)
VALUES 
    ('PN-1001-A', 'Front Cover Assembly'),
    ('PN-1002-B', 'Back Plate Metal'),
    ('PN-200X-C', 'Sensor Mount'),
    ('PN-3000-Z', 'LED Housing')
ON CONFLICT (part_no) DO NOTHING;

-- 4. Insert Production Status
INSERT INTO public.production_status (label, sub_label, icon_char, color_class, sort_order)
VALUES 
    ('Running', 'Normal Operation', 'R', 'bg-emerald-500', 1),
    ('Maintenance', 'Scheduled Check', 'M', 'bg-amber-500', 2),
    ('Stopped', 'Line Stop / Error', 'S', 'bg-rose-500', 3),
    ('Break', 'Operator Break', 'B', 'bg-blue-500', 4)
ON CONFLICT DO NOTHING;

-- 5. Insert Sorting Logs (Recent data for dashboard visuals)
-- We use subqueries to dynamically get the Factory IDs we just created.
INSERT INTO public.sorting_logs (part_no, quantity_all_sorting, quantity_ng, operator_name, factory_id, ng_type, logged_at)
SELECT 
    'PN-1001-A', 
    150, 
    5, 
    'Ahmad Hafiz', 
    (SELECT id FROM public.factories WHERE company_name = 'NES Manufacturing Hub' LIMIT 1),
    'Scratch',
    NOW() - INTERVAL '2 hours'
WHERE EXISTS (SELECT 1 FROM public.parts_master WHERE part_no = 'PN-1001-A');

INSERT INTO public.sorting_logs (part_no, quantity_all_sorting, quantity_ng, operator_name, factory_id, ng_type, logged_at)
SELECT 
    'PN-1002-B', 
    300, 
    12, 
    'Siti Sarah', 
    (SELECT id FROM public.factories WHERE company_name = 'Global Components' LIMIT 1),
    'Dent',
    NOW() - INTERVAL '4 hours'
WHERE EXISTS (SELECT 1 FROM public.parts_master WHERE part_no = 'PN-1002-B');

INSERT INTO public.sorting_logs (part_no, quantity_all_sorting, quantity_ng, operator_name, factory_id, ng_type, logged_at)
SELECT 
    'PN-200X-C', 
    500, 
    2, 
    'Rajesh Kumar', 
    (SELECT id FROM public.factories WHERE company_name = 'Precision Parts Ltd' LIMIT 1),
    'Color Mismatch',
    NOW() - INTERVAL '30 minutes'
WHERE EXISTS (SELECT 1 FROM public.parts_master WHERE part_no = 'PN-200X-C');

INSERT INTO public.sorting_logs (part_no, quantity_all_sorting, quantity_ng, operator_name, factory_id, ng_type, logged_at)
SELECT 
    'PN-1001-A', 
    200, 
    25, 
    'Alice Wong', 
    (SELECT id FROM public.factories WHERE company_name = 'NES Manufacturing Hub' LIMIT 1),
    'Cracked',
    NOW() - INTERVAL '1 day'
WHERE EXISTS (SELECT 1 FROM public.parts_master WHERE part_no = 'PN-1001-A');
