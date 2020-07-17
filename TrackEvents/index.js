const AWS = require('aws-sdk');
const DynamoDb = new AWS.DynamoDB({region: 'us-east-1'});

exports.handler = async (event) => {
    let message;
    let response;
    if (event.Records && event.Records.length > 0) {
        const record = event.Records[0];
        if (record.Sns && record.Sns.Message) {
            console.log('message from gamelift: ' + record.Sns.Message);
            message = JSON.parse(record.Sns.Message);
        }
    }
    
    if (!message || message['detail-type'] != 'GameLift Matchmaking Event') {
        response = {
            statusCode: 400,
            body: JSON.stringify({
                error: 'no message available or message is not about gamelift matchmaking'
            })
        };
        return response;
    }
    
    const messageDetail = message.detail;
    
    const dynamoDbRequestParams = {
        RequestItems: {
            MatchmakingTickets: []
        }
    };
    
    if (!messageDetail.tickets || messageDetail.tickets.length == 0) {
        response = {
            statusCode: 400,
            body: JSON.stringify({
                error: 'no tickets found'
            })
        };
        return response;
    }
    
    if (messageDetail.type == 'MatchmakingSucceeded' || messageDetail.type == 'MatchmakingTimedOut' || messageDetail.type == 'MatchmakingCancelled' || messageDetail.type == 'MatchmakingFailed') {
        for (const ticket of messageDetail.tickets) {
            const ticketItem = {};
            ticketItem.Id = {S: ticket.ticketId};
            ticketItem.Type = {S: messageDetail.type};
            ticketItem.ttl = {N: (Math.floor(Date.now() / 1000) + 3600).toString()};
            
            if (messageDetail.type == 'MatchmakingSucceeded') {
                ticketItem.Players = {L: []};
                const players = ticket.players;
                
                for (const player of players) {
                    const playerItem = {M: {}};
                    playerItem.M.PlayerId = {S: player.playerId};
                    if (player.playerSessionId) {
                        playerItem.M.PlayerSessionId = {S: player.playerSessionId};
                    }
                    
                    ticketItem.Players.L.push(playerItem);
                }
                
                ticketItem.GameSessionInfo = {
                    M: {
                        IpAddress: {S: messageDetail.gameSessionInfo.ipAddress},
                        Port: {N: messageDetail.gameSessionInfo.port.toString()}
                    }
                };
            }
            
            dynamoDbRequestParams.RequestItems.MatchmakingTickets.push({
                PutRequest: {
                    Item: ticketItem
                }
            });
        }
    }
    
    await DynamoDb.batchWriteItem(dynamoDbRequestParams)
    .promise().then(data => {
        response = {
            statusCode: 200,
            body: JSON.stringify({
                success: 'ticket data has been saved to dynamodb'
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
