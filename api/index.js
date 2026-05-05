/**
 * Vercel Serverless Function Handler
 * 
 * Loads and serves the full Express application from src/server.js
 * on Vercel's serverless environment.
 */

let appInstance = null;

export default async function handler(req, res) {
  try {
    // Initialize app once, reuse for all requests (cold start optimization)
    if (!appInstance) {
      console.log('[Vercel Handler] Initializing Express application...');
      
      try {
        // Import and initialize the full application
        const { initializeApp } = await import('../src/server.js');
        appInstance = await initializeApp();
        console.log('[Vercel Handler] ✅ Express app initialized successfully');
      } catch (initError) {
        console.error('[Vercel Handler] ❌ Failed to initialize app:', initError.message);
        console.error(initError.stack);
        
        // Return error response if app initialization fails
        res.status(500).json({
          error: 'Application Initialization Failed',
          message: initError.message,
          timestamp: new Date().toISOString(),
          hint: 'Check Vercel environment variables: DATABASE_URL, JWT_SECRET, etc.',
        });
        return;
      }
    }
    
    // Execute the request on the full app
    appInstance(req, res);
  } catch (error) {
    console.error('[Vercel Handler] Request Error:', error.message);
    console.error(error.stack);
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}
