/*
# Add email/role columns and create missing tables

1. Modified Tables
- `Anggota`
  - ADD `email` (text, nullable) — used to match Supabase Auth users to Anggota records
  - ADD `role` (text, nullable, default 'member') — access control: 'admin' or 'member'
2. New Tables
- `Iuran`
  - `id` (uuid, primary key, auto-generated)
  - `id_anggota` (uuid, foreign key → Anggota.id ON DELETE CASCADE)
  - `tahun` (text, not null) — year of the annual dues, e.g. '2026'
  - `nominal` (text, not null) — amount in rupiah as text
  - `status_pembayaran` (text, not null, default 'Belum Bayar') — 'Lunas' or 'Belum Bayar'
  - `created_at` (timestamptz, default now())
- `Donasi`
  - `id` (uuid, primary key, auto-generated)
  - `id_anggota` (uuid, foreign key → Anggota.id ON DELETE CASCADE)
  - `nama_acara` (text, not null) — event/occasion name for the donation
  - `nominal` (text, not null) — amount in rupiah as text
  - `tanggal` (date, not null) — date of the donation
  - `created_at` (timestamptz, default now())
- `Pengalaman`
  - `id` (uuid, primary key, auto-generated)
  - `id_anggota` (uuid, foreign key → Anggota.id ON DELETE CASCADE)
  - `nama_kapal` (text, not null) — ship name
  - `nama_perusahaan` (text, nullable) — company name
  - `jenis_kapal` (text, nullable) — ship type (Cargo, Tanker, Container, etc.)
  - `rute` (text, nullable) — route: 'NCV' or 'Foreign Going'
  - `durasi` (text, nullable) — duration string, e.g. '8 Bulan 1 Tahun'
  - `created_at` (timestamptz, default now())
- `Pengeluaran`
  - `id` (uuid, primary key, auto-generated)
  - `nama_pengeluaran` (text, not null) — expense description
  - `nominal` (text, not null) — amount in rupiah as text
  - `tanggal` (date, not null) — date of the expense
  - `created_at` (timestamptz, default now())
3. Security
- Enable RLS on all new tables.
- All tables use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`
  because this is a shared community app where all members can view and manage
  the data (no per-user isolation on these tables).
- Anggota existing RLS policies already allow anon+authenticated CRUD; the new
  columns inherit those policies automatically.
4. Important Notes
  1. The `email` column is nullable so existing Anggota rows are not affected.
  2. The `role` column defaults to 'member' so any new insert without an
     explicit role gets 'member'.
  3. Foreign keys use ON DELETE CASCADE so deleting an Anggota row cleans up
     their Iuran, Donasi, and Pengalaman records automatically.
  4. `nominal` columns are text to match the existing app convention.
*/

-- Add email and role columns to Anggota
ALTER TABLE "Anggota" ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE "Anggota" ADD COLUMN IF NOT EXISTS "role" text DEFAULT 'member';

-- Create Iuran table
CREATE TABLE IF NOT EXISTS "Iuran" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "id_anggota" uuid NOT NULL REFERENCES "Anggota"("id") ON DELETE CASCADE,
  "tahun" text NOT NULL,
  "nominal" text NOT NULL,
  "status_pembayaran" text NOT NULL DEFAULT 'Belum Bayar',
  "created_at" timestamptz DEFAULT now()
);

ALTER TABLE "Iuran" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_iuran" ON "Iuran";
CREATE POLICY "anon_select_iuran" ON "Iuran" FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_iuran" ON "Iuran";
CREATE POLICY "anon_insert_iuran" ON "Iuran" FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_iuran" ON "Iuran";
CREATE POLICY "anon_update_iuran" ON "Iuran" FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_iuran" ON "Iuran";
CREATE POLICY "anon_delete_iuran" ON "Iuran" FOR DELETE
  TO anon, authenticated USING (true);

-- Create Donasi table
CREATE TABLE IF NOT EXISTS "Donasi" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "id_anggota" uuid NOT NULL REFERENCES "Anggota"("id") ON DELETE CASCADE,
  "nama_acara" text NOT NULL,
  "nominal" text NOT NULL,
  "tanggal" date NOT NULL,
  "created_at" timestamptz DEFAULT now()
);

