export const newGameEvent = {
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
