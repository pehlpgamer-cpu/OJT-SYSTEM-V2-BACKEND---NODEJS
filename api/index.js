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
      console.log('[Vercel Handler] DATABASE_URL set:', !!process.env.DATABASE_URL);
      console.log('[Vercel Handler] NODE_ENV:', process.env.NODE_ENV);
      
      try {
        // Import and initialize the full application
        const { initializeApp } = await import('../src/server.js');
        appInstance = await initializeApp();
        console.log('[Vercel Handler] ✅ Express app initialized successfully');
      } catch (initError) {
        console.error('[Vercel Handler] ❌ Init failed:', initError.message);
        console.error('[Vercel Handler] Type:', initError.constructor.name, '| Code:', initError.code);
        
        // Return error response if app initialization fails
        res.status(500).json({
          error: 'Application Initialization Failed',
          message: initError.message,
          timestamp: new Date().toISOString(),
          hint: initError.message?.includes('pg')
            ? 'PostgreSQL driver (pg) not available - check dependencies'
            : 'Check environment variables: DATABASE_URL, JWT_SECRET, etc.',
        });
        return;
      }
    }
    
    // Execute the request on the full app
    appInstance(req, res);
  } catch (error) {
    console.error('[Vercel Handler] Request error:', error.message, '| Method:', req.method, '| Path:', req.url);
    if (process.env.DEBUG) {
      console.error('[Vercel Handler] Stack:', error.stack);
    }
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}
