/*
# Create Anggota table (single-tenant, no auth)

1. New Tables
- `Anggota`
  - `id` (uuid, primary key, auto-generated)
  - `nama` (text, not null) — nama anggota
  - `jabatan` (text) — jabatan/posisi anggota
  - `nama_pt` (text) — nama perusahaan tempat anggota bekerja
  - `status_bekerja` (text) — status kerja: Onboard, Standby, Cuti, dll.
  - `info_kontak` (text) — informasi kontak anggota
  - `pengalaman_kerja` (text) — ringkasan pengalaman kerja
  - `created_at` (timestamptz, default now())
2. Security
- Enable RLS on `Anggota`.
- Allow anon + authenticated CRUD because the data is intentionally shared/public (no sign-in screen).
3. Notes
- This is a single-tenant app with no authentication, so policies use `TO anon, authenticated`.
- Seed data is inserted so the dashboard is not empty on first load.
*/

CREATE TABLE IF NOT EXISTS "Anggota" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "nama" text NOT NULL,
  "jabatan" text,
  "nama_pt" text,
  "status_bekerja" text,
  "info_kontak" text,
  "pengalaman_kerja" text,
  "created_at" timestamptz DEFAULT now()
);

ALTER TABLE "Anggota" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_anggota" ON "Anggota";
CREATE POLICY "anon_select_anggota" ON "Anggota" FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_anggota" ON "Anggota";
CREATE POLICY "anon_insert_anggota" ON "Anggota" FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_anggota" ON "Anggota";
CREATE POLICY "anon_update_anggota" ON "Anggota" FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_anggota" ON "Anggota";
CREATE POLICY "anon_delete_anggota" ON "Anggota" FOR DELETE
  TO anon, authenticated USING (true);

-- Seed data
INSERT INTO "Anggota" ("nama", "jabatan", "nama_pt", "status_bekerja", "info_kontak", "pengalaman_kerja") VALUES
('Budi Santoso', 'Kepala Mess', 'PT Maritim Jaya', 'Onboard', '081234567890', '15 tahun di industri maritim, 5 tahun sebagai kepala mess'),
('Andi Wijaya', 'Masinis', 'PT Pelayaran Nusantara', 'Onboard', '081298765432', '10 tahun pengalaman sebagai masinis kapal cargo'),
('Citra Lestari', 'ABK', 'PT Samudra Mandiri', 'Standby', '081345678901', '3 tahun sebagai ABK di kapal tanker'),
('Dedi Pratama', 'Officer', 'PT Bahari Sejahtera', 'Cuti', '081456789012', '8 tahun sebagai deck officer'),
('Eko Nugroho', 'Masinis', 'PT Maritim Jaya', 'Standby', '081567890123', '6 tahun pengalaman mesin kapal'),
('Fajar Hidayat', 'ABK', 'PT Pelayaran Nusantara', 'Onboard', '081678901234', '2 tahun sebagai ABK'),
('Gilang Ramadhan', 'Kepala Mess', 'PT Samudra Mandiri', 'Cuti', '081789012345', '12 tahun di industri maritim'),
('Hadi Sutrisno', 'Officer', 'PT Bahari Sejahtera', 'Onboard', '081890123456', '7 tahun sebagai chief officer')
ON CONFLICT DO NOTHING;
