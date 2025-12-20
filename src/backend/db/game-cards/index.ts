import db from "../connection";
import { CREATE_DECK, GET_CARDS_FROM_DECK, DEAL_CARDS, GET_CARDS_BY_OWNER, COUNT_BY_OWNER, TRANSFER_CARDS, DRAW_CARD, GET_TOP_DISCARD, PLAY_CARD} from "./sql";

const createDeck = async (game_id: number) => db.none(CREATE_DECK, [game_id]);

const getCardsFromDeck = async (game_id: number, n: number) =>
  db.manyOrNone<{ id: number }>(GET_CARDS_FROM_DECK, [game_id, n]);

const dealCards = async (gameCardIds: number[], user_id: number) =>
  db.none(DEAL_CARDS, [gameCardIds, user_id]);

const getCardsByOwner = async (game_id: number, user_id: number) =>
  db.manyOrNone(GET_CARDS_BY_OWNER, [game_id, user_id]);

const countByOwner = async (game_id: number, owner_id: number) =>
  db.one<{ count: number }>(COUNT_BY_OWNER, [game_id, owner_id]);

const transferCards = async (gameCardIds: number[], newOwnerId: number) =>
  db.none(TRANSFER_CARDS, [gameCardIds, newOwnerId]);

const drawCard = async (game_id: number, user_id: number) =>
  db.oneOrNone<{ id: number }>(DRAW_CARD, [game_id, user_id]);

const playCard = async (gameCardId: number) =>
  db.one(PLAY_CARD, [gameCardId]);

const getTopDiscard = async (game_id: number) =>
  db.oneOrNone(GET_TOP_DISCARD, [game_id]);

export {createDeck, getCardsFromDeck, dealCards, getCardsByOwner, countByOwner, transferCards, drawCard, playCard, getTopDiscard};