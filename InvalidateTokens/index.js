const AWS = require('aws-sdk');
const Cognito = new AWS.CognitoIdentityServiceProvider({region: 'us-east-1'});

exports.handler = async (event) => {
    let response;
    let accessToken;
    
    if (event.headers) {
        if (event.headers['Authorization']) {
            accessToken = event.headers['Authorization'];
        }
    }
    
    const cognitoRequestParams = {
        AccessToken: accessToken
    };
    
    await Cognito.globalSignOut(cognitoRequestParams)
    .promise().then(data => {
        response = {
            statusCode: 200,
            body: JSON.stringify({
                success: 'user has signed out of cognito'
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
