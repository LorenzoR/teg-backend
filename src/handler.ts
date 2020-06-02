import { APIGatewayProxyHandler, APIGatewayProxyEvent } from 'aws-lambda';
import { ApiGatewayManagementApi } from 'aws-sdk';
import 'source-map-support/register';

import GameService from './services/GameService';
import DynamoDBOffline from './services/DynamoDBOffline';
// import DealService from './services/DealService';
import DiceService from './services/DiceService';
import APIGatewayWebsocketsService from './services/APIGatewayWebsocketsService';
import { PlayerTypes } from './models/Player';

const diceService = new DiceService();

const gameService = new GameService(new DynamoDBOffline(), diceService);

const endpoint = 'http://localhost:3001';

const apiGatewayWebsocketsService = new APIGatewayWebsocketsService(endpoint);

const getGameIdFromEvent = (event: APIGatewayProxyEvent): string => event.queryStringParameters.game_id;

/*
const sendBAK = async (connectionId: string, data: {}): Promise<boolean> => {
  if (connectionId) {
    const apigwManagementApi = new ApiGatewayManagementApi({
      apiVersion: '2018-11-29',
      endpoint,
    });

    await apigwManagementApi
      .postToConnection({ ConnectionId: connectionId, Data: data })
      .promise();

    return true;
  }

  // No connection ID
  return false;
};

const broadcastBAK = async (data: {}, connectionIds: string[]): Promise<boolean> => {
  const promises = [];

  for (let i = 0; i < connectionIds.length; i += 1) {
    promises.push(send(connectionIds[i], data));
  }

  await Promise.all(promises);

  return true;
};
*/

