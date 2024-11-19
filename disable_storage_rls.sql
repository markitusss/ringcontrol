-- Disable RLS for storage bucket
ALTER TABLE storage.buckets DISABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Grant full access to authenticated users
GRANT ALL ON storage.buckets TO authenticated;
GRANT ALL ON storage.objects TO authenticated;

-- Create public policies without restrictions
CREATE POLICY "Public Access" ON storage.buckets
    FOR ALL USING (true);

CREATE POLICY "Public Access" ON storage.objects
    FOR ALL USING (true);

-- Update bucket settings to be public
UPDATE storage.buckets 
SET public = true 
WHERE name = 'company-logos';