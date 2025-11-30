import { MigrationBuilder, PgType } from "node-pg-migrate";

const TABLE_NAME = "message";

export async function up(pgm: MigrationBuilder): Promise<void> {
    pgm.createTable(TABLE_NAME, {
        id: "id",
        user_id: {
            type: PgType.INTEGER,
            notNull: true,
            references: "users(id)",
            onDelete: "CASCADE",
        },
        game_id: {
            type: PgType.INTEGER,
            notNull: true,
            references: "game(id)",
            onDelete: "CASCADE",
        },
        sent_at: {
            type: PgType.TIMESTAMP,
            notNull: true,
            default: pgm.func("current_timestamp"),
        },
        message: {
            type: PgType.VARCHAR,
            notNull: true,
        },
    });

    pgm.createIndex(TABLE_NAME, ["game_id", "sent_at"]);
    pgm.createIndex(TABLE_NAME, "user_id");
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable(TABLE_NAME);
}
