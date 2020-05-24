const AWS = require('aws-sdk');
const GameLift = new AWS.GameLift({region: 'us-east-1'});

exports.handler = async (event) => {
    let response;
    let ticketId;
    
    if (event.body) {
        const body = JSON.parse(event.body);
        if (body.ticketId) {
            ticketId = body.ticketId;
        }
    }
    
    if (!ticketId) {
        response = {
            statusCode: 400,
            body: JSON.stringify({
                error: 'incoming request did not have a ticket id'
            })
        };
        return response;
    }
    
    const gameLiftRequestParams = {
        TicketId: ticketId
    };
    
    await GameLift.stopMatchmaking(gameLiftRequestParams)
    .promise().then(data => {
        response = {
            statusCode: 200,
            body: JSON.stringify({
                success: 'matchmaking request has been cancelled'
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
