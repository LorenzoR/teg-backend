import { APIGatewayProxyHandler, APIGatewayProxyEvent } from 'aws-lambda';
import 'source-map-support/register';
import _ from 'lodash';

import APIGatewayWebsocketsService from './services/APIGatewayWebsocketsService';

import DynamoDBGameRepository from './services/DynamoDBGameRepository';
import WebSocketConnectionRepository from './services/DynamoDBWebSocketConnectionsRepository';

import Game from './models/Game';
import WebSocketConnection from './models/WebSocketConnection';

const ActionTypes = {
  TROOPS_ADDED: 'troopsAdded',
  ROUND_FINISHED: 'roundFinished',
};

// const gameService = new GameService(new DynamoDBOffline(process.env.STAGE || 'local'));
// const gameService = new GameService(new DynamoDBOffline('local'));

let endpoint = 'http://localhost:3001';

const apiGatewayWebsocketsService = new APIGatewayWebsocketsService(endpoint, process.env.STAGE || 'local');

// const gameRepository = new GameRepository(process.env.STAGE || 'local');
const gameRepository = new DynamoDBGameRepository(process.env.STAGE || 'local');
const webSocketConnectionRepository = new WebSocketConnectionRepository(
  process.env.STAGE || 'local',
);

const getGameIdFromEvent = (event: APIGatewayProxyEvent): string => event.queryStringParameters.game_id;

