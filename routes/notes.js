const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Get all notes
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notes')
      .select('*');

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new note
router.post('/', async (req, res) => {
  try {
    const { content } = req.body;
    const { data, error } = await supabase
      .from('notes')
      .insert([{ content }])
      .select();

    if (error) throw error;

    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a note
router.delete('/:id', async (req, res) => {
  try {
    const noteId = req.params.id;
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', noteId);

    if (error) throw error;

    res.sendStatus(204);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a note
router.put('/:id', async (req, res) => {
  try {
    const noteId = req.params.id;
    const { content } = req.body;
    const { error } = await supabase
      .from('notes')
      .update({ content })
      .eq('id', noteId);

    if (error) throw error;

    res.sendStatus(204);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Endpoint to get yesterday's notes
router.get('/yesterday', async (req, res) => {
    try {
      // Calculate yesterday's date
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayFormatted = yesterday.toISOString().split('T')[0];
  
      const { data: yesterdayNotes, error } = await supabase
        .from('notes')
        .select('*')
        .gte('created_at', `${yesterdayFormatted}T00:00:00`)
        .lt('created_at', `${yesterdayFormatted}T23:59:59`)
        .order('created_at', { ascending: false });
  
      if (error) throw error;
  
      res.json({
        date: yesterdayFormatted,
        notes: yesterdayNotes,
        count: yesterdayNotes.length
      });
    } catch (error) {
      console.error('Error fetching yesterday\'s notes:', error);
      res.status(500).json({ error: error.message });
    }
  });
  // Endpoint to get only today's notes
router.get('/today', async (req, res) => {
    try {
      // Get today's date in the format YYYY-MM-DD
      const today = new Date().toISOString().split('T')[0];
  
      const { data: todayNotes, error } = await supabase
        .from('notes')
        .select('*')
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`)
        .order('created_at', { ascending: false });
  
      if (error) throw error;
  
      res.json({
        date: today,
        notes: todayNotes,
        count: todayNotes.length
      });
    } catch (error) {
      console.error('Error fetching today\'s notes:', error);
      res.status(500).json({ error: error.message });
    }
  });
module.exports = router;