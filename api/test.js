/**
 * Minimal test handler to diagnose issues
 */

export default async function handler(req, res) {
  console.log('📝 [test.js] Handler called');
  
  try {
    console.log('📝 [test.js] Loading express...');
    const express = (await import('express')).default;
    console.log('✅ [test.js] Express loaded');
    
    const app = express();
    app.get('/', (req, res) => res.json({ status: 'ok' }));
    
    console.log('📝 [test.js] Calling app...');
    app(req, res);
  } catch (error) {
    console.error('❌ [test.js] Error:', error.message);
    console.error('❌ [test.js] Stack:', error.stack);
    
    res.status(500).json({
      error: error.message,
      stack: error.stack,
    });
  }
}
