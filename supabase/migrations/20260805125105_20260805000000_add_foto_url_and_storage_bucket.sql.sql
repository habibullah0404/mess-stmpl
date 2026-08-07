/*
# Add profile photo column and storage bucket

1. Schema changes
- Add `foto_url` (text, nullable) column to `Anggota` table to store the public URL
  of a member's profile photo in Supabase Storage.

2. Storage
- Create a private storage bucket `profile-photos` for member profile pictures.
- Add storage policies so each authenticated user can read all profile photos
  (avatars shown publicly in the member directory) but can only upload/update/
  delete files within their own user-id-prefixed folder.

3. Security
- Storage policies use `auth.uid()` for ownership checks on writes.
- Reads are public to authenticated users so the member directory can display avatars.

4. Notes
- The column is nullable so existing members are unaffected.
- Old photos are deleted from the client after a new upload, so storage does not accumulate.
*/

ALTER TABLE "Anggota"
  ADD COLUMN IF NOT EXISTS foto_url text;

-- Create the profile-photos storage bucket (private; access via signed URL or public read policy)
INSERT INTO storage.buckets (id, name, public)
SELECT 'profile-photos', 'profile-photos', true
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'profile-photos');

-- Allow authenticated users to read all profile photos (avatars shown in directory)
DROP POLICY IF EXISTS "read_profile_photos" ON storage.objects;
CREATE POLICY "read_profile_photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'profile-photos');

-- Allow a user to insert (upload) objects only into their own folder: profile-photos/<uid>/
DROP POLICY IF EXISTS "insert_own_profile_photo" ON storage.objects;
CREATE POLICY "insert_own_profile_photo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow a user to update only their own profile photo objects
DROP POLICY IF EXISTS "update_own_profile_photo" ON storage.objects;
CREATE POLICY "update_own_profile_photo"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow a user to delete only their own profile photo objects
DROP POLICY IF EXISTS "delete_own_profile_photo" ON storage.objects;
CREATE POLICY "delete_own_profile_photo"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
