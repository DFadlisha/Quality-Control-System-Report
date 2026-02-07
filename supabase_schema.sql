-- ============================================
-- QCSR Supabase Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. Parts Master Table
-- ============================================
CREATE TABLE IF NOT EXISTS parts_master (
    part_no TEXT PRIMARY KEY,
    part_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_parts_master_part_name ON parts_master(part_name);

-- ============================================
-- 2. Sorting Logs Table
-- ============================================
CREATE TABLE IF NOT EXISTS sorting_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    part_no TEXT NOT NULL,
    part_name TEXT NOT NULL,
    quantity_sorted INTEGER NOT NULL DEFAULT 0,
    quantity_ng INTEGER NOT NULL DEFAULT 0,
    supplier TEXT NOT NULL,
    factory_location TEXT NOT NULL,
    operators TEXT[] NOT NULL DEFAULT '{}',
    remarks TEXT DEFAULT '',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    pdf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sorting_logs_part_no ON sorting_logs(part_no);
CREATE INDEX IF NOT EXISTS idx_sorting_logs_timestamp ON sorting_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sorting_logs_supplier ON sorting_logs(supplier);
CREATE INDEX IF NOT EXISTS idx_sorting_logs_factory_location ON sorting_logs(factory_location);

-- ============================================
-- 3. NG Details Table (Defect Details)
-- ============================================
CREATE TABLE IF NOT EXISTS ng_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sorting_log_id UUID NOT NULL REFERENCES sorting_logs(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    operator_name TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for foreign key lookups
CREATE INDEX IF NOT EXISTS idx_ng_details_sorting_log_id ON ng_details(sorting_log_id);

-- ============================================
-- 4. Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE parts_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE sorting_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ng_details ENABLE ROW LEVEL SECURITY;

-- Allow public read access (adjust based on your security needs)
CREATE POLICY "Allow public read access on parts_master"
    ON parts_master FOR SELECT
    USING (true);

CREATE POLICY "Allow public read access on sorting_logs"
    ON sorting_logs FOR SELECT
    USING (true);

CREATE POLICY "Allow public read access on ng_details"
    ON ng_details FOR SELECT
    USING (true);

-- Allow public insert (for now - you can add auth later)
CREATE POLICY "Allow public insert on parts_master"
    ON parts_master FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow public insert on sorting_logs"
    ON sorting_logs FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow public insert on ng_details"
    ON ng_details FOR INSERT
    WITH CHECK (true);

-- Allow public update
CREATE POLICY "Allow public update on parts_master"
    ON parts_master FOR UPDATE
    USING (true);

CREATE POLICY "Allow public update on sorting_logs"
    ON sorting_logs FOR UPDATE
    USING (true);

-- Allow public delete (for admin utilities)
CREATE POLICY "Allow public delete on sorting_logs"
    ON sorting_logs FOR DELETE
    USING (true);

CREATE POLICY "Allow public delete on ng_details"
    ON ng_details FOR DELETE
    USING (true);

-- ============================================
-- 5. Functions and Triggers
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for parts_master
CREATE TRIGGER update_parts_master_updated_at
    BEFORE UPDATE ON parts_master
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for sorting_logs
CREATE TRIGGER update_sorting_logs_updated_at
    BEFORE UPDATE ON sorting_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. Sample Data (Optional)
-- ============================================

-- Insert sample parts
INSERT INTO parts_master (part_no, part_name) VALUES
    ('PART-001', 'Engine Component A'),
    ('PART-002', 'Transmission Gear B'),
    ('PART-003', 'Brake Pad C')
ON CONFLICT (part_no) DO NOTHING;

-- ============================================
-- 7. Useful Views
-- ============================================

-- View to get sorting logs with NG details count
CREATE OR REPLACE VIEW sorting_logs_summary AS
SELECT 
    sl.id,
    sl.part_no,
    sl.part_name,
    sl.quantity_sorted,
    sl.quantity_ng,
    sl.supplier,
    sl.factory_location,
    sl.operators,
    sl.remarks,
    sl.timestamp,
    sl.pdf_url,
    COUNT(nd.id) as ng_details_count
FROM sorting_logs sl
LEFT JOIN ng_details nd ON sl.id = nd.sorting_log_id
GROUP BY sl.id;

-- ============================================
-- 8. Storage Buckets Setup (via Dashboard)
-- ============================================
-- Note: Storage buckets must be created via Supabase Dashboard
-- 1. Go to Storage in Supabase Dashboard
-- 2. Create bucket: "rejected-parts" (public)
-- 3. Create bucket: "reports" (public)

-- Storage policies (run after creating buckets)
-- These allow public access to storage buckets

-- For rejected-parts bucket
-- CREATE POLICY "Public Access"
-- ON storage.objects FOR SELECT
-- USING ( bucket_id = 'rejected-parts' );

-- CREATE POLICY "Public Upload"
-- ON storage.objects FOR INSERT
-- WITH CHECK ( bucket_id = 'rejected-parts' );

-- For reports bucket
-- CREATE POLICY "Public Access"
-- ON storage.objects FOR SELECT
-- USING ( bucket_id = 'reports' );

-- CREATE POLICY "Public Upload"
-- ON storage.objects FOR INSERT
-- WITH CHECK ( bucket_id = 'reports' );

-- ============================================
-- 9. Analytics Queries (for future use)
-- ============================================

-- Total logs per part
CREATE OR REPLACE VIEW logs_per_part AS
SELECT 
    part_no,
    part_name,
    COUNT(*) as total_logs,
    SUM(quantity_sorted) as total_sorted,
    SUM(quantity_ng) as total_ng,
    ROUND(AVG(quantity_ng::DECIMAL / NULLIF(quantity_sorted, 0) * 100), 2) as avg_ng_percentage
FROM sorting_logs
GROUP BY part_no, part_name
ORDER BY total_logs DESC;

-- Logs per supplier
CREATE OR REPLACE VIEW logs_per_supplier AS
SELECT 
    supplier,
    COUNT(*) as total_logs,
    SUM(quantity_sorted) as total_sorted,
    SUM(quantity_ng) as total_ng
FROM sorting_logs
GROUP BY supplier
ORDER BY total_logs DESC;

-- ============================================
-- Setup Complete!
-- ============================================
-- Next steps:
-- 1. Create storage buckets in Supabase Dashboard
-- 2. Update .env file with Supabase credentials
-- 3. Run flutter pub get
-- 4. Test the application
