import swaggerJSDoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'HealthLink Middleware API',
    version: '1.0.0',
    description: 'Middleware API for HealthLink (Ethereum-backed healthcare services)',
  },
  servers: [
    {
      url: '/api/v1',
      description: 'Base URL for API version 1',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      StandardResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
          },
          message: {
            type: 'string',
          },
          error: {
            type: 'string',
          },
        },
      },
    },
  },
};

const options = {
  swaggerDefinition,
  // Point to the API route files to pick up JSDoc comments
  apis: ['./src/routes/*.js', './src/routes/**/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;
