import { connectHandler } from '../../src/handlers/connectionHandler';
import { joinGameHandler, newGameHandler } from '../../src/handlers/gameHandler';

const newGameEvent = {
    body: null,
    headers: {
        Host: 'localhost:3000',
        Connection: 'keep-alive',
        'Content-Length': '0',
        Accept: 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36',
        Origin: 'http://localhost:3005',
        'Sec-Fetch-Site': 'same-site',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Dest': 'empty',
        Referer: 'http://localhost:3005/',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-AU,en;q=0.9,es-AR;q=0.8,es;q=0.7,en-GB;q=0.6,en-US;q=0.5',
    },
    httpMethod: 'POST',
    isBase64Encoded: false,
    multiValueHeaders: {
        Host: ['localhost:3000'],
        Connection: ['keep-alive'],
        'Content-Length': ['0'],
        Accept: ['application/json, text/plain, */*'],
        'User-Agent': [
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36',
        ],
        Origin: ['http://localhost:3005'],
        'Sec-Fetch-Site': ['same-site'],
        'Sec-Fetch-Mode': ['cors'],
        'Sec-Fetch-Dest': ['empty'],
        Referer: ['http://localhost:3005/'],
        'Accept-Encoding': ['gzip, deflate, br'],
        'Accept-Language': ['en-AU,en;q=0.9,es-AR;q=0.8,es;q=0.7,en-GB;q=0.6,en-US;q=0.5'],
    },
    multiValueQueryStringParameters: null,
    path: '/new-game',
    pathParameters: null,
    queryStringParameters: null,
    requestContext: {
        accountId: 'offlineContext_accountId',
        apiId: 'offlineContext_apiId',
        authorizer: {
            claims: undefined,
            principalId: 'offlineContext_authorizer_principalId',
        },
        domainName: 'offlineContext_domainName',
        domainPrefix: 'offlineContext_domainPrefix',
        extendedRequestId: 'ckhsvspz9000090ic90859kag',
        httpMethod: 'POST',
        identity: {
            accessKey: null,
            accountId: 'offlineContext_accountId',
            apiKey: 'offlineContext_apiKey',
            caller: 'offlineContext_caller',
            cognitoAuthenticationProvider: 'offlineContext_cognitoAuthenticationProvider',
            cognitoAuthenticationType: 'offlineContext_cognitoAuthenticationType',
            cognitoIdentityId: 'offlineContext_cognitoIdentityId',
            cognitoIdentityPoolId: 'offlineContext_cognitoIdentityPoolId',
            principalOrgId: null,
            sourceIp: '127.0.0.1',
            user: 'offlineContext_user',
            userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36',
            userArn: 'offlineContext_userArn',
            apiKeyId: '',
        },
        path: '/new-game',
        protocol: 'HTTP/1.1',
        requestId: 'ckhsvspz9000190icdsvc72ln',
        requestTime: '22/Nov/2020:19:50:42 +1100',
        requestTimeEpoch: 1606035042686,
        resourceId: 'offlineContext_resourceId',
        resourcePath: '/local/new-game',
        stage: 'local',
    },
    resource: '/new-game',
    stageVariables: undefined,
};

let gameId: string;

