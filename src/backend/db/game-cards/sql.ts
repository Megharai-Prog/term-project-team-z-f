export const RESET_GAME_CARDS = `
DELETE FROM game_cards
WHERE game_id = $1
`;

// Create shuffled deck (UNO) - inserts 108 cards into game_cards
export const CREATE_DECK = `
INSERT INTO game_cards (game_id, card_id, card_pile, owned_by, "order")
SELECT
  $1,
  c.id,
  'Draw'::card_pile,
  NULL,
  ROW_NUMBER() OVER (ORDER BY RANDOM())
FROM card c
JOIN LATERAL generate_series(
  1,
  CASE
    WHEN c.kind = 'Number' AND c.number_value = 0 THEN 1
    WHEN c.kind = 'Number' AND c.number_value BETWEEN 1 AND 9 THEN 2
    WHEN c.kind IN ('Reverse', 'Skip', 'DrawTwo') THEN 2
    WHEN c.kind IN ('Wild', 'WildDrawFour') THEN 4
    ELSE 1
  END
) AS gs(n) ON TRUE
`;

// Fetch N cards from deck (for dealing)
export const GET_CARDS_FROM_DECK = `
SELECT id
FROM game_cards
WHERE game_id = $1 AND card_pile = 'Draw'
ORDER BY "order" ASC
LIMIT $2
`;

// Moves a batch of draw cards into a player’s hand
export const DEAL_CARDS = `
UPDATE game_cards
SET card_pile = 'Hand', owned_by = $2, "order" = NULL
WHERE id = ANY($1)
`;

// Get cards with details from a player’s hand
export const GET_CARDS_BY_OWNER = `
SELECT
  gc.id,
  gc.game_id,
  gc.card_id,
  gc.owned_by AS owner_id,
  c.kind,
  c.color,
  c.number_value
FROM game_cards gc
JOIN card c ON gc.card_id = c.id
WHERE gc.game_id = $1
  AND gc.card_pile = 'Hand'
  AND gc.owned_by = $2
ORDER BY gc."order" ASC NULLS LAST, gc.id ASC
`;

// Count cards by owner (deck if owner_id=0, otherwise player's hand count)
export const COUNT_BY_OWNER = `
SELECT COUNT(*)::int AS count
FROM game_cards
WHERE game_id = $1 AND (
  ($2 = 0 AND card_pile = 'Draw')
  OR
  ($2 <> 0 AND card_pile = 'Hand' AND owned_by = $2)
)
`;

// Changes ownership of a batch of cards
export const TRANSFER_CARDS = `
UPDATE game_cards
SET owned_by = $2
WHERE id = ANY($1)
`;

// Draws exactly one card from the draw pile
export const DRAW_CARD = `
UPDATE game_cards
SET card_pile = 'Hand',
    owned_by = $2,
    "order" = NULL
WHERE id = (
  SELECT id
  FROM game_cards
  WHERE game_id = $1
    AND card_pile = 'Draw'
  ORDER BY "order" ASC
  LIMIT 1
)
RETURNING id
`;

// Peek at the top card of the discard pile without removing it
export const PEEK_TOP_DISCARD_CARD = `
SELECT id FROM game_cards
WHERE game_id = $1 AND card_pile = 'Discard'
ORDER BY "order" ASC
LIMIT 1
`;

// Move card from hand → discard
export const PLAY_CARD = `
UPDATE game_cards
SET card_pile = 'Discard',
    owned_by = NULL,
    "order" = (
      SELECT COALESCE(MAX("order"), 0) + 1
      FROM game_cards
      WHERE game_id = (
        SELECT game_id FROM game_cards WHERE id = $1
      )
    )
WHERE id = $1
RETURNING card_id;

`;

// Peek top discard
export const GET_TOP_DISCARD = `
  SELECT
    gc.id,
    c.kind,
    c.color,
    c.number_value
  FROM game_cards gc
  JOIN card c ON gc.card_id = c.id
  WHERE gc.game_id = $1
    AND gc.card_pile = 'Discard'
  ORDER BY gc."order" DESC
  LIMIT 1;
`;