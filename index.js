require('dotenv').config();

const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://irxmewhnyzebzsahqkyg.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  || process.env.SUPABASE_ANON_KEY
  || 'sb_publishable_hwtpPwaVn9wSb1I8RXxUkQ_z-hSYEOu';

console.log('Starting server...');
console.log('Supabase URL:', SUPABASE_URL);
console.log('Supabase key present:', !!SUPABASE_KEY);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', async (req, res) => {
  try {
    const { data, error } = await supabase.from('schools').select('*').limit(1);
    if (error && error.code !== 'PGRST116') {
      return res.json({ status: 'connected_to_supabase', warning: error.message });
    }
    res.json({ status: 'healthy', supabaseUrl: SUPABASE_URL, schools: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/records', async (req, res) => {
  try {
    const record = req.body;
    const { data, error } = await supabase.from('records').insert([record]).select();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data?.[0] || record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/records/bulk-attendance', async (req, res) => {
  try {
    const items = req.body?.items || [];
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array required' });
    }
    const { data, error } = await supabase.from('records').insert(items).select();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({ count: data?.length || 0, items: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/discipline', async (req, res) => {
  try {
    const incident = req.body;
    const { data, error } = await supabase.from('discipline').insert([incident]).select();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data?.[0] || incident);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/records', async (req, res) => {
  try {
    const { data, error } = await supabase.from('records').select('*');
    if (error) return res.status(400).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/discipline', async (req, res) => {
  try {
    const { data, error } = await supabase.from('discipline').select('*');
    if (error) return res.status(400).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SPA fallback — must be last
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Shule Score Sheet server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT}`);
});
