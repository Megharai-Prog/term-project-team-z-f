import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

const TABLE_NAME = "game";

export async function up(pgm: MigrationBuilder): Promise<void> {
    pgm.createType("status", ["open", "inMatch", "closed"]);
    pgm.createType("privacy", ["public", "private", "friends"]);

    pgm.createTable(TABLE_NAME, {
        id: "id",
        room_id: {
            type: "integer",
            notNull: true
        },
        maxplayers: {
            type: "integer",
            notNull: true,
            default: 4
        },
        status: {
            type: "status",
            notNull: true,
            default: "open"
        },
        privacy: {
            type: "privacy",
            notNull: true,
            default: "public"
        },
        created_at: {
            type: "timestamp",
            notNull: true,
            default: pgm.func("current_timestamp")
        },
    });

    pgm.createIndex("game", "status");
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    pgm.dropTable(TABLE_NAME);
    pgm.dropType("status");
    pgm.dropType("privacy");
}
