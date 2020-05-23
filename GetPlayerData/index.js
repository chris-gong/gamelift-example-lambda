const AWS = require('aws-sdk');
const Cognito = new AWS.CognitoIdentityServiceProvider({region: 'us-east-1'});
const DynamoDb = new AWS.DynamoDB({region: 'us-east-1'});

exports.handler = async (event) => {
    let response;
    let raisedError;
    let accessToken;
    
    if (event.headers) {
        if (event.headers['Authorization']) {
            accessToken = event.headers['Authorization'];
        }
    }
    
    const cognitoRequestParams = {
        AccessToken: accessToken
    };
    
    let sub;
    
    await Cognito.getUser(cognitoRequestParams)
    .promise().then(data => {
        if (data && data.UserAttributes) {
            for (const attribute of data.UserAttributes) {
                if (attribute.Name == 'sub') {
                    sub = attribute.Value;
                    break;
                }
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
    
    const dynamoDbRequestParams = {
        TableName: 'Players',
        Key: {
            Id: {S: sub}
        }
    };
    
    let playerData;
    
    await DynamoDb.getItem(dynamoDbRequestParams)
    .promise().then(data => {
        if (data && data.Item) {
            playerData = data.Item;
        } 
        response = {
            statusCode: 200,
            body: JSON.stringify({
                'playerData': playerData
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
