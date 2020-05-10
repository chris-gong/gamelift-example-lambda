const AWS = require('aws-sdk');
const Cognito = new AWS.CognitoIdnetityServiceProvider({region: 'us-east-1'});

exports.handler = async (event) => {
    if (event.userName && event.userPoolId && event.request && event.request.userAttributes && event.request.userAttributes.email) {
        const cognitoRequestParams = {
            UserPoolId: event.userPoolId,
            Filter: 'email = "' + event.request.userAttributes.email + '"'
        };
        
        await Cognito.listUsers(cognitoRequestParams)
        .promise().then(data => {
            if (data.Users.length > 0 && data.Users[0].Username.toLowerCase() != event.userName.toLowerCase()) {
                throw new Error('An account already exists for that email');
            }
        })
        .catch(err => {
            throw(err);
        });
    }
    return event;
};
