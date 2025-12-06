const express = require('express');
const cors = require('cors');
const https = require('https');
const jp = require('jsonpath');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helper function to build query parameters for OpenCorporates API
function buildOpenCorporatesParams(userQuery, apiToken) {
  const params = new URLSearchParams();
  
  // Add all user-provided query parameters
  for (const [key, value] of Object.entries(userQuery)) {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, value);
    }
  }
  
  // Always add API token (will override if user somehow provided it)
  params.set('api_token', apiToken);
  
  return params;
}

// Helper function to recursively remove opencorporates_url from objects and arrays (mutates in-place for performance)
function removeOpenCorporatesUrl(data) {
  if (data === null || data === undefined) {
    return data;
  }
  
  // Handle arrays - process each element
  if (Array.isArray(data)) {
    for (let i = 0; i < data.length; i++) {
      data[i] = removeOpenCorporatesUrl(data[i]);
    }
    return data;
  }
  
  // Handle objects - mutate in-place for better performance
  if (typeof data === 'object') {
    // Delete opencorporates_url if it exists
    if ('opencorporates_url' in data) {
      delete data.opencorporates_url;
    }
    // Recursively process all properties
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        data[key] = removeOpenCorporatesUrl(data[key]);
      }
    }
    return data;
  }
  
  // Return primitive values as-is
  return data;
}

