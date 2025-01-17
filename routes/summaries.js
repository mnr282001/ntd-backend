const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');


const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Get all summaries
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('summaries')
      .select('*');

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new summary
router.post('/', async (req, res) => {
  try {
    const { summary_date, content } = req.body;
    const { data, error } = await supabase
      .from('summaries')
      .insert([{ summary_date, content }])
      .select();

    if (error) throw error;

    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a summary
router.delete('/:id', async (req, res) => {
  try {
    const summaryId = req.params.id;
    const { error } = await supabase
      .from('summaries')
      .delete()
      .eq('id', summaryId);

    if (error) throw error;

    res.sendStatus(204);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a summary
router.put('/:id', async (req, res) => {
  try {
    const summaryId = req.params.id;
    const { summary_date, content } = req.body;
    const { error } = await supabase
      .from('summaries')
      .update({ summary_date, content })
      .eq('id', summaryId);

    if (error) throw error;

    res.sendStatus(204);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate standup summary for a specific date
router.post('/standup-summary', async (req, res) => {
    try {
      const { date } = req.query;
      
      // Validate date input
      if (!date) {
        return res.status(400).json({ error: 'Date is required' });
      }
  
      console.log(`Attempting to fetch notes for date: ${date}`);
  
      // Query notes for the specific date
      // Convert the input date to a UTC date
const inputDate = new Date(date);
const utcDate = new Date(Date.UTC(
  inputDate.getFullYear(), 
  inputDate.getMonth(), 
  inputDate.getDate() + 1
));

// Get the next UTC day
const nextUtcDay = new Date(Date.UTC(
  utcDate.getFullYear(), 
  utcDate.getMonth(), 
  utcDate.getDate() + 2
));

// Format dates for Supabase query
const currentDayFormatted = utcDate.toISOString().split('T')[0];
const nextDayFormatted = nextUtcDay.toISOString().split('T')[0];

console.log(`Querying notes for date range: ${currentDayFormatted}T00:00:00Z - ${nextDayFormatted}T00:00:00Z`);

const { data: notes, error: notesError } = await supabase
  .from('notes')
  .select('*')
  .gte('created_at', `${currentDayFormatted}T00:00:00Z`)
  .lt('created_at', `${nextDayFormatted}T00:00:00Z`);
        
      if (notesError) {
        console.error('Supabase Notes Query Error:', {
          message: notesError.message,
          details: notesError,
          query: {
            table: 'notes',
            date: date,
            fullDateRange: [`${date}T00:00:00`, `${date}T23:59:59`]
          }
        });
        throw notesError;
      }
  
      console.log(`Fetched notes count: ${notes.length}`);
  
      // If no notes found, return early
      if (!notes || notes.length === 0) {
        console.warn(`No notes found for date: ${date}`);
        return res.json({ summary: 'No notes found for the specified date.' });
      }
  
      // Prepare notes content for AI summarization
      const notesContent = notes.map(note => {
        console.log('Note details:', {
          id: note.id,
          content: note.content,
          createdAt: note.created_at
        });
        return note.content;
      }).join('\n\n');
  
      console.log('Notes content for summarization:', notesContent);
  
      // Generate standup summary using OpenAI
      let standupSummary;
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system", 
              content: "You are a helpful assistant that generates concise standup meeting summaries. Format the response in a clear, professional manner."
            },
            {
              role: "user", 
              content: `Based on these notes from ${date}, generate a standup meeting summary following this format:
    
    What I Did Yesterday:
    - Summarize key accomplishments and work completed (if any, otherwise indicate that there is nothing in the notes that suggests that there is work to do)
    
    What I Will Do Today:
    - Outline planned tasks and objectives (if any, otherwise indicate that there is nothing in the notes that suggests that there is work to do)
    
    Obstacles/Blockers:
    - Identify any challenges or impediments (if any, otherwise indicate that there is nothing in the notes that suggests that there are no obstacles)
    
    Notes used for summary:
    ${notesContent}`
            }
          ]
        });
  
        standupSummary = completion.choices[0].message.content;
      } catch (openaiError) {
        console.error('OpenAI API Error:', {
          message: openaiError.message,
          details: openaiError
        });
        throw openaiError;
      }
  
      console.log('Generated Standup Summary:', standupSummary);
  
      // Optionally, save the summary to the summaries table
      const { data: savedSummary, error: summaryError } = await supabase
        .from('summaries')
        .insert([{ 
          summary_date: date, 
          content: standupSummary
        }])
        .select();
  
      if (summaryError) {
        console.error('Error saving summary:', {
          message: summaryError.message,
          details: summaryError
        });
      }
  
      res.json({ 
        summary: standupSummary,
        savedSummary: savedSummary ? savedSummary[0] : null
      });
  
    } catch (error) {
      console.error('Comprehensive Standup Summary Generation Error:', {
        message: error.message,
        stack: error.stack,
        fullError: error
      });
      res.status(500).json({ 
        error: error.message,
        details: error
      });
    }
  });
  
module.exports = router;