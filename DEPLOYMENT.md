# AWS Lambda + API Gateway Deployment Guide

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **Node.js** (v18 or later)
3. **AWS CLI** installed and configured
4. **Serverless Framework** installed globally: `npm install -g serverless`

## Step-by-Step Deployment

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Configure Environment Variables

Create a `.env` file or set environment variables:

```bash
export OPEN_CORPORATES_URL=https://api.opencorporates.com/
export OPEN_CORPORATES_KEY=your_api_key_here
```

**For Production:** Use AWS Systems Manager Parameter Store or Secrets Manager instead of environment variables for sensitive data.

### Step 3: Configure AWS Credentials

```bash
aws configure
```

Or set environment variables:
```bash
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_DEFAULT_REGION=us-east-1
```

### Step 4: Update serverless.yml

Edit `serverless.yml` to:
- Change `region` to your preferred AWS region
- Adjust `memorySize` and `timeout` if needed
- Update environment variables

### Step 5: Deploy to AWS

```bash
# Deploy to dev stage
serverless deploy

# Deploy to production stage
serverless deploy --stage prod
```

### Step 6: Get Your API Endpoint

After deployment, you'll see output like:
```
endpoints:
  ANY - https://xxxxx.execute-api.us-east-1.amazonaws.com/{proxy+}
  ANY - https://xxxxx.execute-api.us-east-1.amazonaws.com/
```

Use this URL to access your API:
- Company search: `https://xxxxx.execute-api.us-east-1.amazonaws.com/api/companies/search?q=Apple`
- Company fetch: `https://xxxxx.execute-api.us-east-1.amazonaws.com/api/companies/us/12345678`
- Officer search: `https://xxxxx.execute-api.us-east-1.amazonaws.com/api/officers/search?q=John+Doe`
- Officer fetch: `https://xxxxx.execute-api.us-east-1.amazonaws.com/api/officers/123456`

## Alternative: Using AWS SAM

If you prefer AWS SAM instead of Serverless Framework:

1. Create `template.yaml` (SAM template)
2. Build: `sam build`
3. Deploy: `sam deploy --guided`

## Environment Variables in AWS

### Option 1: Direct in serverless.yml (for non-sensitive)
Already configured in `serverless.yml`

### Option 2: AWS Systems Manager Parameter Store (Recommended for production)

Update `serverless.yml`:
```yaml
environment:
  OPEN_CORPORATES_URL: ${ssm:/rev-entity-enrichment/OPEN_CORPORATES_URL}
  OPEN_CORPORATES_KEY: ${ssm:/rev-entity-enrichment/OPEN_CORPORATES_KEY~true}  # ~true for encrypted
```

Create parameters:
```bash
aws ssm put-parameter --name "/rev-entity-enrichment/OPEN_CORPORATES_URL" --value "https://api.opencorporates.com/" --type String
aws ssm put-parameter --name "/rev-entity-enrichment/OPEN_CORPORATES_KEY" --value "your_key" --type SecureString
```

## Monitoring & Logs

View logs:
```bash
serverless logs -f api --tail
```

Or use AWS CloudWatch:
- Go to CloudWatch → Log Groups
- Find `/aws/lambda/rev-entity-enrichment-service-dev-api`

## Updating the Deployment

After making changes:
```bash
serverless deploy
```

## Removing the Deployment

```bash
serverless remove
```

## Cost Optimization Tips

1. **Memory**: Start with 512MB, adjust based on performance
2. **Timeout**: Set appropriate timeout (30s default)
3. **Provisioned Concurrency**: Only if you need consistent performance
4. **Reserved Concurrency**: Limit concurrent executions if needed

## Troubleshooting

### Cold Start Issues
- Consider using Provisioned Concurrency for production
- Optimize package size (remove unused dependencies)

### Timeout Errors
- Increase `timeout` in serverless.yml
- Check OpenCorporates API response times

### CORS Issues
- CORS is enabled in serverless.yml
- Verify API Gateway CORS settings if issues persist

### Environment Variables Not Working
- Check AWS Lambda console → Configuration → Environment variables
- Verify parameter names match in serverless.yml