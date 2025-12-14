export const CREATE_MESSAGE = `
WITH new_message AS (
  INSERT INTO chat_messages (user_id, game_id, message)
  VALUES ($1, $2, $3)
  RETURNING *
)
SELECT
  new_message.*,
  users.username,
  users.email
FROM new_message
JOIN users ON users.id = new_message.user_id
`;

export const RECENT_MESSAGES = `
SELECT *
FROM (
  SELECT chat_messages.*, users.username, users.email
  FROM chat_messages
  JOIN users ON users.id = chat_messages.user_id
  WHERE (
    ($2::int IS NULL AND chat_messages.game_id IS NULL)
    OR chat_messages.game_id = $2
  )
  ORDER BY chat_messages.created_at DESC, chat_messages.id DESC
  LIMIT $1
) recent
ORDER BY recent.created_at ASC, recent.id ASC
`;
