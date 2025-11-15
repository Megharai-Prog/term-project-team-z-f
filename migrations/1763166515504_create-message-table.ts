import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
    pgm.createTable("message", {
        id: "id",
        user_id: {
            type: "integer",
            notNull: true,
            references: "users",
            onDelete: "CASCADE",
        },
        game_id: {
            type: "integer",
            notNull: true,
            references: "game",
            onDelete: "CASCADE",
        },
        sent_at: {
            type: "timestamp",
            notNull: true,
            default: pgm.func("current_timestamp"),
        },
        message: {
            type: "varchar(500)",
            notNull: true
        },
    });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    pgm.dropTable("message");
}
