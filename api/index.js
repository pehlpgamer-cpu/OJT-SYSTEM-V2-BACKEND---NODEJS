/**
 * Vercel Serverless Function Handler
 * 
 * This is the entry point for Vercel serverless execution.
 * Vercel calls this handler for every HTTP request.
 */

import { initializeApp } from '../src/server.js';

let appInstance = null;
let initError = null;

/**
 * Initialize app once, reuse for all requests
 */
async function getApp() {
  if (initError) {
    throw initError;
  }
  
  if (!appInstance) {
    console.log('🚀 [Handler] Starting app initialization...');
    try {
      console.time('[Handler] Init took');
      appInstance = await initializeApp();
      console.timeEnd('[Handler] Init took');
      console.log('✅ [Handler] App initialized successfully');
    } catch (error) {
      console.error('❌ [Handler] App initialization failed');
      console.error('❌ Error message:', error.message);
      console.error('❌ Error name:', error.name);
      console.error('❌ Error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      console.error('❌ Stack:', error.stack);
      initError = error;
      throw error;
    }
  }
  return appInstance;
}

/**
 * Vercel Handler - entry point for serverless execution
 */
export default async function handler(req, res) {
  console.log(`📝 [Handler] Request started: ${req.method} ${req.url}`);
  
  try {
    console.log('📝 [Handler] Getting app instance...');
    const app = await getApp();
    console.log('📝 [Handler] Executing request on app...');
    
    // Call the Express app
    await new Promise((resolve, reject) => {
      // Wrap to catch any uncaught errors
      app(req, res);
      
      // Timeout after 25 seconds
      setTimeout(() => {
        if (!res.headersSent) {
          reject(new Error('Request handler timeout'));
        } else {
          resolve();
        }
      }, 25000);
    });
  } catch (error) {
    console.error('❌ [Handler] Request failed:', error.message);
    
    if (!res.headersSent) {
      try {
        res.status(500).json({
          error: error.message,
          type: error.name,
          timestamp: new Date().toISOString(),
          env: process.env.VERCEL === '1' ? 'vercel' : 'local',
        });
      } catch (e) {
        console.error('❌ [Handler] Failed to send error response');
        res.end('Internal Server Error');
      }
    }
  }
}
