# REV Entity Enrichment Service

A Node.js REST API service that provides entity enrichment capabilities through external data sources. This service offers endpoints for searching and retrieving company and officer information.

## Features

- RESTful API with Express.js
- Company search and retrieval endpoints
- Officer search and retrieval endpoints
- Automatic data sanitization (removes sensitive URLs)
- CORS enabled for cross-origin requests
- Environment-based configuration
- AWS Lambda deployment ready

## Prerequisites

- Node.js (v18 or later)
- npm or yarn
- AWS Account (for deployment)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd rev-entity-enrichment-service
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
PORT=3000
OPEN_CORPORATES_URL=https://api.opencorporates.com/
OPEN_CORPORATES_KEY=your_api_key_here
NODE_ENV=development
```

## API Endpoints

### Company Endpoints

#### Search Companies
```
GET /api/companies/search
```

**Query Parameters:**
- `q` (required) - Search query string
- `jurisdiction_code` (optional) - Filter by jurisdiction
- Additional parameters supported by the external API

**Example:**
```bash
curl "http://localhost:3000/api/companies/search?q=Apple&jurisdiction_code=us"
```

#### Get Company Details
```
GET /api/companies/:jurisdiction_code/:company_number
```

**Path Parameters:**
- `jurisdiction_code` - Company jurisdiction code
- `company_number` - Company registration number

**Example:**
```bash
curl "http://localhost:3000/api/companies/us/12345678"
```

### Officer Endpoints

#### Search Officers
```
GET /api/officers/search
```

**Query Parameters:**
- `q` (required) - Search query string
- `jurisdiction_code` (optional) - Filter by jurisdiction
- Additional parameters supported by the external API

**Example:**
```bash
curl "http://localhost:3000/api/officers/search?q=John+Doe&jurisdiction_code=us"
```

#### Get Officer Details
```
GET /api/officers/:officer_id
```

**Path Parameters:**
- `officer_id` - Officer unique identifier

**Example:**
```bash
curl "http://localhost:3000/api/officers/123456"
```

## Response Format

All endpoints return JSON responses in the following format:

**Success Response:**
```json
{
  "success": true,
  "data": [...],
  "count": 10
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error description"
}
```

## Local Development

1. Start the development server:
```bash
npm run dev
```

2. Start the production server:
```bash
npm start
```

The server will run on `http://localhost:3000` by default.

## Deployment

This service is configured for deployment to AWS Lambda using the Serverless Framework.

### Prerequisites for Deployment

- AWS CLI configured with appropriate credentials
- Serverless Framework installed globally: `npm install -g serverless`

### Deploy to AWS

1. Configure your AWS credentials:
```bash
aws configure
```

2. Set environment variables:
```bash
export OPEN_CORPORATES_URL=https://api.opencorporates.com/
export OPEN_CORPORATES_KEY=your_api_key_here
```

3. Deploy:
```bash
npm run deploy
```

For production deployment:
```bash
npm run deploy:prod
```

4. Remove deployment:
```bash
npm run remove
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port (default: 3000) | No |
| `OPEN_CORPORATES_URL` | External API base URL | Yes |
| `OPEN_CORPORATES_KEY` | External API authentication key | Yes |
| `NODE_ENV` | Environment (development/production) | No |

## Project Structure

```
rev-entity-enrichment-service/
├── server.js              # Main Express application
├── lambda.js              # AWS Lambda handler wrapper
├── serverless.yml         # Serverless Framework configuration
├── package.json           # Dependencies and scripts
├── .env                   # Environment variables (not in git)
├── .gitignore            # Git ignore rules
└── README.md             # This file
```

## Scripts

- `npm start` - Start the production server
- `npm run dev` - Start development server with auto-reload
- `npm run deploy` - Deploy to AWS (dev stage)
- `npm run deploy:prod` - Deploy to AWS (production stage)
- `npm run remove` - Remove AWS deployment

## Data Sanitization

The service automatically removes sensitive URL fields from all API responses to protect data privacy. This sanitization happens efficiently with minimal performance impact.

## Error Handling

The service includes comprehensive error handling:
- Input validation
- External API error handling
- Graceful error responses
- Development mode error details

## License

ISC

## Support

For deployment issues, refer to [DEPLOYMENT.md](./DEPLOYMENT.md).

