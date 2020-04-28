exports.handler = async (event) => {
    let response;
    
    if (event.queryStringParameters) {
        const query = event.queryStringParameters;
        if (query.error) {
            response = {
                statusCode: 400,
                body: query.error_description
            };
            
            return response;
        }
    }
    
    response = {
        statusCode: 200,
        body: 'Sign in successful'
    };
    return response;
};
