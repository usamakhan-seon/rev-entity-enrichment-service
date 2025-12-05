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

// In-memory data store (replace with database in production)
let users = [
  { id: 1, name: 'John Doe', email: 'john@example.com' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
];

let posts = [
  { id: 1, title: 'First Post', content: 'This is the first post', authorId: 1 },
  { id: 2, title: 'Second Post', content: 'This is the second post', authorId: 2 }
];

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// GET endpoint - Get all users
app.get('/api/users', (req, res) => {
  res.json({
    success: true,
    count: users.length,
    data: users
  });
});

// GET endpoint - Get user by ID
app.get('/api/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const user = users.find(u => u.id === userId);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  res.json({
    success: true,
    data: user
  });
});

// POST endpoint - Create a new user
app.post('/api/users', (req, res) => {
  const { name, email } = req.body;
  
  if (!name || !email) {
    return res.status(400).json({
      success: false,
      message: 'Name and email are required'
    });
  }
  
  const newUser = {
    id: users.length + 1,
    name,
    email
  };
  
  users.push(newUser);
  
  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: newUser
  });
});

// GET endpoint - Get all posts
app.get('/api/posts', (req, res) => {
  res.json({
    success: true,
    count: posts.length,
    data: posts
  });
});

// PUT endpoint - Update a post
app.put('/api/posts/:id', (req, res) => {
  const postId = parseInt(req.params.id);
  const { title, content } = req.body;
  
  const postIndex = posts.findIndex(p => p.id === postId);
  
  if (postIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Post not found'
    });
  }
  
  if (title) posts[postIndex].title = title;
  if (content) posts[postIndex].content = content;
  
  res.json({
    success: true,
    message: 'Post updated successfully',
    data: posts[postIndex]
  });
});

// DELETE endpoint - Delete a user
app.delete('/api/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const userIndex = users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  const deletedUser = users.splice(userIndex, 1)[0];
  
  res.json({
    success: true,
    message: 'User deleted successfully',
    data: deletedUser
  });
});

// GET endpoint - Search companies using OpenCorporates API
app.get('/api/companies/search', (req, res) => {
  const { q } = req.query;
  
  // Validate required parameters
  if (!q) {
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
      message: 'OpenCorporates API token not configured. Please set OPEN_CORPORATES_KEY in .env file'
    });
  }
  
  // Build the path with query parameters
  const params = new URLSearchParams({
    q: q,
    api_token: apiToken
  });
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
        
        // Use JSONPath to extract companies
        const companies = jp.query(payload, '$.results.companies..company');
        
        res.json({
          success: true,
          count: companies.length,
          data: companies,
          query: q
        });
      } catch (error) {
        console.error('Error parsing OpenCorporates response:', error);
        res.status(500).json({
          success: false,
          message: 'Error processing OpenCorporates API response',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    });
  });
  
  // Handle request errors
  ocRequest.on('error', (error) => {
    console.error('Error making request to OpenCorporates API:', error);
    res.status(500).json({
      success: false,
      message: 'Error connecting to OpenCorporates API',
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
      message: 'OpenCorporates API token not configured. Please set OPEN_CORPORATES_KEY in .env file'
    });
  }
  
  // Build the path with path parameters and API token
  const path = `/v0.4/companies/${jurisdiction_code}/${company_number}?api_token=${apiToken}`;
  
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
            message: 'Error from OpenCorporates API',
            data: payload
          });
        }
        
        // Extract company details using JSONPath
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
        console.error('Error parsing OpenCorporates response:', error);
        res.status(500).json({
          success: false,
          message: 'Error processing OpenCorporates API response',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    });
  });
  
  // Handle request errors
  ocRequest.on('error', (error) => {
    console.error('Error making request to OpenCorporates API:', error);
    res.status(500).json({
      success: false,
      message: 'Error connecting to OpenCorporates API',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  });
  
  // Send the request
  ocRequest.end();
});

// GET endpoint - Search officers using OpenCorporates API
app.get('/api/officers/search', (req, res) => {
  const { q, jurisdiction_code } = req.query;
  
  // Validate required parameters
  if (!q) {
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
      message: 'OpenCorporates API token not configured. Please set OPEN_CORPORATES_KEY in .env file'
    });
  }
  
  // Build the path with query parameters
  const params = new URLSearchParams({
    q: q,
    api_token: apiToken
  });
  
  // Add jurisdiction_code if provided
  if (jurisdiction_code) {
    params.append('jurisdiction_code', jurisdiction_code);
  }
  
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
        
        // Use JSONPath to extract officers
        const officers = jp.query(payload, '$.results.officers..officer');
        
        const response = {
          success: true,
          count: officers.length,
          data: officers,
          query: q
        };
        
        // Include jurisdiction_code in response if provided
        if (jurisdiction_code) {
          response.jurisdiction_code = jurisdiction_code;
        }
        
        res.json(response);
      } catch (error) {
        console.error('Error parsing OpenCorporates response:', error);
        res.status(500).json({
          success: false,
          message: 'Error processing OpenCorporates API response',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    });
  });
  
  // Handle request errors
  ocRequest.on('error', (error) => {
    console.error('Error making request to OpenCorporates API:', error);
    res.status(500).json({
      success: false,
      message: 'Error connecting to OpenCorporates API',
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

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

