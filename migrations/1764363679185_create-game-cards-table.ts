import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

const TABLE_NAME = "game_cards";

export async function up(pgm: MigrationBuilder): Promise<void> {
    pgm.createType('card_pile', ['Draw', 'Discard', 'Hand']);

    pgm.createTable(TABLE_NAME, {
        id: 'id',
        game_id: {
            type: 'integer',
            notNull: true,
            references: 'games(id)',
            onDelete: 'CASCADE',
        },
        card_id: {
            type: 'integer',
            notNull: true,
            references: 'card(id)',
            onDelete: 'CASCADE',
        },
        card_pile: {
            type: 'card_pile',
            notNull: true,
        },
        owned_by: {
            type: 'integer',
            notNull: false,
            comment: 'Player ID when in Hand; NULL when in Draw or Discard piles',
        },
        order: {
            type: 'integer',
            notNull: false,
            comment: 'Position within its pile or hand (top of draw pile, hand ordering, etc.)',
        },
    });

    // Indexes for fast lookups
    pgm.createIndex(TABLE_NAME, 'game_id');
    pgm.createIndex(TABLE_NAME, ['game_id', 'card_pile']);
    pgm.createIndex(TABLE_NAME, ['game_id', 'owned_by']);
    pgm.createIndex(TABLE_NAME, ['game_id', 'card_pile', 'order']);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    pgm.dropTable(TABLE_NAME);
    pgm.dropType('card_pile');
}
