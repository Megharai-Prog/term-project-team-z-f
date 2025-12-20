export const CREATE_GAME = `
INSERT INTO games (room_id, maxplayers)
VALUES ($1, $3)
RETURNING *
`;

export const JOIN_GAME = `
INSERT INTO game_players (game_id, user_id)
VALUES ($1, $2)
ON CONFLICT DO NOTHING;
`;

export const LIST_GAMES = `
SELECT 
  g.*,
  COUNT(gp.id) AS player_count,
  COALESCE(
    json_agg(
      json_build_object(
        'user_id', gp.user_id,
        'username', u.username
      )
    ) FILTER (WHERE gp.id IS NOT NULL),
    '[]'
  ) AS players
FROM games g
LEFT JOIN game_players gp ON g.id=gp.game_id
LEFT JOIN users u ON u.id=gp.user_id
WHERE g.status=$1
GROUP BY g.id
ORDER BY g.created_at DESC
LIMIT $2
`;

export const GAMES_BY_USER = `
SELECT games.* FROM game_players, games
WHERE game_players.game_id=games.id AND user_id=$1
`;

export const GAME_BY_ID = `
  SELECT * FROM games WHERE id=$1
`;

export const PLAYERS_FOR_GAME = `
  SELECT
    u.id,
    u.username
  FROM game_players AS gp
  JOIN users AS u ON u.id = gp.user_id
  WHERE gp.game_id = $1
  ORDER BY gp.id ASC
`;
