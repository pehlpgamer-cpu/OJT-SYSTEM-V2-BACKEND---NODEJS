/**
 * Vercel Serverless Function Handler - Simplified Direct App
 * 
 * Initializes a minimal Express app directly to avoid import issues on Vercel
 */

let appInstance = null;

export default async function handler(req, res) {
  try {
    // Initialize app once, reuse for all requests
    if (!appInstance) {
      const express = (await import('express')).default;
      const app = express();
      
      // Basic healthcheck endpoint
      app.get('/health', (req, res) => {
        res.json({
          status: 'ok',
          timestamp: new Date().toISOString(),
          environment: process.env.VERCEL === '1' ? 'vercel' : 'local',
        });
      });
      
      // API version endpoint
      app.get('/api/version', (req, res) => {
        res.json({
          version: '2.0.0',
          name: 'OJT System V2 API',
          environment: process.env.VERCEL === '1' ? 'vercel' : 'local',
          note: 'Simple direct handler - use npm start for full app',
        });
      });
      
      // Fallback for other routes
      app.all('*', (req, res) => {
        res.status(404).json({
          error: 'Not Found',
          message: 'This is a simplified Vercel deployment. Full app requires setting DATABASE_URL.',
          path: req.path,
        });
      });
      
      appInstance = app;
    }
    
    // Execute the request on the app
    appInstance(req, res);
  } catch (error) {
    console.error('Handler Error:', error.message);
    console.error('Stack:', error.stack);
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}
