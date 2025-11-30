import { MigrationBuilder } from 'node-pg-migrate';

const TABLE_NAME = "card";

export async function up(pgm: MigrationBuilder): Promise<void> {
    pgm.createType('color', ['Red', 'Blue', 'Green', 'Yellow']);
    pgm.createType('kind', ['Number', 'Reverse', 'Skip', 'DrawTwo', 'Wild', 'WildDrawFour']);

    // Create UNO card table
    pgm.createTable(TABLE_NAME, {
        id: 'id',
        number_value: {
            type: 'integer',
            notNull: false,
            comment: '0-9 for number cards; NULL for action/wild cards',
        },
        color: {
            type: 'color',
            notNull: false,
            comment: 'Red, Blue, Green, Yellow; NULL for wild cards',
        },
        kind: {
            type: 'kind',
            notNull: true,
            comment: 'Number, Reverse, Skip, DrawTwo, Wild, WildDrawFour',
        },
    });


    pgm.addConstraint(TABLE_NAME, 'unique_card_face', {
        unique: ['number_value', 'color', 'kind'],
    });

    // Populate canonical UNO faces (NOT physical copies)
    const colors = ['Red', 'Blue', 'Green', 'Yellow'] as const;
    const numberValues = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const actionKinds = ['Reverse', 'Skip', 'DrawTwo'] as const;
    const wildKinds = ['Wild', 'WildDrawFour'] as const;

    // Number cards: 0–9 in each color
    for (const color of colors) {
        for (const value of numberValues) {
        pgm.sql(`
            INSERT INTO card (number_value, color, kind)
            VALUES (${value}, '${color}', 'Number')
        `);
        }
    }

    // Action cards: Reverse, Skip, DrawTwo in each color
    for (const color of colors) {
        for (const kind of actionKinds) {
        pgm.sql(`
            INSERT INTO card (number_value, color, kind)
            VALUES (NULL, '${color}', '${kind}')
        `);
        }
    }

  // Wild cards: colorless
    for (const kind of wildKinds) {
        pgm.sql(`
            INSERT INTO card (number_value, color, kind)
            VALUES (NULL, NULL, '${kind}')
        `);
    }

    // Helpful indexes
    pgm.createIndex(TABLE_NAME, 'kind');
    pgm.createIndex(TABLE_NAME, 'color');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    pgm.dropTable(TABLE_NAME);
    pgm.dropType('kind');
    pgm.dropType('color');
}
