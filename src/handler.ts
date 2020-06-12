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

  let payload;
  let isAdmin = false;

  // If game has started, send message
  if (game && game.gameStatus === 'started') {
    // const player = _.find(game.guests, (obj) => obj.id === playerId);

    // Remove from players
    const removedPlayer = game.removePlayer(playerId);
    // const removedPlayer = await gameService.removePlayer(gameId, playerId);
    console.log('Players Removed!', removedPlayer);

    // Update game
    await gameService.updateGame(game);
    console.log('Game updated');

    const payloadBody = { players: game.players, disconnectedPlayerName: removedPlayer.name };
    payload = { action: 'playerDisconnected', body: payloadBody };

    // setEndpointFromEvent(event);
    // await sendMessageToAllPlayers(gameId, JSON.stringify(payload));
  } else if (game && game.gameStatus === 'waitingPlayers') {
    // Look in guests
    let player = _.find(game.guests, (obj) => obj.id === playerId);

    // If not found, look in players
    if (!player) {
      player = _.find(game.players, (obj) => obj.id === playerId);
    }

    if (!player) {
      console.error(`Player ${playerId} not found`);

      return {
        statusCode: 400,
        body: JSON.stringify(`Player ${playerId} not found`),
      };
    }

    // Remove from guests
    game.removeGuest(playerId);
    console.log(`Guest ${playerId} removed!`);

    isAdmin = player.isAdmin;

    // Update game only if player was not admin
    // If player is admin game will be removed so no need to update
    if (!isAdmin) {
      await gameService.updateGame(game);
      console.log('Game updated');
    }


    const payloadBody = { isAdmin };
    payload = { action: 'guestDisconnected', body: payloadBody };

    // setEndpointFromEvent(event);
    // await sendMessageToAllPlayers(gameId, JSON.stringify(payload));
  }

  setEndpointFromEvent(event);
  await sendMessageToAllPlayers(gameId, JSON.stringify(payload));
  console.log('Message sent', payload);

  // If admin left, delete game
  if (isAdmin) {
    await gameService.deleteGame(gameId);
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
  const game = await gameService.getGame(gameId);

  if (game.hasStarted()) {
    // Game already started so try to reconnect
    // Try to get game
    if (cachedConnectionId) {
      console.log('Cached!');
      // Check if player color and Id match
      const player = game.getPlayerByColor(color);

      // Player color and ID ok
      if (player && player.id === cachedConnectionId) {
        response = game.reConnectPlayer(color, connectionId);
      }
    } else {
      response = game.reConnectPlayer(color, connectionId);
    }

    // Remove guest with those IDs
    game.removeGuest(connectionId);

    if (cachedConnectionId) {
      game.removeGuest(cachedConnectionId);
    }

    if (response) {
      console.log('response', response);

      // Send game info to everyone
      setEndpointFromEvent(event);
      await sendGameInfoToAllPlayers(gameId);
      console.log('Message sent to all players!');

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

    game.addPlayer(newPlayer);
    console.log(`Player ${newPlayer.color} added!`);

    // Remove from guests
    game.removeGuest(newPlayer.id);

    // Send message with players
    response = { action: 'joinGame', body: game };

    setEndpointFromEvent(event);
    await sendMessageToAllPlayers(gameId, JSON.stringify(response));
    console.log('Message sent to all players!');
  }

  // Update game
  // TODO. This should be done before sending message to players
  await gameService.updateGame(game);

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

  const game = await gameService.getGame(gameId);

  if (!game) {
    console.error(`Game ID ${gameId} not found`);

    return {
      statusCode: 400,
      body: JSON.stringify(`Game ID ${gameId} not found`),
    };
  }

  let response;

  // Try to get game
  if (cachedConnectionId) {
    console.log('cached!');

    if (game.hasStarted()) {
      // Check if player color and Id match
      const player = game.getPlayerByColor(color);

      // Player color and ID ok
      if (player && player.id === cachedConnectionId) {
        response = game.reConnectPlayer(color, connectionId);
      }
    }
  } else {
    response = game.reConnectPlayer(color, connectionId);
  }

  // Remove guest with those IDs
  game.removeGuest(connectionId);

  if (cachedConnectionId) {
    game.removeGuest(cachedConnectionId);
  }

  if (response) {
    console.log('response', response);

    // Update game
    await gameService.updateGame(game);

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
  console.log('Start Game handler');

  const eventBody = JSON.parse(event.body);
  const { gameId } = eventBody.data;

  const game = await gameService.getGame(gameId);

  if (!game) {
    console.error(`Game ID ${gameId} not found`);

    return {
      statusCode: 400,
      body: JSON.stringify(`Game ID ${gameId} not found`),
    };
  }

  game.startGame();
  console.log('Game started!');

  await gameService.updateGame(game);

  const response = { action: 'gameStarted', body: game };

  setEndpointFromEvent(event);
  await sendMessageToAllPlayers(gameId, JSON.stringify(response));
  console.log('Message sent to all players!');

  // Send connection ID to each player
  await sendConnectionIdToEachPlayer(gameId);

  return {
    statusCode: 200,
    body: JSON.stringify('startGameHandler OK!'),
  };
};

export const finishRoundHandler: APIGatewayProxyHandler = async (event, _context) => {
  console.log('Finish round handler');

  const eventBody = JSON.parse(event.body);
  const { gameId, playerColor } = eventBody.data;

  const playerId = event.requestContext.connectionId;

  // Get game
  const game = await gameService.getGame(gameId);

  if (!game) {
    console.error(`Game ID ${gameId} not found`);

    return {
      statusCode: 400,
      body: JSON.stringify(`Game ID ${gameId} not found`),
    };
  }

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

  if (!game) {
    console.error(`Game ID ${gameId} not found`);

    return {
      statusCode: 400,
      body: JSON.stringify(`Game ID ${gameId} not found`),
    };
  }

  console.log(`Got game ID ${gameId}`);

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
