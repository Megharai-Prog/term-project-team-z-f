import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
    pgm.createTable("card", {
        id: "id",
        number_value: {
            type: "integer",
            notNull: true
        },
        // temporary until I implement enums
        color: {
            type: "varchar(20)",
            notNull: true
        },
        // temporary until I implement enums
        kind: {
            type: "varchar(20)",
            notNull: true
        },
    });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    pgm.dropTable("card");
}