const sendGameInfoToEachPlayer = async (game: Game): Promise<boolean> => {
  // const data = { ...game };
  const data = [];

  // Get online players
  const onlinePlayers = game.getOnlinePlayersAndGuests();

  // Mask data so that players don't get other player's details
  const connectionIds = _.map(onlinePlayers, 'id');

  connectionIds.forEach((connectionId) => {
    const playerDetails = { ...game };
    playerDetails.players = JSON.parse(JSON.stringify(playerDetails.players)); // Copy players

    playerDetails.players.forEach((player) => {
      if (player.id !== connectionId) {
        // eslint-disable-next-line no-param-reassign
        player.mission = null;
      }
    });

    data.push(JSON.stringify({ action: 'gameStarted', body: playerDetails }));
  });

  // const response = { action: 'gameStarted', body: data };
  // const payload = JSON.stringify(response);
  try {
    let updateGame = false;
    const responses = await apiGatewayWebsocketsService.broadcastDifferentData(data, connectionIds);

    // Set player offline if response is false
    responses.forEach((response) => {
      if (!response.response) {
        const player = game.getPlayerById(response.id);
        if (player) {
          console.log(`Set player ${player.id} to offline`);
          player.playerStatus = 'offline';
          updateGame = true;
        }
      }
    });

    if (updateGame) {
      await gameRepository.update(game);
    }

    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const sendMessageToAllPlayers = async (game: Game, data: any): Promise<boolean> => {
  // const game = await gameService.getGame(gameId);
  // const game = await gameRepository.getByID(gameId);

  if (!game) {
    throw new Error('No game');
  }

  // Get online players
  const onlinePlayers = game.getOnlinePlayersAndGuests();

  const connectionIds = _.map(onlinePlayers, 'id');

  /*
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
  */

  console.log('sending to ', connectionIds);

  try {
    let updateGame = false;
    const responses = await apiGatewayWebsocketsService.broadcast(data, connectionIds);

    // Set player offline if response is false
    responses.forEach((response) => {
      if (!response.response) {
        const player = game.getPlayerById(response.id);
        if (player) {
          console.log(`Set player ${player.id} to offline`);
          player.playerStatus = 'offline';
          updateGame = true;
        }
      }
    });

    if (updateGame) {
      await gameRepository.update(game);
    }

    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const sendGameInfoToAllPlayers = async (game: Game): Promise<boolean> => {
  // const game = await gameService.getGame(gameId);
  // const game = await gameRepository.getByID(gameId);
  // const connectionIds = [];

  if (!game) {
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
  // const game = await gameService.getGame(gameId);
  const game = await gameRepository.getByID(gameId);

  if (!game || !game.players) {
    return null;
  }

  console.log('sending to each player');
  const promises = [];

  game.players.forEach((player) => {
    const connectionId = player.id;
    const body = { connectionId, color: player.color };
    const data = { body, action: 'connectionId' };
    promises.push(apiGatewayWebsocketsService.send(connectionId, JSON.stringify(data)));
  });

  const response = await Promise.all(promises);

  return response && response.length === game.players.length;
};

const setEndpointFromEvent = (event): void => {
  if (event.requestContext.domainName !== 'localhost') {
    endpoint = `${event.requestContext.domainName}/${event.requestContext.stage}`;
    apiGatewayWebsocketsService.setEndpoint(endpoint);
    console.log('endpoint', endpoint);
  }
};

export const newGameHandler: APIGatewayProxyHandler = async (event) => {
  const newGameId = Game.generateNewGameUUID();

  try {
    const game = new Game();
    game.UUID = newGameId;

    await gameRepository.insert(game);

    return {
      statusCode: 200,
      body: JSON.stringify({ newGameId }),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
  } catch (error) {
    console.log('Event: ', event);
    console.error(error);

    return {
      statusCode: 400,
      body: JSON.stringify(error),
    };
  }
};

export const connectHandler: APIGatewayProxyHandler = async (event) => {
  console.log('Connect Handler');

  const { connectionId } = event.requestContext;
  const isNewGame = false;

  // Add to guests so we have the connection ID
  const gameId = getGameIdFromEvent(event);
  console.log(`Trying to get game ID ${gameId}`);

  // Add connection
  const newConnection = new WebSocketConnection();
  newConnection.gameId = gameId;
  newConnection.connectionId = connectionId;
  await webSocketConnectionRepository.insert(newConnection);

  try {
  // Get players from game
    const game = await gameRepository.getByID(gameId);

    // Create game if there isn't one
    if (!game) {
      /*
      console.log(`Game not found, creating game ID ${gameId}`);
      // game = await gameService.newGame(gameId);
      game = (new Game()).initGame();
      game.UUID = gameId;
      isNewGame = true;
      console.log(`Created game ID ${gameId}`);
      */

      console.error(`Game ${gameId} not found`);

      return {
        statusCode: 400,
        body: JSON.stringify(`Game ${gameId} not found`),
      };
    }
    console.log(`Got game ID ${gameId}`);

    // Add guest
    game.addGuest(event.requestContext.connectionId);
    console.log(`Added guest ${event.requestContext.connectionId} to game ID ${gameId}`);

    // Update game
    if (isNewGame) {
      await gameRepository.insert(game);
    } else {
      await gameRepository.update(game);
    }
    // await gameService.updateGame(game);

    return {
      statusCode: 200,
      body: JSON.stringify('connected'),
    };
  } catch (error) {
    console.error(error);

    return {
      statusCode: 400,
      body: JSON.stringify(error),
    };
  }
};

export const disconnectHandler: APIGatewayProxyHandler = async (event) => {
  console.log('Disconnect handler');

  const { connectionId } = event.requestContext;
  const webSocketConection = await webSocketConnectionRepository.getById(connectionId);

  // Game not found
  if (!webSocketConection || !webSocketConection.gameId) {
    const errorMsg = `No game found for connection ${connectionId}`;
    return {
      statusCode: 400,
      body: JSON.stringify(errorMsg),
    };
  }

  const { gameId } = webSocketConection;
  const playerId = event.requestContext.connectionId;

  try {
    // Remove connection
    await webSocketConnectionRepository.delete(connectionId);

    // Get game
    const game = await gameRepository.getByID(gameId);

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
      // await gameService.updateGame(game);
      await gameRepository.update(game);
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
        // await gameService.updateGame(game);
        await gameRepository.update(game);
        console.log('Game updated');
      }

      const payloadBody = { isAdmin };
      payload = { action: 'guestDisconnected', body: payloadBody };

    // setEndpointFromEvent(event);
    // await sendMessageToAllPlayers(gameId, JSON.stringify(payload));
    }

    setEndpointFromEvent(event);
    await sendMessageToAllPlayers(game, JSON.stringify(payload));
    console.log('Message sent', payload);

    // If admin left, delete game
    if (isAdmin) {
      await gameRepository.delete(gameId);
      // await gameService.deleteGame(gameId);
    }

    return {
      statusCode: 200,
      body: JSON.stringify('disconnected'),
    };
  } catch (error) {
    console.error(error);

    return {
      statusCode: 400,
      body: JSON.stringify(error),
    };
  }
};

export const joinGameHandler: APIGatewayProxyHandler = async (event) => {
  console.log('Join Game Handler');
  // Add player to game
  const eventBody = JSON.parse(event.body);

  const { gameId, cachedConnectionId, color } = eventBody.data;
  const { connectionId } = event.requestContext;

  let response;

  try {
    // Get game
    // const game = await gameService.getGame(gameId);
    const game = await gameRepository.getByID(gameId);
    console.log(`Got game ID ${game.UUID}`);

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
        await sendGameInfoToAllPlayers(game);
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
        await sendMessageToAllPlayers(game, JSON.stringify(payload));
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
      await sendMessageToAllPlayers(game, JSON.stringify(response));
      console.log('Message sent to all players!');
    }

    // Update game
    // TODO. This should be done before sending message to players
    // await gameService.updateGame(game);
    await gameRepository.update(game);
    console.log('Updated game');

    return {
      statusCode: 200,
      body: JSON.stringify('joinGameHandler OK!'),
    };
  } catch (error) {
    console.error(error);

    return {
      statusCode: 200,
      body: JSON.stringify(error),
    };
  }
};

export const getPlayersHandler: APIGatewayProxyHandler = async (event) => {
  // Add player to game
  const eventBody = JSON.parse(event.body);

  const { gameId } = eventBody.data;
  const { connectionId } = event.requestContext;

  try {
  // Get game
  // const game = await gameService.getGame(gameId);
    const game = await gameRepository.getByID(gameId);

    if (!game) {
      return {
        statusCode: 400,
        body: JSON.stringify(`No game with ID ${gameId}`),
      };
    }

    // Ping all players to make sure who is online
    const pingPayload = { action: 'ping', body: { } };
    setEndpointFromEvent(event);
    await sendMessageToAllPlayers(game, JSON.stringify(pingPayload));

    // Get current player
    // const { players, guests, gameStatus } = game;
    const { gameStatus } = game;

    /*
    let currentPlayer = _.find(players, (obj) => obj.id === connectionId);

    // Player not found, try in guests
    if (!currentPlayer) {
      currentPlayer = _.find(guests, (obj) => obj.id === connectionId);
    }
    */
    const currentPlayer = game.getPlayerOrGuestById(connectionId);

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
    const response = {
      action: 'playersInfo',
      body: { currentPlayer, gameStatus, players: game.players },
    };
    // setEndpointFromEvent(event);
    await apiGatewayWebsocketsService.send(connectionId, JSON.stringify(response));

    return {
      statusCode: 200,
      body: JSON.stringify('getGame OK!'),
    };
  } catch (error) {
    console.error(error);

    return {
      statusCode: 400,
      body: JSON.stringify(error),
    };
  }
};

export const reConnectHandler: APIGatewayProxyHandler = async (event) => {
  // Re-connect player to game
  const eventBody = JSON.parse(event.body);

  const { gameId, color, cachedConnectionId } = eventBody.data;
  const { connectionId } = event.requestContext;

  try {
    const game = await gameRepository.getByID(gameId);

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
      await gameRepository.update(game);
      // await gameService.updateGame(game);

      // Send game info to everyone
      setEndpointFromEvent(event);
      await sendGameInfoToAllPlayers(game);
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
      await sendMessageToAllPlayers(game, JSON.stringify(payload));
    }

    return {
      statusCode: 200,
      body: JSON.stringify('reConnectHandler OK!'),
    };
  } catch (error) {
    console.error(error);

    return {
      statusCode: 400,
      body: JSON.stringify(error),
    };
  }
};

export const startGameHandler: APIGatewayProxyHandler = async (event) => {
  console.log('Start Game handler');

  const eventBody = JSON.parse(event.body);
  const { gameId } = eventBody.data;

  try {
    // const game = await gameService.getGame(gameId);
    const game = await gameRepository.getByID(gameId);

    if (!game) {
      console.error(`Game ID ${gameId} not found`);

      return {
        statusCode: 400,
        body: JSON.stringify(`Game ID ${gameId} not found`),
      };
    }

    game.startGame();
    console.log('Game started!');

    // Update game
    await gameRepository.update(game);
    console.log('Game updated');

    // const response = { action: 'gameStarted', body: game };

    setEndpointFromEvent(event);
    // await sendMessageToAllPlayers(game, JSON.stringify(response));
    await sendGameInfoToEachPlayer(game);
    console.log('Message sent to all players!');

    // Send connection ID to each player
    await sendConnectionIdToEachPlayer(gameId);

    return {
      statusCode: 200,
      body: JSON.stringify('startGameHandler OK!'),
    };
  } catch (error) {
    console.error(error);

    return {
      statusCode: 400,
      body: JSON.stringify(error),
    };
  }
};

export const finishRoundHandler: APIGatewayProxyHandler = async (event) => {
  console.log('Finish round handler');

  const eventBody = JSON.parse(event.body);
  const { gameId, playerColor } = eventBody.data;

  const playerId = event.requestContext.connectionId;

  try {
    // Get game
    // const game = await gameService.getGame(gameId);
    const game = await gameRepository.getByID(gameId);

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

      // Send error message
      const errorPayload = { action: 'error', body: { errorMsg: error.message } };
      // Send message to that player
      setEndpointFromEvent(event);
      await apiGatewayWebsocketsService.send(playerId, JSON.stringify(errorPayload));

      return {
        statusCode: 400,
        body: JSON.stringify(error),
      };
    }

    console.log(`Player ${playerColor} finished his turn`);

    // Get game
    // const response = await gameService.updateGame(game);
    const response = await gameRepository.update(game);
    console.log('Game updated');

    const message = { action: ActionTypes.ROUND_FINISHED, body: response };

    setEndpointFromEvent(event);
    await sendMessageToAllPlayers(game, JSON.stringify(message));
    console.log('Message sent to all players!');

    return {
      statusCode: 200,
      body: JSON.stringify('finish turn OK!'),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 400,
      body: JSON.stringify(error),
    };
  }
};

export const addTroopsHandler: APIGatewayProxyHandler = async (event) => {
  console.log('Add troops handler');

  const eventBody = JSON.parse(event.body);
  const {
    gameId, country, count, playerColor,
  } = eventBody.data;

  const playerId = event.requestContext.connectionId;

  // Get game
  // const game = await gameService.getGame(gameId);
  try {
    const game = await gameRepository.getByID(gameId);
    console.log(`Got game ${game.UUID}`);

    game.addTroops(playerId, country, count);

    console.log(`Player ${playerColor} added ${count} troops to ${country}`);

    // Update game
    // const response = await gameService.updateGame(game);
    const response = await gameRepository.update(game);
    console.log('game updated!');
    // const response = await gameService.updateCountry(gameId, game.countries[country]);
    // console.log('Country updated!');

    const message = { action: ActionTypes.TROOPS_ADDED, body: game.getGame() };

    setEndpointFromEvent(event);
    await sendMessageToAllPlayers(game, JSON.stringify(message));
    console.log('Message sent to all players!');

    return {
      statusCode: 200,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error(error);

    // Send error message
    const errorPayload = { action: 'error', body: { errorMsg: error.message } };
    // Send message to that player
    setEndpointFromEvent(event);
    await apiGatewayWebsocketsService.send(playerId, JSON.stringify(errorPayload));

    return {
      statusCode: 400,
      body: JSON.stringify(error),
    };
  }
};

export const attackHandler: APIGatewayProxyHandler = async (event) => {
  console.log('Attack handler');

  const eventBody = JSON.parse(event.body);
  const {
    gameId, playerColor, attacker, defender,
  } = eventBody.data;

  // Check if it's that player's round
  const playerId = event.requestContext.connectionId;

  try {
    // Get game
    // const game = await gameService.getGame(gameId);
    const game = await gameRepository.getByID(gameId);
    console.log(`Got game ID ${gameId}`);

    if (!game) {
      console.error(`Game ID ${gameId} not found`);

      return {
        statusCode: 400,
        body: JSON.stringify(`Game ID ${gameId} not found`),
      };
    }

    // Attack
    const attackResponse = game.attack(playerId, attacker, defender);
    console.log(`Player ${playerColor} attacked ${defender} from ${attacker}`);

    // Update game
    // const response = await gameService.updateGame(game);
    await gameRepository.update(game);
    console.log('Game updated');

    const message = { action: 'countryAttacked', body: attackResponse };

    setEndpointFromEvent(event);
    await sendMessageToAllPlayers(game, JSON.stringify(message));
    console.log('Message sent to all players!');

    return {
      statusCode: 200,
      body: JSON.stringify('addTroops OK!'),
    };
  } catch (error) {
    console.error(error);

    // Send error message
    const errorPayload = { action: 'error', body: { errorMsg: error.message } };
    // Send message to that player
    setEndpointFromEvent(event);
    await apiGatewayWebsocketsService.send(playerId, JSON.stringify(errorPayload));

    return {
      statusCode: 400,
      body: JSON.stringify(error),
    };
  }
};

export const moveTroopsHandler: APIGatewayProxyHandler = async (event) => {
  console.log('Move Troops handler');

  const eventBody = JSON.parse(event.body);
  const {
    gameId, playerColor, source, target, count, conquest,
  } = eventBody.data;

  const playerId = event.requestContext.connectionId;

  try {
    // Get game
    // const game = await gameService.getGame(gameId);
    const game = await gameRepository.getByID(gameId);
    console.log(`Got game ID ${gameId}`);

    if (!game) {
      console.error(`Game ID ${gameId} not found`);

      return {
        statusCode: 400,
        body: JSON.stringify(`Game ID ${gameId} not found`),
      };
    }

    const response = game.moveTroops(playerId, source, target, count, conquest);
    console.log(`Player ${playerColor} moved ${count} troops from ${source} to ${target}`);

    // await gameService.updateGame(game);
    await gameRepository.update(game);
    console.log('Game updated');

    const message = { action: 'troopsMoved', body: response };

    setEndpointFromEvent(event);
    await sendMessageToAllPlayers(game, JSON.stringify(message));
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

export const getCardHandler: APIGatewayProxyHandler = async (event) => {
  console.log('Get card handler');

  const eventBody = JSON.parse(event.body);
  const { gameId } = eventBody.data;

  const playerId = event.requestContext.connectionId;

  try {
    // Get game
    // const game = await gameService.getGame(gameId);
    const game = await gameRepository.getByID(gameId);
    console.log(`Got game ID ${gameId}`);

    if (!game) {
      console.error(`Game ID ${gameId} not found`);

      return {
        statusCode: 400,
        body: JSON.stringify(`Game ID ${gameId} not found`),
      };
    }

    // Get card
    const response = game.getCountryCard(playerId);

    // Update game
    // await gameService.updateGame(game);
    await gameRepository.update(game);
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
    await sendMessageToAllPlayers(game, JSON.stringify(payloadBroadcast));
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

export const exchangeCardHandler: APIGatewayProxyHandler = async (event) => {
  console.log('Exchange card handler');

  const eventBody = JSON.parse(event.body);
  const { gameId, card } = eventBody.data;

  const playerId = event.requestContext.connectionId;

  try {
    // Get game
    // const game = await gameService.getGame(gameId);
    const game = await gameRepository.getByID(gameId);
    console.log(`Got game ID ${gameId}`);

    if (!game) {
      console.error(`Game ID ${gameId} not found`);

      return {
        statusCode: 400,
        body: JSON.stringify(`Game ID ${gameId} not found`),
      };
    }

    const response = game.exchangeCard(playerId, card);
    console.log('Changed Card');

    // Update game
    // await gameService.updateGame(game);
    await gameRepository.update(game);
    console.log('Game updated');

    const payload = {
      action: 'cardExchanged',
      body: { players: response.players, countries: response.countries },
    };

    // Send message to all player
    setEndpointFromEvent(event);
    await sendMessageToAllPlayers(game, JSON.stringify(payload));
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

export const exchangeCardsHandler: APIGatewayProxyHandler = async (event) => {
  console.log('Exchange cards handler');

  const eventBody = JSON.parse(event.body);
  const { gameId, cards } = eventBody.data;

  const playerId = event.requestContext.connectionId;

  try {
    // Get game
    // const game = await gameService.getGame(gameId);
    const game = await gameRepository.getByID(gameId);

    if (!game) {
      console.error(`Game ID ${gameId} not found`);

      return {
        statusCode: 400,
        body: JSON.stringify(`Game ID ${gameId} not found`),
      };
    }

    console.log(`Got game ID ${gameId}`);

    const response = game.exchangeCards(playerId, cards);
    console.log('Exchanged cards');

    // Update game
    await gameRepository.update(game);
    console.log('Game updated');

    const payload = { action: 'cardsExchanged', body: { players: response.players } };

    // Send message to all player
    setEndpointFromEvent(event);
    await sendMessageToAllPlayers(game, JSON.stringify(payload));
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

export const chatMessageHandler: APIGatewayProxyHandler = async (event) => {
  console.log('Chat message handler');

  const eventBody = JSON.parse(event.body);
  const {
    gameId, message,
  } = eventBody.data;

  const playerId = event.requestContext.connectionId;

  // Get game
  const game = await gameRepository.getByID(gameId);

  // Get player
  // const player = await gameService.getPlayerById(gameId, playerId);
  const player = game.getPlayerById(playerId);

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
  await sendMessageToAllPlayers(game, JSON.stringify(payload));

  return {
    statusCode: 200,
    body: JSON.stringify('chat Message OK!'),
  };
};
