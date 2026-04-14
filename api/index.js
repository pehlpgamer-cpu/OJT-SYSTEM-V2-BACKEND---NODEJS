/**
 * Vercel Serverless Function Handler
 * 
 * WHY: Vercel's serverless environment requires a handler function that can process HTTP requests
 * 
 * WHAT: This file:
 * 1. Imports the initialization function from src/server.js
 * 2. Creates a lazy-loaded app instance (initialized once, reused for all requests)
 * 3. Exports a handler that Vercel calls for every HTTP request
 */

import { initializeApp } from '../src/server.js';

let appInstance = null;

/**
 * Get or initialize app instance
 * 
 * WHY: 
 * - Initializes app once on first request
 * - Reuses same instance for all subsequent requests
 * - Improves performance by avoiding repeated initialization
 */
async function getApp() {
  if (!appInstance) {
    console.log('Initializing app on first request...');
    appInstance = await initializeApp();
    console.log('✅ App initialized and ready for Vercel');
  }
  return appInstance;
}

/**
 * Vercel Serverless Handler
 * 
 * Vercel calls this handler for every incoming HTTP request
 * We forward each request to the initialized Express app
 */
export default async (req, res) => {
  try {
    const app = await getApp();
    
    // Express app is a middleware/handler, so we can call it directly
    return app(req, res);
  } catch (error) {
    console.error('Error in Vercel handler:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
};

