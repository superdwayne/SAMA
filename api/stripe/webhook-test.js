// Test endpoint to debug webhook issues
module.exports = async (req, res) => {
  console.log('🧪 Webhook test endpoint called');
  console.log('🔍 Method:', req.method);
  console.log('🔍 Headers:', req.headers);
  console.log('🔍 Body:', req.body);
  
  if (req.method === 'POST') {
    return res.status(200).json({ 
      success: true, 
      message: 'Webhook test endpoint is working',
      receivedData: {
        method: req.method,
        headers: req.headers,
        body: req.body
      }
    });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
};
