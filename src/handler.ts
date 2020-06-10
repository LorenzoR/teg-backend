import { APIGatewayProxyHandler, APIGatewayProxyEvent } from 'aws-lambda';
// import { ApiGatewayManagementApi } from 'aws-sdk';
import 'source-map-support/register';
import _ from 'lodash';

import GameService from './services/GameService';
import DynamoDBOffline from './services/DynamoDBOffline';
// import DealService from './services/DealService';
import DiceService from './services/DiceService';
import APIGatewayWebsocketsService from './services/APIGatewayWebsocketsService';

// import { PlayerTypes } from './models/Player';
import { RoundType } from './models/Round';

const ActionTypes = {
  TROOPS_ADDED: 'troopsAdded',
  ROUND_FINISHED: 'roundFinished',
};

const diceService = new DiceService();

const gameService = new GameService(new DynamoDBOffline(process.env.STAGE || 'local'), diceService);

let endpoint = 'http://localhost:3001';
// let endpoint = '0su6p4d8cf.execute-api.ap-southeast-2.amazonaws.com/dev';

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

  if (!game) {
    throw new Error(`No game with ID ${gameId}`);
  }

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
  // const connectionIds = [];

  if (!game || !game.players) {
    return null;
  }

  console.log('sending game info to players');
  const promises = [];

  game.players.forEach((player) => {
    // connectionIds.push(player.id);
    // const playerCopy = { ...player };
    // const players = { ...game.players };

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

const setEndpointFromEvent = (event) => {
  if (event.requestContext.domainName !== 'localhost') {
    endpoint = `${event.requestContext.domainName}/${event.requestContext.stage}`;
    apiGatewayWebsocketsService.setEndpoint(endpoint);
    console.log('endpoint', endpoint);
  }
};

export const connectHandler: APIGatewayProxyHandler = async (event, _context) => {
  console.log('Connect Handler');

  // Add to guests so we have the connection ID
  const gameId = getGameIdFromEvent(event);
  console.log(`Trying to get game ID ${gameId}`);

  // Get players from game
  let game = await gameService.getGame(gameId);

  // Create game if there isn't one
  if (!game) {
    console.log(`Game not found, creating game ID ${gameId}`);
    game = await gameService.newGame(gameId);
    console.log(`Created game ID ${gameId}`);
  } else {
    console.log(`Got game ID ${gameId}`);
  }

  // Add guest
  game.addGuest(event.requestContext.connectionId);
  console.log(`Added guest ${event.requestContext.connectionId} to game ID ${gameId}`);

  // Update game
  await gameService.updateGame(game);

  return {
    statusCode: 200,
    body: JSON.stringify('connected'),
  };
};

export const disconnectHandler: APIGatewayProxyHandler = async (event, _context) => {
  // Remove from guests
  const gameId = '1234'; // getGameIdFromEvent(event);
  const playerId = event.requestContext.connectionId;

  // Get game
  const game = await gameService.getGame(gameId);

  // If game has started, send message
  if (game && game.gameStatus === 'started') {
    const player = _.find(game.guests, (obj) => obj.id === playerId);

    // Remove from players
    const removedPlayer = await gameService.removePlayer(gameId, playerId);
    console.log('Players Removed!', removedPlayer);

    const payloadBody = { players: game.players, disconnectedPlayerName: removedPlayer.name };
    const payload = { action: 'playerDisconnected', body: payloadBody };

    setEndpointFromEvent(event);
    await sendMessageToAllPlayers(gameId, JSON.stringify(payload));
  } else if (game && game.gameStatus === 'waitingPlayers') {
    // Look in guests
    const player = _.find(game.guests, (obj) => obj.id === playerId);

    // Remove from guests
    await gameService.removeGuest(gameId, playerId);
    console.log('Guest Removed!');

    const payloadBody = { isAdmin: player.isAdmin };
    const payload = { action: 'guestDisconnected', body: payloadBody };

    setEndpointFromEvent(event);
    await sendMessageToAllPlayers(gameId, JSON.stringify(payload));

    // If admin left, delete game
    if (player.isAdmin) {
      await gameService.deleteGame(gameId);
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify('disconnected'),
  };
};

export const joinGameHandler: APIGatewayProxyHandler = async (event, _context) => {
  // Add player to game
  const eventBody = JSON.parse(event.body);

  const { gameId, cachedConnectionId, color } = eventBody.data;
  const { connectionId } = event.requestContext;

  let response;

  // Get game
  let game = await gameService.getGame(gameId);

  if (game.gameStatus === 'started') {
    // Game already started so try to reconnect
    // Try to get game
    if (cachedConnectionId) {
      console.log('Cached!');
      // const game = await gameService.getGame(gameId);

      if (game && game.gameStatus === 'started') {
        // Check if player color and Id match
        const player = await gameService.getPlayerByColor(gameId, color);

        // Player color and ID ok
        if (player && player.id === cachedConnectionId) {
          response = await gameService.reConnectPlayer(gameId, color, connectionId);
        }
      }
    } else {
      response = await gameService.reConnectPlayer(gameId, color, connectionId);
    }

    // Remove guest with those IDs
    await gameService.removeGuest(gameId, connectionId);
    await gameService.removeGuest(gameId, cachedConnectionId);

    if (response) {
      console.log('response', response);

      // Send game info to everyone
      setEndpointFromEvent(event);
      await sendGameInfoToAllPlayers(gameId);
      console.log('message sent to all players!');

      // Send re-connected player
      const payload = {
        action: 'reJoinGame',
        body: {
          reConnectedPlayerName: response.player.name,
          players: response.players,
        },
      };

      setEndpointFromEvent(event);
      await sendMessageToAllPlayers(gameId, JSON.stringify(payload));
    }
  } else {
    // Game not started yet so add player
    const newPlayer = {
      id: event.requestContext.connectionId,
      name: eventBody.data.username,
      color: eventBody.data.color,
    };

    await gameService.addPlayer(gameId, newPlayer);
    console.log('Player added!');

    // Remove from guests
    await gameService.removeGuest(gameId, newPlayer.id);

    // Send message with players
    game = await gameService.getGame(gameId);

    response = { action: 'joinGame', body: game };
    // await send(endpoint, event.requestContext.c, JSON.stringify(response));
    setEndpointFromEvent(event);
    await sendMessageToAllPlayers(gameId, JSON.stringify(response));
    console.log('message sent to all players!');
  }

  return {
    statusCode: 200,
    body: JSON.stringify('joinGameHandler OK!'),
  };
};

export const getPlayersHandler: APIGatewayProxyHandler = async (event, _context) => {
  // Add player to game
  const eventBody = JSON.parse(event.body);

  const { gameId } = eventBody.data;
  const { connectionId } = event.requestContext;

  // Get game
  const game = await gameService.getGame(gameId);

  // Get current player
  const { players, guests } = game;

  let currentPlayer = _.find(players, (obj) => obj.id === connectionId);

  // Player not found, try in guests
  if (!currentPlayer) {
    currentPlayer = _.find(guests, (obj) => obj.id === connectionId);
  }

  // Error. Player not found
  if (!currentPlayer) {
    const errorMsg = `Player ID ${connectionId} not found in game ${gameId}`;
    console.error(errorMsg);

    return {
      statusCode: 400,
      body: JSON.stringify(errorMsg),
    };
  }

  // Send message to that connectionID only
  const response = { action: 'playersInfo', body: { players: game.players, currentPlayer } };
  setEndpointFromEvent(event);
  await apiGatewayWebsocketsService.send(connectionId, JSON.stringify(response));

  return {
    statusCode: 200,
    body: JSON.stringify('getGame OK!'),
  };
};

export const reConnectHandler: APIGatewayProxyHandler = async (event, _context) => {
  // Re-connect player to game
  const eventBody = JSON.parse(event.body);

  const { gameId, color, cachedConnectionId } = eventBody.data;
  const { connectionId } = event.requestContext;

  let response;

  // Try to get game
  if (cachedConnectionId) {
    console.log('cached!');
    const game = await gameService.getGame(gameId);

    if (game && game.gameStatus === 'started') {
      // Check if player color and Id match
      const player = await gameService.getPlayerByColor(gameId, color);

      // Player color and ID ok
      if (player && player.id === cachedConnectionId) {
        response = await gameService.reConnectPlayer(gameId, color, connectionId);
      }
    }
  } else {
    response = await gameService.reConnectPlayer(gameId, color, connectionId);
  }

  // Remove guest with those IDs
  await gameService.removeGuest(gameId, connectionId);
  await gameService.removeGuest(gameId, cachedConnectionId);

  if (response) {
    console.log('response', response);

    // Send game info to everyone
    setEndpointFromEvent(event);
    await sendGameInfoToAllPlayers(gameId);
    console.log('message sent to all players!');

    // Send re-connected player
    const payload = {
      action: 'reJoinGame',
      body: {
        reConnectedPlayerName: response.player.name,
        players: response.players,
      },
    };

    setEndpointFromEvent(event);
    await sendMessageToAllPlayers(gameId, JSON.stringify(payload));
  }

  return {
    statusCode: 200,
    body: JSON.stringify('reConnectHandler OK!'),
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

  setEndpointFromEvent(event);
  await sendMessageToAllPlayers(gameId, JSON.stringify(response));
  console.log('message sent to all players!');

  // Send connection ID to each player
  await sendConnectionIdToEachPlayer(gameId);

  return {
    statusCode: 200,
    body: JSON.stringify('joinGameHandler OK!'),
  };
};

export const finishRoundHandler: APIGatewayProxyHandler = async (event, _context) => {
  console.log('Finish round handler');

  const eventBody = JSON.parse(event.body);
  const { gameId, playerColor } = eventBody.data;

  const playerId = event.requestContext.connectionId;

  // Get game
  const game = await gameService.getGame(gameId);
  console.log(`Got game ${gameId}`);

  // Finish round
  try {
    game.finishTurn(playerId);
  } catch (error) {
    console.error('finishRoundHandler error', error);

    return {
      statusCode: 400,
      body: JSON.stringify(error),
    };
  }

  console.log(`Player ${playerColor} finished his turn`);

  // Get game
  const response = await gameService.updateGame(game);
  console.log('Game updated');

  const message = { action: ActionTypes.ROUND_FINISHED, body: response };

  setEndpointFromEvent(event);
  await sendMessageToAllPlayers(gameId, JSON.stringify(message));
  console.log('Message sent to all players!');

  return {
    statusCode: 200,
    body: JSON.stringify('finish turn OK!'),
  };
};

export const finishRoundHandlerBAK: APIGatewayProxyHandler = async (event, _context) => {
  console.log('Finish round');

  const eventBody = JSON.parse(event.body);
  const { gameId, playerId, playerColor } = eventBody.data;

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
    await gameService.finishRound(gameId, playerColor);
  } catch (error) {
    console.error(error);
  }

  // Get game
  const game = await gameService.getGame(gameId);

  const message = { action: 'roundFinished', body: game };

  setEndpointFromEvent(event);
  await sendMessageToAllPlayers(gameId, JSON.stringify(message));
  console.log('message sent to all players!');

  return {
    statusCode: 200,
    body: JSON.stringify('addTroops OK!'),
  };
};

export const addTroopsHandler: APIGatewayProxyHandler = async (event, _context) => {
  console.log('Add troops handler');

  const eventBody = JSON.parse(event.body);
  const {
    gameId, country, count, playerColor,
  } = eventBody.data;

  const playerId = event.requestContext.connectionId;

  // Get game
  const game = await gameService.getGame(gameId);
  console.log(`Got game ${gameId}`);

  game.addTroops(playerId, country, count);

  console.log(`Player ${playerColor} added ${count} troops to ${country}`);

  // Update game
  const response = await gameService.updateGame(game);
  console.log('game updated!');
  // const response = await gameService.updateCountry(gameId, game.countries[country]);
  // console.log('Country updated!');

  const message = { action: ActionTypes.TROOPS_ADDED, body: game.getGame() };

  setEndpointFromEvent(event);
  await sendMessageToAllPlayers(gameId, JSON.stringify(message));
  console.log('Message sent to all players!');

  return {
    statusCode: 200,
    body: JSON.stringify(response),
  };
};

export const addTroopsHandlerBAK: APIGatewayProxyHandler = async (event, _context) => {
  console.log('Add troops');

  // Start game
  // const gameId = getGameIdFromEvent(event);
  const eventBody = JSON.parse(event.body);
  const {
    gameId, country, count, playerColor,
  } = eventBody.data;

  const playerId = event.requestContext.connectionId;

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

  await gameService.addTroops(gameId, playerColor, country, count);
  console.log('troops added');

  // Get game
  const game = await gameService.getGame(gameId);

  const message = { action: 'troopsAdded', body: game };

  setEndpointFromEvent(event);
  await sendMessageToAllPlayers(gameId, JSON.stringify(message));
  console.log('message sent to all players!');

  return {
    statusCode: 200,
    body: JSON.stringify('addTroops OK!'),
  };
};

export const attackHandler: APIGatewayProxyHandler = async (event, _context) => {
  console.log('Attack handler');

  const eventBody = JSON.parse(event.body);
  const {
    gameId, playerColor, attacker, defender,
  } = eventBody.data;

  // Check if it's that player's round
  const playerId = event.requestContext.connectionId;

  // Get game
  const game = await gameService.getGame(gameId);
  console.log(`Got game ID ${gameId}`);

  if (!game) {
    console.error(`Game ID ${gameId} not found`);

    return {
      statusCode: 400,
      body: JSON.stringify(`Game ID ${gameId} not found`),
    };
  }

  // Attack
  try {
    const attackResponse = game.attack(playerId, attacker, defender);
    console.log(`Player ${playerColor} attacked ${defender} from ${attacker}`);

    // Update game
    const response = await gameService.updateGame(game);
    console.log('Game updated');

    const message = { action: 'countryAttacked', body: attackResponse };

    setEndpointFromEvent(event);
    await sendMessageToAllPlayers(gameId, JSON.stringify(message));
    console.log('Message sent to all players!');

    return {
      statusCode: 200,
      body: JSON.stringify('addTroops OK!'),
    };
  } catch (error) {
    console.error(error);

    return {
      statusCode: 400,
      body: JSON.stringify(error),
    };
  }
};

export const moveTroopsHandler: APIGatewayProxyHandler = async (event, _context) => {
  console.log('Move Troops handler');

  const eventBody = JSON.parse(event.body);
  const {
    gameId, playerColor, source, target, count, conquest,
  } = eventBody.data;

  const playerId = event.requestContext.connectionId;

  // Get game
  const game = await gameService.getGame(gameId);
  console.log(`Got game ID ${gameId}`);

  if (!game) {
    console.error(`Game ID ${gameId} not found`);

    return {
      statusCode: 400,
      body: JSON.stringify(`Game ID ${gameId} not found`),
    };
  }

  try {
    const response = game.moveTroops(playerId, source, target, count, conquest);
    console.log(`Player ${playerColor} moved ${count} troops from ${source} to ${target}`);

    await gameService.updateGame(game);
    console.log('Game updated');

    const message = { action: 'troopsMoved', body: response };

    setEndpointFromEvent(event);
    await sendMessageToAllPlayers(gameId, JSON.stringify(message));
    console.log('Message sent to all players!');

    return {
      statusCode: 200,
      body: JSON.stringify('moveTroops OK!'),
    };
  } catch (error) {
    console.error(error);

    return {
      statusCode: 400,
      body: JSON.stringify(error),
    };
  }
};

export const getCardHandler: APIGatewayProxyHandler = async (event, _context) => {
  console.log('Get card handler');

  const eventBody = JSON.parse(event.body);
  const {
    gameId, playerColor,
  } = eventBody.data;

  const playerId = event.requestContext.connectionId;

  // Get game
  const game = await gameService.getGame(gameId);
  console.log(`Got game ID ${gameId}`);

  if (!game) {
    console.error(`Game ID ${gameId} not found`);

    return {
      statusCode: 400,
      body: JSON.stringify(`Game ID ${gameId} not found`),
    };
  }

  try {
    // Get card
    const response = game.getCountryCard(playerId);

    // Update game
    await gameService.updateGame(game);
    console.log('Game updated');

    const payload = { action: 'cardReceived', body: { players: response.players } };

    // Send message to that player
    setEndpointFromEvent(event);
    await apiGatewayWebsocketsService.send(playerId, JSON.stringify(payload));

    const payloadBroadcast = {
      action: 'cardReceived',
      body: {
        playerName: response.player.name,
        round: response.round,
      },
    };

    setEndpointFromEvent(event);
    await sendMessageToAllPlayers(gameId, JSON.stringify(payloadBroadcast));
    console.log('Message sent to all players!');

    return {
      statusCode: 200,
      body: JSON.stringify('moveTroops OK!'),
    };
  } catch (error) {
    console.error(error);

    return {
      statusCode: 400,
      body: JSON.stringify(error),
    };
  }
};

export const exchangeCardHandler: APIGatewayProxyHandler = async (event, _context) => {
  console.log('Exchange card handler');

  const eventBody = JSON.parse(event.body);
  const { gameId, playerColor, card } = eventBody.data;

  const playerId = event.requestContext.connectionId;

  // Get game
  const game = await gameService.getGame(gameId);
  console.log(`Got game ID ${gameId}`);

  if (!game) {
    console.error(`Game ID ${gameId} not found`);

    return {
      statusCode: 400,
      body: JSON.stringify(`Game ID ${gameId} not found`),
    };
  }

  try {
    const response = game.exchangeCard(playerId, card);
    console.log('Changed Card');

    // Update game
    await gameService.updateGame(game);
    console.log('Game updated');

    const payload = { action: 'cardExchanged', body: { players: response.players, countries: response.countries } };

    // Send message to all player
    setEndpointFromEvent(event);
    await sendMessageToAllPlayers(gameId, JSON.stringify(payload));
    console.log('Message sent to all players!');
  } catch (error) {
    console.error(error);

    return {
      statusCode: 400,
      body: JSON.stringify(error),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify('moveTroops OK!'),
  };
};

export const exchangeCardsHandler: APIGatewayProxyHandler = async (event, _context) => {
  console.log('Exchange cards handler');

  const eventBody = JSON.parse(event.body);
  const { gameId, playerColor, cards } = eventBody.data;

  const playerId = event.requestContext.connectionId;

  // Get game
  const game = await gameService.getGame(gameId);
  console.log(`Got game ID ${gameId}`);

  if (!game) {
    console.error(`Game ID ${gameId} not found`);

    return {
      statusCode: 400,
      body: JSON.stringify(`Game ID ${gameId} not found`),
    };
  }

  try {
    const response = game.exchangeCards(playerId, cards);
    console.log('Exchanged cards');

    // Update game
    await gameService.updateGame(game);
    console.log('Game updated');

    const payload = { action: 'cardsExchanged', body: { players: response.players } };

    // Send message to all player
    setEndpointFromEvent(event);
    await sendMessageToAllPlayers(gameId, JSON.stringify(payload));
    console.log('Message sent to all players!');

    return {
      statusCode: 200,
      body: JSON.stringify('moveTroops OK!'),
    };
  } catch (error) {
    console.error(error);

    return {
      statusCode: 400,
      body: JSON.stringify(error),
    };
  }
};

export const chatMessageHandler: APIGatewayProxyHandler = async (event, _context) => {
  console.log('Chat message handler');

  const eventBody = JSON.parse(event.body);
  const {
    gameId, message,
  } = eventBody.data;

  const playerId = event.requestContext.connectionId;

  // Get player
  const player = await gameService.getPlayerById(gameId, playerId);

  // Error. Player not found
  if (!player) {
    const errorMsg = `Player ID ${playerId} not found in game ${gameId}`;
    console.error(errorMsg);

    return {
      statusCode: 400,
      body: JSON.stringify(errorMsg),
    };
  }

  const payload = { action: 'messageReceived', body: { player, message } };

  // Send message to all player
  setEndpointFromEvent(event);
  await sendMessageToAllPlayers(gameId, JSON.stringify(payload));

  return {
    statusCode: 200,
    body: JSON.stringify('chat Message OK!'),
  };
};
