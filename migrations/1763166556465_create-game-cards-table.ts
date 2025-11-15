import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
    pgm.createTable("game_cards", {
        id: "id",
        game_id: {
            type: "integer",
            notNull: true,
            references: "game",
            onDelete: "CASCADE",
        },
        card_id: {
            type: "integer",
            notNull: true,
            references: "card",
            onDelete: "CASCADE",
        },
        // temporary until I implement enums
        card_pile: {
            type: "varchar(20)"
        },
        owned_by: {
            type: "integer",
            references: "users",
            onDelete: "SET NULL",
        },
        order: {
            type: "integer"
        },
    });

}

export async function down(pgm: MigrationBuilder): Promise<void> {
    pgm.dropTable("game_cards");
}
