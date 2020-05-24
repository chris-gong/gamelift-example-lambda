const AWS = require('aws-sdk');
const DynamoDb = new AWS.DynamoDB({region: 'us-east-1'});

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
    const dynamoDbRequestParams = {
        TableName: 'MatchmakingTickets',
        Key: {
            Id: {S: ticketId}
        }
    };
    
    let ticket;
    
    await DynamoDb.getItem(dynamoDbRequestParams)
    .promise().then(data => {
        if (data && data.Item) {
            ticket = data.Item;
        } 
        response = {
            statusCode: 200,
            body: JSON.stringify({
                'ticket': ticket
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
