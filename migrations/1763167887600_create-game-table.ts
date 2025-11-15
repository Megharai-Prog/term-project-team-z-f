import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
    pgm.createTable("game", {
        id: "id",
        room_id: {
            type: "integer",
            notNull: true
        },
        start_time: {
            type: "timestamp"
        },
        maxplayers: {
            type: "integer",
            notNull: true
        },
        // temporary until I implement enums
        status: {
            type: "varchar(50)",
            notNull: true
        },
        // temporary until I implement enums
        privacy: {
            type: "varchar(50)",
            notNull: true
        },
        created_at: {
            type: "timestamp",
            notNull: true,
            default: pgm.func("current_timestamp")
        },
    });
}

export async function down(pgm: MigrationBuilder): Promise<void> {}
