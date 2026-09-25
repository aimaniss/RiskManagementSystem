export async function up(knex) {
  if (!(await knex.schema.hasColumn("pengguna", "token_dikemaskini_at"))) {
    await knex.schema.alterTable("pengguna", (table) => {
      table.timestamp("token_dikemaskini_at");
    });
  }
}

export async function down(knex) {
  if (await knex.schema.hasColumn("pengguna", "token_dikemaskini_at")) {
    await knex.schema.alterTable("pengguna", (table) => {
      table.dropColumn("token_dikemaskini_at");
    });
  }
}