// GET endpoint - Search companies using OpenCorporates API
app.get('/api/companies/search', (req, res) => {
  // Validate required parameters
  if (!req.query.q) {
    return res.status(400).json({
      success: false,
      message: 'Missing required parameter: q (query) is required'
    });
  }
  
  // Get API token and URL from environment variables
  const apiToken = process.env.OPEN_CORPORATES_KEY;
  const apiUrl = process.env.OPEN_CORPORATES_URL || 'https://api.opencorporates.com/';
  
  if (!apiToken) {
    return res.status(500).json({
      success: false,
      message: 'API token not configured. Please set OPEN_CORPORATES_KEY in .env file'
    });
  }
  
  // Build query parameters - pass through all user query params
  const params = buildOpenCorporatesParams(req.query, apiToken);
  const path = `/v0.4/companies/search?${params.toString()}`;
  
  // Parse the base URL to get hostname
  const urlObj = new URL(apiUrl);
  
  // Set up HTTPS request options
  const options = {
    hostname: urlObj.hostname,
    port: urlObj.port || 443,
    path: path,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  // Make the request to OpenCorporates API
  const ocRequest = https.request(options, (ocResponse) => {
    let data = '';
    
    // Collect response data
    ocResponse.on('data', (chunk) => {
      data += chunk;
    });
    
    // Process response when complete
    ocResponse.on('end', () => {
      try {
        const payload = JSON.parse(data);
        
        // Remove opencorporates_url from entire payload once (before extraction for efficiency)
        removeOpenCorporatesUrl(payload);
        
        // Use JSONPath to extract companies (now from cleaned payload)
        const companies = jp.query(payload, '$.results.companies..company');
        
        res.json({
          success: true,
          count: companies.length,
          data: companies,
          query: req.query.q
        });
      } catch (error) {
        console.error('Error parsing response:', error);
        res.status(500).json({
          success: false,
          message: 'Error processing API response',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    });
  });
  
  // Handle request errors
  ocRequest.on('error', (error) => {
    console.error('Error making request to API:', error);
    res.status(500).json({
      success: false,
      message: 'Error connecting to API',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  });
  
  // Send the request
  ocRequest.end();
});

// GET endpoint - Get company details by jurisdiction code and company number
app.get('/api/companies/:jurisdiction_code/:company_number', (req, res) => {
  const { jurisdiction_code, company_number } = req.params;
  
  // Validate required parameters
  if (!jurisdiction_code || !company_number) {
    return res.status(400).json({
      success: false,
      message: 'Missing required parameters: jurisdiction_code and company_number are required'
    });
  }
  
  // Get API token and URL from environment variables
  const apiToken = process.env.OPEN_CORPORATES_KEY;
  const apiUrl = process.env.OPEN_CORPORATES_URL || 'https://api.opencorporates.com/';
  
  if (!apiToken) {
    return res.status(500).json({
      success: false,
      message: 'API token not configured. Please set OPEN_CORPORATES_KEY in .env file'
    });
  }
  
  // Build query parameters - pass through all user query params
  const params = buildOpenCorporatesParams(req.query, apiToken);
  const path = `/v0.4/companies/${jurisdiction_code}/${company_number}?${params.toString()}`;
  
  // Parse the base URL to get hostname
  const urlObj = new URL(apiUrl);
  
  // Set up HTTPS request options
  const options = {
    hostname: urlObj.hostname,
    port: urlObj.port || 443,
    path: path,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  // Make the request to API
  const ocRequest = https.request(options, (ocResponse) => {
    let data = '';
    
    // Collect response data
    ocResponse.on('data', (chunk) => {
      data += chunk;
    });
    
    // Process response when complete
    ocResponse.on('end', () => {
      try {
        const payload = JSON.parse(data);
        
        // Check if the response indicates an error
        if (ocResponse.statusCode !== 200) {
          return res.status(ocResponse.statusCode).json({
            success: false,
            message: 'Error from API',
            data: payload
          });
        }
        
        // Remove opencorporates_url from entire payload once (before extraction for efficiency)
        removeOpenCorporatesUrl(payload);
        
        // Extract company details using JSONPath (now from cleaned payload)
        const company = jp.query(payload, '$.results.company');
        const officers = jp.query(payload, '$.results.company.officers..officer') || [];
        const beneficialOwners = jp.query(payload, '$.results.company.ultimate_beneficial_owners..ultimate_beneficial_owner') || [];
        const filings = jp.query(payload, '$.results.company.filings..filing') || [];
        
        res.json({
          success: true,
          data: {
            company: company.length > 0 ? company[0] : null,
            officers: officers,
            beneficialOwners: beneficialOwners,
            filings: filings,
            counts: {
              officers: officers.length,
              beneficialOwners: beneficialOwners.length,
              filings: filings.length
            }
          },
          jurisdiction_code: jurisdiction_code,
          company_number: company_number
        });
      } catch (error) {
        console.error('Error parsing response:', error);
        res.status(500).json({
          success: false,
          message: 'Error processing API response',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    });
  });
  
  // Handle request errors
  ocRequest.on('error', (error) => {
    console.error('Error making request to API:', error);
    res.status(500).json({
      success: false,
      message: 'Error connecting to API',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  });
  
  // Send the request
  ocRequest.end();
});

// GET endpoint - Search officers using OpenCorporates API
app.get('/api/person/search', (req, res) => {
  // Validate required parameters
  if (!req.query.q) {
    return res.status(400).json({
      success: false,
      message: 'Missing required parameter: q (query) is required'
    });
  }
  
  // Get API token and URL from environment variables
  const apiToken = process.env.OPEN_CORPORATES_KEY;
  const apiUrl = process.env.OPEN_CORPORATES_URL || 'https://api.opencorporates.com/';
  
  if (!apiToken) {
    return res.status(500).json({
      success: false,
      message: 'API token not configured. Please set OPEN_CORPORATES_KEY in .env file'
    });
  }
  
  // Build query parameters - pass through all user query params
  const params = buildOpenCorporatesParams(req.query, apiToken);
  const path = `/v0.4/officers/search?${params.toString()}`;
  
  // Parse the base URL to get hostname
  const urlObj = new URL(apiUrl);
  
  // Set up HTTPS request options
  const options = {
    hostname: urlObj.hostname,
    port: urlObj.port || 443,
    path: path,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  // Make the request to OpenCorporates API
  const ocRequest = https.request(options, (ocResponse) => {
    let data = '';
    
    // Collect response data
    ocResponse.on('data', (chunk) => {
      data += chunk;
    });
    
    // Process response when complete
    ocResponse.on('end', () => {
      try {
        const payload = JSON.parse(data);
        
        // Remove opencorporates_url from entire payload once (before extraction for efficiency)
        removeOpenCorporatesUrl(payload);
        
        // Use JSONPath to extract officers (now from cleaned payload)
        const officers = jp.query(payload, '$.results.officers..officer');
        
        res.json({
          success: true,
          count: officers.length,
          data: officers,
          query: req.query.q
        });
      } catch (error) {
        console.error('Error parsing response:', error);
        res.status(500).json({
          success: false,
          message: 'Error processing API response',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    });
  });
  
  // Handle request errors
  ocRequest.on('error', (error) => {
    console.error('Error making request to API:', error);
    res.status(500).json({
      success: false,
      message: 'Error connecting to API',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  });
  
  // Send the request
  ocRequest.end();
});

// GET endpoint - Fetch a specific officer by ID
app.get('/api/person/:officer_id', (req, res) => {
  const { officer_id } = req.params;
  
  // Validate required parameters
  if (!officer_id) {
    return res.status(400).json({
      success: false,
      message: 'Missing required parameter: officer_id is required'
    });
  }
  
  // Get API token and URL from environment variables
  const apiToken = process.env.OPEN_CORPORATES_KEY;
  const apiUrl = process.env.OPEN_CORPORATES_URL || 'https://api.opencorporates.com/';
  
  if (!apiToken) {
    return res.status(500).json({
      success: false,
      message: 'API token not configured. Please set OPEN_CORPORATES_KEY in .env file'
    });
  }
  
  // Build query parameters - pass through all user query params
  const params = buildOpenCorporatesParams(req.query, apiToken);
  const path = `/v0.4/officers/${officer_id}?${params.toString()}`;
  
  // Parse the base URL to get hostname
  const urlObj = new URL(apiUrl);
  
  // Set up HTTPS request options
  const options = {
    hostname: urlObj.hostname,
    port: urlObj.port || 443,
    path: path,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  // Make the request to OpenCorporates API
  const ocRequest = https.request(options, (ocResponse) => {
    let data = '';
    
    // Collect response data
    ocResponse.on('data', (chunk) => {
      data += chunk;
    });
    
    // Process response when complete
    ocResponse.on('end', () => {
      try {
        const payload = JSON.parse(data);
        
        // Check if the response indicates an error
        if (ocResponse.statusCode !== 200) {
          return res.status(ocResponse.statusCode).json({
            success: false,
            message: 'Error from API',
            data: payload
          });
        }
        
        // Remove opencorporates_url from entire payload once (before extraction for efficiency)
        removeOpenCorporatesUrl(payload);
        
        // Extract officer details using JSONPath (now from cleaned payload)
        const officer = jp.query(payload, '$.results.officer');
        const companies = jp.query(payload, '$.results.officer.relationships..relationship') || [];
        
        res.json({
          success: true,
          data: {
            officer: officer.length > 0 ? officer[0] : null,
            companies: companies,
            counts: {
              companies: companies.length
            }
          },
          officer_id: officer_id
        });
      } catch (error) {
        console.error('Error parsing response:', error);
        res.status(500).json({
          success: false,
          message: 'Error processing API response',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    });
  });
  
  // Handle request errors
  ocRequest.on('error', (error) => {
    console.error('Error making request to API:', error);
    res.status(500).json({
      success: false,
      message: 'Error connecting to API',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  });
  
  // Send the request
  ocRequest.end();
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Export app for Lambda, or start server if running locally
if (require.main === module) {
  // Running directly (local development)
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

// Export app for Lambda handler
module.exports = app;

