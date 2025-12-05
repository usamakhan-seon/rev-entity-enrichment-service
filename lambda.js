// Lambda handler wrapper for Express app
const serverless = require('serverless-http');
const app = require('./server');

// Export the handler for AWS Lambda
module.exports.handler = serverless(app);