describe('game handlers', () => {
    it('can call newGameHandler', async () => {
        expect.hasAssertions();

        const response = await newGameHandler(newGameEvent, null, null);

        expect(response && response.statusCode).toBe(200);
        expect(response && JSON.parse(response.body).newGameId !== '').toBe(true);
        gameId = JSON.parse(response && response.body).newGameId;
    });

    it('can call joinGameHandler', async () => {
        expect.hasAssertions();

        /*
        const connectEvent = {
            ...newGameEvent,
            queryStringParameters: {
                game_id: gameId,
            },
            requestContext: {
                ...newGameEvent.requestContext,
                connectionId: 'ckht56jkt000j90ic8pdb9975',
            },
        };
        */
        const connectEvent = {
            headers: {
                Host: 'localhost:3001',
                Connection: 'Upgrade',
                Pragma: 'no-cache',
                'Cache-Control': 'no-cache',
                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36',
                Upgrade: 'websocket',
                Origin: 'http://localhost:3005',
                'Sec-WebSocket-Version': '13',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-Language': 'en-AU,en;q=0.9,es-AR;q=0.8,es;q=0.7,en-GB;q=0.6,en-US;q=0.5',
                Cookie: 'wp-settings-time-1=1604133199',
                'Sec-WebSocket-Key': 'RhGepNh2CxNatG8P9f6l6A==',
                'Sec-WebSocket-Extensions': 'permessage-deflate; client_max_window_bits',
            },
            isBase64Encoded: false,
            multiValueHeaders: {
                Host: ['localhost:3001'],
                Connection: ['Upgrade'],
                Pragma: ['no-cache'],
                'Cache-Control': ['no-cache'],
                'User-Agent': [
                    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36',
                ],
                Upgrade: ['websocket'],
                Origin: ['http://localhost:3005'],
                'Sec-WebSocket-Version': ['13'],
                'Accept-Encoding': ['gzip, deflate, br'],
                'Accept-Language': ['en-AU,en;q=0.9,es-AR;q=0.8,es;q=0.7,en-GB;q=0.6,en-US;q=0.5'],
                Cookie: ['wp-settings-time-1=1604133199'],
                'Sec-WebSocket-Key': ['RhGepNh2CxNatG8P9f6l6A=='],
                'Sec-WebSocket-Extensions': ['permessage-deflate; client_max_window_bits'],
            },
            multiValueQueryStringParameters: { game_id: [gameId] },
            queryStringParameters: { game_id: gameId },
            requestContext: {
                apiId: 'private',
                connectedAt: 1606051775394,
                connectionId: 'ckht5rd0g0003njic1vnh5im0',
                domainName: 'localhost',
                eventType: 'CONNECT',
                extendedRequestId: 'ckht5rd0i0004njicgo5t0l66',
                identity: {
                    accessKey: null,
                    accountId: null,
                    caller: null,
                    cognitoAuthenticationProvider: null,
                    cognitoAuthenticationType: null,
                    cognitoIdentityId: null,
                    cognitoIdentityPoolId: null,
                    principalOrgId: null,
                    sourceIp: '127.0.0.1',
                    user: null,
                    userAgent: null,
                    userArn: null,
                    apiKey: 'offlineContext_apiKey',
                    apiKeyId: '',
                },
                messageDirection: 'IN',
                messageId: 'ckht5rd0i0005njicaf5751xr',
                requestId: 'ckht5rd0i0006njic3twz4rqi',
                requestTime: '23/Nov/2020:00:29:35 +1100',
                requestTimeEpoch: 1606051775394,
                routeKey: '$connect',
                stage: 'local',
                protocol: 'HTTP/1.1',
                accountId: 'offlineContext_accountId',
                authorizer: {
                    claims: undefined,
                    principalId: 'offlineContext_authorizer_principalId',
                },
                httpMethod: 'POST',
                path: '/new-game',
                resourceId: 'offlineContext_resourceId',
                resourcePath: '/local/new-game',
            },
            body: null,
            httpMethod: '',
            path: '',
            pathParameters: {},
            stageVariables: {},
            resource: '',
        };

        const connectResponse = await connectHandler(connectEvent, null, null);

        console.log('connectResponse', connectResponse);

        const event = {
            ...connectEvent,
            body: JSON.stringify({
                data: {
                    gameId,
                    cachedConnectionId: '',
                    color: 'red',
                },
            }),
        };

        const joinGameHandlerEvent = {
            body: `{"data":{"gameId":"${gameId}","username":"azul","color":"blue"},"action":"joinGame"}`,
            isBase64Encoded: false,
            requestContext: {
                apiId: 'private',
                connectedAt: 1606052588176,
                connectionId: 'ckht5rd0g0003njic1vnh5im0',
                domainName: 'localhost',
                eventType: 'MESSAGE',
                extendedRequestId: 'ckht68s5s0015njic2m2ma76p',
                identity: {
                    accessKey: null,
                    accountId: null,
                    caller: null,
                    cognitoAuthenticationProvider: null,
                    cognitoAuthenticationType: null,
                    cognitoIdentityId: null,
                    cognitoIdentityPoolId: null,
                    principalOrgId: null,
                    sourceIp: '127.0.0.1',
                    user: null,
                    userAgent: null,
                    userArn: null,
                    apiKey: 'offlineContext_apiKey',
                    apiKeyId: '',
                },
                messageDirection: 'IN',
                messageId: 'ckht68s5s0016njicgk1e9ey9',
                requestId: 'ckht68s5s0017njichj326uhj',
                requestTime: '23/Nov/2020:00:43:08 +1100',
                requestTimeEpoch: 1606052588176,
                routeKey: 'joinGame',
                stage: 'local',
                protocol: 'HTTP/1.1',
                accountId: 'offlineContext_accountId',
                authorizer: {
                    claims: undefined,
                    principalId: 'offlineContext_authorizer_principalId',
                },
                httpMethod: 'POST',
                path: '/new-game',
                resourceId: 'offlineContext_resourceId',
                resourcePath: '/local/new-game',
            },
            headers: {
                Host: 'localhost:3001',
                Connection: 'Upgrade',
                Pragma: 'no-cache',
                'Cache-Control': 'no-cache',
                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36',
                Upgrade: 'websocket',
                Origin: 'http://localhost:3005',
                'Sec-WebSocket-Version': '13',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-Language': 'en-AU,en;q=0.9,es-AR;q=0.8,es;q=0.7,en-GB;q=0.6,en-US;q=0.5',
                Cookie: 'wp-settings-time-1=1604133199',
                'Sec-WebSocket-Key': 'RhGepNh2CxNatG8P9f6l6A==',
                'Sec-WebSocket-Extensions': 'permessage-deflate; client_max_window_bits',
            },
            multiValueHeaders: {
                Host: ['localhost:3001'],
                Connection: ['Upgrade'],
                Pragma: ['no-cache'],
                'Cache-Control': ['no-cache'],
                'User-Agent': [
                    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36',
                ],
                Upgrade: ['websocket'],
                Origin: ['http://localhost:3005'],
                'Sec-WebSocket-Version': ['13'],
                'Accept-Encoding': ['gzip, deflate, br'],
                'Accept-Language': ['en-AU,en;q=0.9,es-AR;q=0.8,es;q=0.7,en-GB;q=0.6,en-US;q=0.5'],
                Cookie: ['wp-settings-time-1=1604133199'],
                'Sec-WebSocket-Key': ['RhGepNh2CxNatG8P9f6l6A=='],
                'Sec-WebSocket-Extensions': ['permessage-deflate; client_max_window_bits'],
            },
            httpMethod: '',
            path: '',
            pathParameters: {},
            stageVariables: {},
            resource: '',
            multiValueQueryStringParameters: { game_id: [gameId] },
            queryStringParameters: { game_id: gameId },
        };

        console.log(event);

        const response = await joinGameHandler(joinGameHandlerEvent, null, null);

        expect(response && response.statusCode).toBe(200);
        expect(response && JSON.parse(response.body)).toBe('joinGameHandler OK!');
    });
});
