const AWS = require('aws-sdk');
const DynamoDb = new AWS.DynamoDB({region: 'us-east-1'});

exports.handler = async (event) => {
    if (event.triggerSource && event.triggerSource == 'PostConfirmation_ConfirmSignUp') {
        if (event.request && event.request.userAttributes && event.request.userAttributes.sub) {
            const playerId = event.request.userAttributes.sub;
            const dynamoDbRequestParams = {
                TableName: 'Players',
                Item: {
                    Id: {S: playerId},
                    Wins: {N: '0'},
                    Losses: {N: '0'}
                }
            };
            
            await DynamoDb.putItem(dynamoDbRequestParams)
            .promise().then(data => {
                
            })
            .catch(err => {
                throw(err); 
            });
        }
    }
    return event;
};