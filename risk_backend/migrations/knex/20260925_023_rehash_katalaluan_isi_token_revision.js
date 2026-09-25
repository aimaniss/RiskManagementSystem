// Migration 023:
// 1) Tukar semua kata laluan legasi plain-text kepada bcrypt (tanpa reset —
//    pengguna log masuk dengan kata laluan yang sama). Sebelum ini hanya
//    berlaku secara rehash-on-login, jadi pengguna yang tidak log masuk
//    kekal plain-text di DB.
// 2) Isi `token_dikemaskini_at` yang NULL dan tetapkan lalai NOW(), supaya
//    token setiap pengguna boleh dicabut. Kesan: token sedia ada (tanpa claim)
//    ditolak sekali — semua pengguna perlu log masuk semula.
import { hashKatalaluan, perluRehash } from "../../utils/katalaluan.js";

export async function up(knex) {
  const pengguna = await knex("pengguna")
    .select("pengguna_id", "katalaluan")
    .whereNotNull("katalaluan");

  for (const { pengguna_id, katalaluan } of pengguna) {
    if (!perluRehash(katalaluan)) continue;
    await knex("pengguna")
      .where({ pengguna_id })
      .update({ katalaluan: await hashKatalaluan(katalaluan) });
  }

  await knex("pengguna")
    .whereNull("token_dikemaskini_at")
    .update({ token_dikemaskini_at: knex.fn.now() });
  await knex.raw("ALTER TABLE pengguna ALTER COLUMN token_dikemaskini_at SET DEFAULT NOW()");
}

export async function down(knex) {
  // Hash bcrypt tidak boleh dipulihkan kepada plain-text (sengaja).
  await knex.raw("ALTER TABLE pengguna ALTER COLUMN token_dikemaskini_at DROP DEFAULT");
}
