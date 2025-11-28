import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

const TABLE_NAME = "game_user";

export async function up(pgm: MigrationBuilder): Promise<void> {
    pgm.createTable(TABLE_NAME, {
        id: "id",
        game_id: {
            type: "integer",
            notNull: true,
            references: 'games(id)',
            onDelete: "CASCADE",
        },
        user_id: {
            type: "integer",
            notNull: true,
            references: 'users(id)',
            onDelete: "CASCADE",
        },
        hand_count: {
            type: "integer"
        },
        seat_at: {
            type: "integer"
        },
    });

    pgm.addConstraint(TABLE_NAME, "unique_game_user", {
        unique: ["game_id", "user_id"],
    });

    pgm.createIndex(TABLE_NAME, "game_id");
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    pgm.dropTable(TABLE_NAME);
}
