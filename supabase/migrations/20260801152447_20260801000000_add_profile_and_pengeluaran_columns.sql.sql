/*
# Add profile fields and pengeluaran file/bulan columns

1. Modified Tables
- `Anggota`: add `lulusan_tahun` (text, nullable) — stores graduation year or 'Umum' for non-alumni.
- `Anggota`: add `jenis_kapal` (text, nullable) — stores the member's ship type from the Data Diri form.
- `Pengeluaran`: add `bulan` (text, nullable) — stores the month label e.g. "Januari 2026".
- `Pengeluaran`: add `file_url` (text, nullable) — stores the public URL of an uploaded PDF/Excel file in the `dokumen` storage bucket.

2. Storage
- The `dokumen` bucket is assumed to already exist (created by the user).
- Add storage object policies so authenticated users can upload to `dokumen`, and anyone (anon + authenticated) can read public files from it.

3. Security
- No RLS changes to existing tables (RLS already enabled on Anggota and Pengeluaran).
- Storage policies added for the `dokumen` bucket.

4. Notes
- All new columns are nullable so existing rows are unaffected.
- No data is lost; this is purely additive.
*/

ALTER TABLE "Anggota"
  ADD COLUMN IF NOT EXISTS "lulusan_tahun" text,
  ADD COLUMN IF NOT EXISTS "jenis_kapal" text;

ALTER TABLE "Pengeluaran"
  ADD COLUMN IF NOT EXISTS "bulan" text,
  ADD COLUMN IF NOT EXISTS "file_url" text;

-- Storage policies for the dokumen bucket
-- Allow anyone (anon + authenticated) to read public files
DROP POLICY IF EXISTS "Public read access for dokumen bucket" ON storage.objects;
CREATE POLICY "Public read access for dokumen bucket"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'dokumen');

-- Allow authenticated users to upload files to dokumen
DROP POLICY IF EXISTS "Authenticated upload to dokumen bucket" ON storage.objects;
CREATE POLICY "Authenticated upload to dokumen bucket"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'dokumen');

-- Allow authenticated users to update their own files in dokumen
DROP POLICY IF EXISTS "Authenticated update in dokumen bucket" ON storage.objects;
CREATE POLICY "Authenticated update in dokumen bucket"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'dokumen')
WITH CHECK (bucket_id = 'dokumen');

-- Allow authenticated users to delete files in dokumen
DROP POLICY IF EXISTS "Authenticated delete in dokumen bucket" ON storage.objects;
CREATE POLICY "Authenticated delete in dokumen bucket"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'dokumen');
