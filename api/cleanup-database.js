// API endpoint to clean up old magic links and expired data
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🧹 Starting database cleanup...');
    
    // Clean up expired magic links
    const { data: expiredLinks, error: expiredError } = await supabase
      .from('magic_links')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id');
    
    if (expiredError) throw expiredError;
    
    // Clean up used magic links older than 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const { data: usedLinks, error: usedError } = await supabase
      .from('magic_links')
      .delete()
      .eq('used', true)
      .lt('created_at', oneDayAgo.toISOString())
      .select('id');
    
    if (usedError) throw usedError;
    
    // Keep only the most recent unused magic link per email
    const { data: duplicates, error: duplicatesError } = await supabase
      .rpc('cleanup_duplicate_magic_links');
    
    // Note: You'll need to create this SQL function in Supabase
    
    console.log('✅ Database cleanup completed');
    console.log(`- Removed ${expiredLinks?.length || 0} expired magic links`);
    console.log(`- Removed ${usedLinks?.length || 0} old used magic links`);
    
    res.json({
      success: true,
      message: 'Database cleanup completed',
      stats: {
        expiredLinksRemoved: expiredLinks?.length || 0,
        usedLinksRemoved: usedLinks?.length || 0
      }
    });
    
  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
    res.status(500).json({
      error: 'Database cleanup failed',
      details: error.message
    });
  }
};
