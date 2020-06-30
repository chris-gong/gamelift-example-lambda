exports.handler = async (event, context, callback) => {
    const authCode = event.authorizationToken;
    
    if (authCode == 'dummy') {
        const policy = {
            Version: '2012-10-07',
            Statement: []
        };
        
        const statementOne = {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: event.methodArn
        };
        
        policy.Statement.push(statementOne);
        
        const response = {
            principalId: 'user',
            policyDocument: policy
        };
        
        callback(null, response);
    }
    else {
        callback('Unauthorized');
    }
};