ALTER TABLE "Donasi" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_donasi" ON "Donasi";
CREATE POLICY "anon_select_donasi" ON "Donasi" FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_donasi" ON "Donasi";
CREATE POLICY "anon_insert_donasi" ON "Donasi" FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_donasi" ON "Donasi";
CREATE POLICY "anon_update_donasi" ON "Donasi" FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_donasi" ON "Donasi";
CREATE POLICY "anon_delete_donasi" ON "Donasi" FOR DELETE
  TO anon, authenticated USING (true);

-- Create Pengalaman table
CREATE TABLE IF NOT EXISTS "Pengalaman" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "id_anggota" uuid NOT NULL REFERENCES "Anggota"("id") ON DELETE CASCADE,
  "nama_kapal" text NOT NULL,
  "nama_perusahaan" text,
  "jenis_kapal" text,
  "rute" text,
  "durasi" text,
  "created_at" timestamptz DEFAULT now()
);

ALTER TABLE "Pengalaman" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_pengalaman" ON "Pengalaman";
CREATE POLICY "anon_select_pengalaman" ON "Pengalaman" FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_pengalaman" ON "Pengalaman";
CREATE POLICY "anon_insert_pengalaman" ON "Pengalaman" FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_pengalaman" ON "Pengalaman";
CREATE POLICY "anon_update_pengalaman" ON "Pengalaman" FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_pengalaman" ON "Pengalaman";
CREATE POLICY "anon_delete_pengalaman" ON "Pengalaman" FOR DELETE
  TO anon, authenticated USING (true);

-- Create Pengeluaran table
CREATE TABLE IF NOT EXISTS "Pengeluaran" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "nama_pengeluaran" text NOT NULL,
  "nominal" text NOT NULL,
  "tanggal" date NOT NULL,
  "created_at" timestamptz DEFAULT now()
);

ALTER TABLE "Pengeluaran" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_pengeluaran" ON "Pengeluaran";
CREATE POLICY "anon_select_pengeluaran" ON "Pengeluaran" FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_pengeluaran" ON "Pengeluaran";
CREATE POLICY "anon_insert_pengeluaran" ON "Pengeluaran" FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_pengeluaran" ON "Pengeluaran";
CREATE POLICY "anon_update_pengeluaran" ON "Pengeluaran" FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_pengeluaran" ON "Pengeluaran";
CREATE POLICY "anon_delete_pengeluaran" ON "Pengeluaran" FOR DELETE
  TO anon, authenticated USING (true);

-- Add index on id_anggota for faster joins on child tables
CREATE INDEX IF NOT EXISTS "iuran_id_anggota_idx" ON "Iuran"("id_anggota");
CREATE INDEX IF NOT EXISTS "donasi_id_anggota_idx" ON "Donasi"("id_anggota");
CREATE INDEX IF NOT EXISTS "pengalaman_id_anggota_idx" ON "Pengalaman"("id_anggota");

-- Seed sample Iuran data for existing anggota (current year and previous year)
INSERT INTO "Iuran" ("id_anggota", "tahun", "nominal", "status_pembayaran")
SELECT a.id, '2025', '300000', 'Belum Bayar'
FROM "Anggota" a
WHERE NOT EXISTS (
  SELECT 1 FROM "Iuran" i WHERE i.id_anggota = a.id AND i.tahun = '2025'
)
LIMIT 4;

INSERT INTO "Iuran" ("id_anggota", "tahun", "nominal", "status_pembayaran")
SELECT a.id, '2026', '300000', 'Lunas'
FROM "Anggota" a
WHERE NOT EXISTS (
  SELECT 1 FROM "Iuran" i WHERE i.id_anggota = a.id AND i.tahun = '2026'
)
LIMIT 3;

-- Seed sample Pengeluaran
INSERT INTO "Pengeluaran" ("nama_pengeluaran", "nominal", "tanggal")
SELECT 'Belanja Bulanan Mess', '150000', '2026-07-01'
WHERE NOT EXISTS (SELECT 1 FROM "Pengeluaran" WHERE nama_pengeluaran = 'Belanja Bulanan Mess');

INSERT INTO "Pengeluaran" ("nama_pengeluaran", "nominal", "tanggal")
SELECT 'Perbaikan AC', '200000', '2026-07-15'
WHERE NOT EXISTS (SELECT 1 FROM "Pengeluaran" WHERE nama_pengeluaran = 'Perbaikan AC');