const sendMessageToAllPlayers = async (gameId: string, data: {}): Promise<boolean> => {
  const game = await gameService.getGame(gameId);
  const connectionIds = [];

  if (game.players) {
    console.log('sending to players');
    game.players.forEach((player) => {
      connectionIds.push(player.id);
    });
  }

  if (game.guests) {
    console.log('sending to guests');
    game.guests.forEach((guest) => {
      connectionIds.push(guest.id);
    });
  }

  console.log('sending to ', connectionIds);

  try {
    await apiGatewayWebsocketsService.broadcast(data, connectionIds);
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const sendGameInfoToAllPlayers = async (gameId: string): Promise<boolean> => {
  const game = await gameService.getGame(gameId);
  const connectionIds = [];

  if (!game || !game.players) {
    return null;
  }

  console.log('sending game info to players');
  const promises = [];

  game.players.forEach((player, index) => {
    // connectionIds.push(player.id);
    const playerCopy = { ...player };
    const players = { ...game.players };

    const payload = { action: 'sync', body: { ...game, currentPlayerId: player.id } };

    promises.push(apiGatewayWebsocketsService.send(player.id, JSON.stringify(payload)));
  });

  try {
    await Promise.all(promises);
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const sendConnectionIdToEachPlayer = async (gameId: string): Promise<boolean> => {
  const game = await gameService.getGame(gameId);

  if (!game || !game.players) {
    return null;
  }

  console.log('sending to each player');
  const promises = [];

  game.players.forEach((player) => {
    const connectionId = player.id;
    const body = { connectionId, color: player.color };
    const data = { action: 'connectionId', body };
    promises.push(apiGatewayWebsocketsService.send(connectionId, JSON.stringify(data)));
  });

  const response = await Promise.all(promises);

  return response && response.length === game.players.length;
};

export const connectHandler: APIGatewayProxyHandler = async (event, _context) => {
  // Add to guests so we have the connection ID
  const gameId = getGameIdFromEvent(event);
  await gameService.addGuest(gameId, { id: event.requestContext.connectionId });

  // Get players from game
  const game = await gameService.getGame(gameId);

  const response = { action: 'joinGame', body: game };
  await apiGatewayWebsocketsService.send(event.requestContext.connectionId, JSON.stringify(response));
  console.log('message sent!');

  return {
    statusCode: 200,
    body: 'connected',
  };
};

export const disconnectHandler: APIGatewayProxyHandler = async (event, _context) => {
  // Remove from guests
  const gameId = '1234'; // getGameIdFromEvent(event);

  await gameService.removeGuest(gameId, event.requestContext.connectionId);
  console.log('Guest Removed!');

  // Remove from players
  const removedPlayer = await gameService.removePlayer(gameId, event.requestContext.connectionId);
  console.log('Players Removed!', removedPlayer);

  // If game has started, send message
  const game = await gameService.getGame(gameId);
  if (game.gameStatus === 'started') {
    const payloadBody = { players: game.players, disconnectedPlayerName: removedPlayer.name };
    const payload = { action: 'playerDisconnected', body: payloadBody };

    await sendMessageToAllPlayers(gameId, JSON.stringify(payload));
  }

  return {
    statusCode: 200,
    body: 'disconnected',
  };
};

export const joinGameHandler: APIGatewayProxyHandler = async (event, _context) => {
  // Add player to game
  const eventBody = JSON.parse(event.body);
  const newPlayer = {
    id: event.requestContext.connectionId,
    name: eventBody.data.username,
    color: eventBody.data.color,
    cards: [],
    playerStatus: 'online',
  };

  const { gameId } = eventBody.data;

  await gameService.addPlayer(gameId, newPlayer);
  console.log('Player added!');

  // Remove from guests
  await gameService.removeGuest(gameId, newPlayer.id);

  // Send message with players
  const game = await gameService.getGame(gameId);

  const response = { action: 'joinGame', body: game };
  // await send(endpoint, event.requestContext.c, JSON.stringify(response));
  await sendMessageToAllPlayers(gameId, JSON.stringify(response));
  console.log('message sent to all players!');

  return {
    statusCode: 200,
    body: 'joinGameHandler OK!',
  };
};

export const reConnectHandler: APIGatewayProxyHandler = async (event, _context) => {
  // Re-connect player to game
  const eventBody = JSON.parse(event.body);

  const { gameId, color } = eventBody.data;
  const { connectionId } = event.requestContext;

  const player = await gameService.reConnectPlayer(gameId, color, connectionId);

  // Send game info to everyone
  await sendGameInfoToAllPlayers(gameId);
  console.log('message sent to all players!');

  // Send re-connected player
  const payload = { action: 'reJoinGame', body: { reConnectedPlayerName: player.name } };

  await sendMessageToAllPlayers(gameId, JSON.stringify(payload));

  return {
    statusCode: 200,
    body: 'reConnectHandler OK!',
  };
};

export const startGameHandler: APIGatewayProxyHandler = async (event, _context) => {
  console.log('Start Game!!');

  // Start game
  // const gameId = getGameIdFromEvent(event);
  const eventBody = JSON.parse(event.body);
  const { gameId } = eventBody.data;
  const game = await gameService.startGame(gameId);
  console.log('game started!');

  const response = { action: 'gameStarted', body: game };

  await sendMessageToAllPlayers(gameId, JSON.stringify(response));
  console.log('message sent to all players!');

  // Send connection ID to each player
  await sendConnectionIdToEachPlayer(gameId);

  return {
    statusCode: 200,
    body: 'joinGameHandler OK!',
  };
};

export const finishRoundHandler: APIGatewayProxyHandler = async (event, _context) => {
  console.log('Finish round');

  const eventBody = JSON.parse(event.body);
  const { gameId, playerId } = eventBody.data;

  // Check if it's that player's round
  const player = await gameService.getPlayerById(gameId, playerId);
  const game1 = await gameService.getGame(gameId);

  if (player.color !== game1.players[game1.round.playerIndex].color) {
    // throw new Error(`Not ${playerId} round`);
    return {
      statusCode: 401,
      body: `Not ${playerId} round`,
    };
  }

  try {
    const response = await gameService.finishRound(gameId);
  } catch (error) {
    console.error(error);
  }

  // Get game
  const game = await gameService.getGame(gameId);

  const message = { action: 'roundFinished', body: game };

  await sendMessageToAllPlayers(gameId, JSON.stringify(message));
  console.log('message sent to all players!');

  return {
    statusCode: 200,
    body: 'addTroops OK!',
  };
};

export const addTroopsHandler: APIGatewayProxyHandler = async (event, _context) => {
  console.log('Add troops');

  // Start game
  // const gameId = getGameIdFromEvent(event);
  const eventBody = JSON.parse(event.body);
  const {
    gameId, country, count, playerId,
  } = eventBody.data;

  // Check if it's that player's round
  const player = await gameService.getPlayerById(gameId, playerId);
  const game1 = await gameService.getGame(gameId);

  if (player.color !== game1.players[game1.round.playerIndex].color) {
    // throw new Error(`Not ${playerId} round`);
    return {
      statusCode: 401,
      body: `Not ${playerId} round`,
    };
  }

  const response = await gameService.addTroops(gameId, country, count);
  console.log('troops added');

  // Get game
  const game = await gameService.getGame(gameId);

  const message = { action: 'troopsAdded', body: game };

  await sendMessageToAllPlayers(gameId, JSON.stringify(message));
  console.log('message sent to all players!');

  return {
    statusCode: 200,
    body: 'addTroops OK!',
  };
};

export const attackHandler: APIGatewayProxyHandler = async (event, _context) => {
  console.log('Attack!');

  // Start game
  // const gameId = getGameIdFromEvent(event);
  const eventBody = JSON.parse(event.body);
  const {
    gameId, playerId, attacker, defender,
  } = eventBody.data;

  // Check if it's that player's round
  const player = await gameService.getPlayerById(gameId, playerId);
  const game = await gameService.getGame(gameId);

  if (player.color !== game.players[game.round.playerIndex].color) {
    // throw new Error(`Not ${playerId} round`);
    return {
      statusCode: 401,
      body: `Not ${playerId} round`,
    };
  }

  try {
    const response = await gameService.attack(
      gameId,
      attacker,
      defender,
      playerId,
    );

    // Get game
    // const game = await gameService.getGame(gameId);

    const message = { action: 'countryAttacked', body: response };

    await sendMessageToAllPlayers(gameId, JSON.stringify(message));
    console.log('message sent to all players!');
  } catch (error) {
    console.error(error);
  }

  return {
    statusCode: 200,
    body: 'addTroops OK!',
  };
};

export const moveTroopsHandler: APIGatewayProxyHandler = async (event, _context) => {
  console.log('Move Troops');

  // Start game
  // const gameId = getGameIdFromEvent(event);
  const eventBody = JSON.parse(event.body);
  const {
    gameId, playerId, source, target, count,
  } = eventBody.data;

  // Check if it's that player's round
  const player = await gameService.getPlayerById(gameId, playerId);
  const game = await gameService.getGame(gameId);

  if (player.color !== game.players[game.round.playerIndex].color) {
    // throw new Error(`Not ${playerId} round`);
    return {
      statusCode: 401,
      body: `Not ${playerId} round`,
    };
  }

  try {
    const response = await gameService.moveTroops(
      gameId,
      source,
      target,
      playerId,
      count,
    );

    const message = { action: 'troopsMoved', body: response };

    await sendMessageToAllPlayers(gameId, JSON.stringify(message));
    console.log('message sent to all players!');
  } catch (error) {
    console.error(error);
  }

  return {
    statusCode: 200,
    body: 'moveTroops OK!',
  };
};

export const getCardHandler: APIGatewayProxyHandler = async (event, _context) => {
  console.log('Get card');

  // Start game
  // const gameId = getGameIdFromEvent(event);
  const eventBody = JSON.parse(event.body);
  const {
    gameId, playerId,
  } = eventBody.data;

  // Check if it's that player's round
  const player = await gameService.getPlayerById(gameId, playerId);
  const game = await gameService.getGame(gameId);

  if (player.color !== game.players[game.round.playerIndex].color) {
    // throw new Error(`Not ${playerId} round`);
    return {
      statusCode: 401,
      body: `Not ${playerId} round`,
    };
  }

  try {
    const response = await gameService.getCard(gameId, playerId);

    const payload = { action: 'cardReceived', body: { players: response.players } };

    // Send message to that player
    await apiGatewayWebsocketsService.send(playerId, JSON.stringify(payload));

    const payloadBroadcast = { action: 'cardReceived', body: { playerName: response.player.name } };

    await sendMessageToAllPlayers(gameId, JSON.stringify(payloadBroadcast));
    console.log('message sent to all players!');
  } catch (error) {
    console.error(error);
  }

  return {
    statusCode: 200,
    body: 'moveTroops OK!',
  };
};
