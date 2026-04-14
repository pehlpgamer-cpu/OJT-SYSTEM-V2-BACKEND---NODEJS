/**
 * Vercel Serverless Function Handler
 * 
 * WHY: Vercel's serverless environment requires this handler to process HTTP requests
 * 
 * WHAT: This file:
 * 1. Imports and initializes the Express app
 * 2. Exports as a Vercel handler
 * 3. Routes all HTTP requests to the Express app
 */

import { initializeApp } from '../src/server.js';

let appInstance = null;

/**
 * Get or initialize app instance (lazy loading)
 */
async function getApp() {
  if (!appInstance) {
    console.log('🚀 Initializing app...');
    appInstance = await initializeApp();
    console.log('✅ App ready');
  }
  return appInstance;
}

/**
 * Vercel Handler - main entry point
 * 
 * Vercel calls this for every HTTP request
 */
export default async function handler(req, res) {
  try {
    const app = await getApp();
    
    // Call Express app directly
    return app(req, res);
  } catch (error) {
    console.error('Handler error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
}
