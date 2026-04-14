/**
 * Minimal test handler to diagnose issues
 */

export default async function handler(req, res) {
  console.log('TEST: Handler called');
  
  try {
    console.log('TEST: Creating minimal app');
    const express = (await import('express')).default;
    const app = express();
    app.get('/', (req, res) => res.json({ status: 'ok', test: true }));
    
    console.log('TEST: Calling app');
    app(req, res);
  } catch (error) {
    console.error('TEST: Error:', error.message);
    console.error('TEST: Stack:', error.stack);
    
    res.status(500).json({
      error: error.message,
    });
  }
}
