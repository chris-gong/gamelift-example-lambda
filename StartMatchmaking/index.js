const AWS = require('aws-sdk');
const Lambda = new AWS.Lambda({region: 'us-east-1'});
const GameLift = new AWS.GameLift({region: 'us-east-1'});

exports.handler = async (event) => {
    let response;
    let raisedError;
    let latencyMap;
    
    if (event.body) {
        const body = JSON.parse(event.body);
        if (body.latencyMap) {
            latencyMap = body.latencyMap;
        }
    }
    if (!latencyMap) {
        response = {
            statusCode: 400,
            body: JSON.stringify({
                error: 'incoming request did not have a latency map'
            })
        };
        return response;
    }
    
    const lambdaRequestParams = {
        FunctionName: 'GetPlayerData',
        Payload: JSON.stringify(event)
    };
    
    let playerData;
    
    await Lambda.invoke(lambdaRequestParams)
    .promise().then(data => {
        if (data && data.Payload) {
            const payload = JSON.parse(data.Payload);
            if (payload.body) {
                const payloadBody = JSON.parse(payload.body);
                playerData = payloadBody.playerData;
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
    } else if (!playerData) {
        response = {
            statusCode: 400,
            body: JSON.stringify({
                error: 'unable to retrieve player data'
            })
        };
        return response;
    }
    
    const playerId = playerData.Id.S;
    const playerWins = parseInt(playerData.Wins.N, 10);
    const playerLosses = parseInt(playerData.Losses.N, 10);
    const totalGamesPlayed = playerWins + playerLosses;
    
    let playerSkill;
    
    if (totalGamesPlayed < 1) {
        playerSkill = 50;
    } else {
        playerSkill = (playerWins / totalGamesPlayed) * 100;
    }
    
    const gameLiftRequestParams = {
        ConfigurationName: 'GameLiftTutorialMatchmaker',
        Players: [{
            LatencyInMs: latencyMap,
            PlayerId: playerId,
            PlayerAttributes: {
                skill: {
                    N: playerSkill
                }
            }
        }]
    };
    
    console.log('matchmaking request: ' + JSON.stringify(gameLiftRequestParams));
    
    let ticketId;
    
    await GameLift.startMatchmaking(gameLiftRequestParams)
    .promise().then(data => {
        if (data && data.MatchmakingTicket) {
            ticketId = data.MatchmakingTicket.TicketId;
        } 
        response = {
            statusCode: 200,
            body: JSON.stringify({
                'ticketId': ticketId
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
