const https = require('https');
const querystring = require('querystring');

const hostname = '<insert-your-user-pool-domain-here>';
const clientId = '<insert-your-user-pool-app-client-id-here>';
const callbackUrl = '<insert-your-user-pool-app-client-callback-url-here>';

exports.handler = async (event) => {
    let response;
    let code;
    
    if (event.body) {
        const body = JSON.parse(event.body);
        if (body.code) {
            code = body.code;
        }
    }
    
    if (!code) {
        response = {
            statusCode: 400,
            body: JSON.stringify({
                error: 'incoming request did not have a code'
            })
        };
        return response;
    }
    
    const options = {
        'hostname': hostname,
        port: 443,
        path: '/oauth2/token',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    };
    
    const tokenRequestData = querystring.stringify({
        'code': code,
        grant_type: 'authorization_code',
        client_id: clientId,
        redirect_uri: callbackUrl
    });
    
    const cognitoTokenRequest = new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            res.setEncoding('utf8');
            
            res.on('data', (data) => {
                return resolve(data);
            });
        });
        
        req.on('error', (error) => {
            return reject(error);
        });
        
        req.write(tokenRequestData);
        req.end();
    });
    
    try {
        const cognitoTokenResponse = await cognitoTokenRequest;
        response = {
            statusCode: 200,
            body: cognitoTokenResponse
        };
    } catch (error) {
        response = {
            statusCode: 400,
            body: JSON.stringify({
                error: 'request to oauth token endpoint failed'  
            })
        };
    }
    return response;
};