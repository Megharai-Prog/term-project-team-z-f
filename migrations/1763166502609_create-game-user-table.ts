import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
    pgm.createTable("game_user", {
        id: "id",
        game_id: {
            type: "integer",
            notNull: true,
            references: "'games'",
            onDelete: "CASCADE",
        },
        user_id: {
            type: "integer",
            notNull: true,
            references: "'users'",
            onDelete: "CASCADE",
        },
        hand_count: {
            type: "integer"
        },
        seat_at: {
            type: "integer"
        },
    });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    pgm.dropTable("game_user");
}
