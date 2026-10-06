const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase Configuration from your project credentials
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://irxmewhnyzebzsahqkyg.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_hwtpPwaVn9wSb1I8RXxUkQ_z-hSYEOu';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files from the root directory
app.use(express.static(__dirname));

// Example API endpoint connected to Supabase
app.get('/api/health', async (req, res) => {
    try {
        // Test Supabase connection
        const { data, error } = await supabase.from('schools').select('*').limit(1);
        if (error && error.code !== 'PGRST116') {
            // If table doesn't exist yet, return healthy status with warning
            return res.json({ status: 'connected_to_supabase', warning: error.message });
        }
        res.json({ status: 'healthy', supabaseUrl: SUPABASE_URL, schools: data || [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Fallback to index.html for SPA routing from the root directory
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Shule Score Sheet server running on port ${PORT}`);
});
