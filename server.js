const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

const DATA_FILE = path.join(__dirname, 'data', 'reminders.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Helper Functions
function readReminders() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeReminders(reminders) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(reminders, null, 2));
}

// Timed reminder

app.post('/reminders', (req, res) => {
  const { message, seconds } = req.body;
  if (!message || !seconds) {
    return res.status(400).json({ error: 'Message and seconds are required.' });
  }

  const reminders = readReminders();
  const newReminder = {
    id: Date.now(),
    message,
    seconds,
    createdAt: new Date().toISOString(),
    fired: false
  };

  reminders.push(newReminder);
  writeReminders(reminders);

  // Schedule the reminder
  setTimeout(() => {
    console.log(`⏰ Reminder: ${newReminder.message}`);
    newReminder.fired = true;
    writeReminders(reminders);
  }, seconds * 1000);

  res.status(201).json({ success: true, reminder: newReminder });
});

// Get all reminders
app.get('/reminders', (req, res) => {
  res.json(readReminders());
});

// Event reminder

app.post('/reminders/event', (req, res) => {
  const { message, eventName } = req.body;
  if (!message || !eventName) {
    return res.status(400).json({ error: 'Both message and eventName are required.' });
  }

  const reminders = readReminders();
  const newReminder = {
    id: Date.now(),
    type: 'event',
    message,
    eventName,
    createdAt: new Date().toISOString(),
    fired: false
  };

  reminders.push(newReminder);
  writeReminders(reminders);
  res.status(201).json({ success: true, reminder: newReminder });
});

// Trigger an event manually
app.post('/events/:eventName', (req, res) => {
  const { eventName } = req.params;
  const reminders = readReminders();
  let triggered = 0;

  reminders.forEach(r => {
    if (r.type === 'event' && r.eventName === eventName && !r.fired) {
      console.log(`🎉 Event triggered: ${eventName} → Reminder: ${r.message}`);
      r.fired = true;
      triggered++;
    }
  });

  writeReminders(reminders);
  res.json({ success: true, event: eventName, remindersTriggered: triggered });
});

// Recurring Reminder

app.post('/reminders/recurring', (req, res) => {
  const { message, duration_seconds, recurrences, interval } = req.body;

  if (!message || !duration_seconds || !recurrences) {
    return res.status(400).json({
      error: 'Message, duration_seconds, and recurrences are required.'
    });
  }

  const reminders = readReminders();
  const newReminder = {
    id: Date.now(),
    type: 'recurring',
    message,
    interval: interval || 'custom',
    duration_seconds,
    recurrences,
    remaining: recurrences,
    nextTrigger: Date.now() + duration_seconds * 1000,
    createdAt: new Date().toISOString(),
    fired: false
  };

  reminders.push(newReminder);
  writeReminders(reminders);
  scheduleLimitedRecurringReminder(newReminder);

  res.status(201).json({
    success: true,
    reminder: {
      id: newReminder.id,
      type: newReminder.type,
      nextTrigger: new Date(newReminder.nextTrigger).toISOString(),
      remaining: newReminder.remaining
    },
    message: 'Reminder created successfully.'
  });
});

// Schedule recurring reminder with limited recurrences
function scheduleLimitedRecurringReminder(reminder) {
  if (reminder.remaining <= 0) return;

  const delay = Math.max(0, reminder.nextTrigger - Date.now());
  setTimeout(() => {
    console.log(`🔁 Recurring Reminder: ${reminder.message} (${reminder.remaining - 1} left)`);

    // Decrement remaining recurrences
    reminder.remaining -= 1;
    reminder.nextTrigger = Date.now() + reminder.duration_seconds * 1000;

    const reminders = readReminders();
    const index = reminders.findIndex(r => r.id === reminder.id);
    if (index !== -1) {
      reminders[index] = reminder;
      writeReminders(reminders);
    }

    // Continue scheduling if more repeats left
    if (reminder.remaining > 0) {
      scheduleLimitedRecurringReminder(reminder);
    } else {
      console.log(`✅ Completed all ${reminder.recurrences} recurrences for: "${reminder.message}"`);
    }
  }, delay);
}

// Reinitialize recurring reminders on startup
function initRecurringReminders() {
  const reminders = readReminders();
  reminders.forEach(r => {
    if (r.type === 'recurring' && r.remaining > 0) {
      scheduleLimitedRecurringReminder(r);
    }
  });
}

app.get('/reminders/:id/status', (req, res) => {
  const id = req.params.id;
  const reminder = reminders.find(r => r.id === id);

  // If not found
  if (!reminder) {
    return res.json({ status: "error", message: "Reminder not found" });
  }

  // Return status info
  res.json({
    id: reminder.id,
    type: reminder.type,
    completed: reminder.completed,
    message: reminder.message
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Reminder microservice running at http://localhost:${PORT}`);
});
