import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const MAILERLITE_GROUP_ID = '161087138063976399';

// This will allow requests from all origins, which is fine for this public API.
app.use(cors());

// Use express.json() to parse the JSON request body.
app.use(express.json());

app.post('/subscribe', async (req, res) => {
  // Access the email from the parsed JSON body
  const { email } = req.body;
  const apiKey = process.env.MAILERLITE_API_KEY;

  if (!apiKey) {
    console.error('MailerLite API key not set in environment variables.');
    return res.status(500).json({ message: 'Server configuration error: API key missing.' });
  }

  try {
    const response = await fetch(`https://api.mailerlite.com/api/v2/groups/${MAILERLITE_GROUP_ID}/subscribers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-MailerLite-ApiKey': apiKey
      },
      body: JSON.stringify({ email: email, resubscribe: true }) // MailerLite API requires JSON
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('MailerLite API error:', data);
      return res.status(response.status).json(data);
    }

    res.status(200).json({ message: 'Successfully subscribed!' });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
