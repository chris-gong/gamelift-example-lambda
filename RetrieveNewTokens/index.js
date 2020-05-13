const AWS = require('aws-sdk');
const Cognito = new AWS.CognitoIdentityServiceProvider({region: 'us-east-1'});

const clientId = '<insert-your-user-pool-app-client-id-here>';

exports.handler = async (event) => {
    let response;
    let refreshToken;
    
    if (event.body) {
        const body = JSON.parse(event.body);
        if (body.refreshToken) {
            refreshToken = body.refreshToken;
        }
    }
    
    if (!refreshToken) {
        response = {
            statusCode: 400,
            body: JSON.stringify({
                error: 'incoming request did not have a refresh token'
            })
        };
        return response;
    }
    
    const cognitoRequestParams = {
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        AuthParameters: {
            REFRESH_TOKEN: refreshToken
        },
        ClientId: clientId
    };
    
    let newAccessToken;
    let newIdToken;
    
    await Cognito.initiateAuth(cognitoRequestParams)
    .promise().then(data => {
        if (data && data.AuthenticationResult) {
            newAccessToken = data.AuthenticationResult.AccessToken;
            newIdToken = data.AuthenticationResult.IdToken;
        } 
        
        response = {
            statusCode: 200,
            body: JSON.stringify({
                accessToken: newAccessToken,
                idToken: newIdToken
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
