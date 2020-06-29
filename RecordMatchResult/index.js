const AWS = require('aws-sdk');
const GameLift = new AWS.GameLift({region: 'us-east-1'});
const DynamoDb = new AWS.DynamoDB({region: 'us-east-1'});

exports.handler = async (event) => {
    let response;
    let raisedError;
    let gameSessionId;
    let winningTeam;
    
    if (event.body) {
        const body = JSON.parse(event.body);
        if (body.gameSessionId) {
            gameSessionId = body.gameSessionId;
        }
        if (body.winningTeam) {
            winningTeam = body.winningTeam;
        }
    }
    
    if (winningTeam != 'cowboys' && winningTeam != 'aliens') {
        response = {
            statusCode: 400,
            body: JSON.stringify({
                error: 'incoming request did not have a valid winning team'
            })
        };
        return response;
    }
    
    const dynamoDbGetRequestParams = {
        TableName: 'MatchResults',
        Key: {
            Id: {S: gameSessionId}
        },
        ProjectionExpression: 'Id'
    };
    
    const dynamoDbGetMatchResultPromise = DynamoDb.getItem(dynamoDbGetRequestParams).promise();
    
    const gameLiftRequestParams = {
        GameSessionId: gameSessionId
    };
    
    const gameLiftDescribeGameSessionPromise = GameLift.describeGameSessions(gameLiftRequestParams).promise();
    
    let gameSession;
    
    await Promise.all([dynamoDbGetMatchResultPromise, gameLiftDescribeGameSessionPromise])
    .then(values => {
        if (values[0] && values[0].Item) {
            raisedError = 'the result of this match has already been recorded';
        }
        else {
            if (values[1] && values[1].GameSessions && values[1].GameSessions.length > 0) {
                gameSession = values[1].GameSessions[0];
            }
            else {
                raisedError = 'unable to retrieve game session data';
            }
        }
    })
    .catch(err => {
        raisedError = err;
    });
    
    if (raisedError) {
        response = {
            statusCode: 400,
            body: JSON.stringify({
                error: raisedError
            })
        };
        return response;
    }
    
    const matchmakerData = JSON.parse(gameSession.MatchmakerData);
    const playerIdToTeamMap = {};
    const dynamoDbPutRequestParams = {
        TableName: 'MatchResults',
        Item: {
            Id: {
                S: gameSessionId
            }
        }
    };
    
    const dynamoDbBatchGetRequestParams = {
        RequestItems: {
            Players: {
                Keys: []
            }
        }
    };
    
    for (const team of matchmakerData.teams) {
        const teamName = team.name;
        let isWinningTeam = true;
        if (teamName == winningTeam) {
            dynamoDbPutRequestParams.Item.WinningTeam = {
                M: {
                    Name: {S: teamName},
                    Players: {L: []}
                }
            };
        }
        else {
            dynamoDbPutRequestParams.Item.LosingTeam = {
                M: {
                    Name: {S: teamName},
                    Players: {L: []}
                }
            };
            isWinningTeam = false;
        }
        
        for (const player of team.players) {
            const playerId = player.playerId;
            const playerSkill = player.attributes.skill.valueAttribute;
            
            dynamoDbBatchGetRequestParams.RequestItems.Players.Keys.push({
                Id: {S: playerId}
            });
            
            const playerItem = {M: {}};
            playerItem.M.Id = {S: playerId};
            playerItem.M.Skill = {N: playerSkill.toString()};
            
            if (isWinningTeam) {
                dynamoDbPutRequestParams.Item.WinningTeam.M.Players.L.push(playerItem);
            }
            else {
                dynamoDbPutRequestParams.Item.LosingTeam.M.Players.L.push(playerItem);
            }
            
            playerIdToTeamMap[playerId] = teamName;
        }
    }
    
    let playerArray;
    
    await DynamoDb.batchGetItem(dynamoDbBatchGetRequestParams)
    .promise().then(data => {
        if (data && data.Responses && data.Responses.Players && data.Responses.Players.length > 0) {
            playerArray = data.Responses.Players;
        }
        else {
            raisedError = 'no player data found';
        }
    })
    .catch(err => {
        raisedError = err;
    });
    
    if (raisedError) {
        response = {
            statusCode: 400,
            body: JSON.stringify({
                error: raisedError
            })
        };
        return response;
    }
    
    const dynamoDbBatchWriteRequestParams = {
        RequestItems: {
            Players: []
        }
    };
    
    for (const player of playerArray) {
        const playerItem = {};
        const playerId = player.Id.S;
        playerItem.Id = {S: playerId};
        
        if (playerIdToTeamMap[playerId] == winningTeam) {
            playerItem.Wins = {N: (parseInt(player.Wins.N, 10) + 1).toString()};
            playerItem.Losses = {N: player.Losses.N};
        }
        else {
            playerItem.Wins = {N: player.Wins.N};
            playerItem.Losses = {N: (parseInt(player.Losses.N, 10) + 1).toString()};
        }
        
        dynamoDbBatchWriteRequestParams.RequestItems.Players.push({
            PutRequest: {
                Item: playerItem
            }
        });
    }
    
    const dynamoDbWriteMatchResultPromise = DynamoDb.putItem(dynamoDbPutRequestParams).promise();
    const dynamoDbUpdatePlayerStatsPromise = DynamoDb.batchWriteItem(dynamoDbBatchWriteRequestParams).promise();
    
    await Promise.all([dynamoDbWriteMatchResultPromise, dynamoDbUpdatePlayerStatsPromise])
    .then(values => {
        response = {
            statusCode: 200,
            body: JSON.stringify({
                success: 'match result has been recorded'
            })
        };
    })
    .catch(err => {
        response = {
            statusCode: 400,
            body: JSON.stringify({
                error: err
            })
        };
    });
    
    return response;
};
