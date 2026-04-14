/**
 * Vercel Serverless Function Handler
 * 
 * This is the entry point for Vercel serverless execution.
 * Vercel calls this handler for every HTTP request.
 */

import { initializeApp } from '../src/server.js';

let appInstance = null;

/**
 * Initialize app once, reuse for all requests
 */
async function getApp() {
  if (!appInstance) {
    console.log('🚀 [Handler] Initializing Express app for Vercel serverless...');
    try {
      appInstance = await initializeApp();
      console.log('✅ [Handler] App initialized successfully');
    } catch (error) {
      console.error('❌ [Handler] Failed to initialize app:', error);
      console.error('❌ [Handler] Error stack:', error.stack);
      throw error;
    }
  }
  return appInstance;
}

/**
 * Vercel Handler - entry point for serverless execution
 */
export default async function handler(req, res) {
  console.log(`📝 [Handler] ${req.method} ${req.url}`);
  console.log('📝 [Handler] Headers:', req.headers);
  
  try {
    console.log('📝 [Handler] Getting app instance...');
    const app = await getApp();
    console.log('📝 [Handler] App instance obtained, executing request...');
    
    // Simply call the Express app
    app(req, res);
  } catch (error) {
    console.error('❌ [Handler] Error:', error);
    console.error('❌ [Handler] Error type:', error.constructor.name);
    console.error('❌ [Handler] Error stack:', error.stack);
    
    if (!res.headersSent) {
      try {
        res.status(500).json({
          error: 'Internal Server Error',
          details: error.message,
          timestamp: new Date().toISOString(),
        });
      } catch (e) {
        console.error('❌ [Handler] Failed to send error response:', e);
        res.end('Internal Server Error');
      }
    }
  }
}
