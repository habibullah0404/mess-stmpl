/*
# Create Pengaturan table + add is_verified to Anggota

1. New Table
- Pengaturan: key-value store for app settings (pengumuman, rekening, etc.)
- Columns: id (serial PK), kunci (text, unique), nilai (text)

2. Modified Table
- Anggota: add is_verified boolean column (default false)

3. Notes
- Follows existing project pattern: no RLS (client-side access control).
- No data lost; purely additive.
*/

CREATE TABLE IF NOT EXISTS "Pengaturan" (
  id SERIAL PRIMARY KEY,
  kunci TEXT UNIQUE NOT NULL,
  nilai TEXT
);

ALTER TABLE "Anggota"
  ADD COLUMN IF NOT EXISTS "is_verified" boolean NOT NULL DEFAULT false;
