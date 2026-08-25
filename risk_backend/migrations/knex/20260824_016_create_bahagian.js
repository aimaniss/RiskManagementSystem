// Migration: Create bahagian (Division/Unit reference) table
// Created: 2026-08-24

export async function up(knex) {
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS bahagian (
        bahagian_id SERIAL PRIMARY KEY,
        nama_bahagian VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await knex.raw(`
    INSERT INTO bahagian (nama_bahagian) VALUES
        ('Pentadbiran'),
        ('Kewangan'),
        ('Operasi'),
        ('Sumber Manusia'),
        ('Pemasaran'),
        ('Teknologi Maklumat')
    ON CONFLICT (nama_bahagian) DO NOTHING;
  `);
}

export async function down(knex) {
  await knex.raw(`DROP TABLE IF EXISTS bahagian;`);
}
