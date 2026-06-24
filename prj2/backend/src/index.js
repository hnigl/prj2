require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sessionRouter = require('./routes/sessionRoutes');
const path = require('path');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({ message: 'AI Backend API running', endpoint: '/api/session' });
});

app.use('/api/session', sessionRouter);

app.use('/public', express.static(path.join(__dirname, '..', 'public')));

app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  if (err.response) {
    console.error('Response status:', err.response.status);
    console.error('Response data:', err.response.data);
  }
  res.status(err.status || err.response?.status || 500).json({
    error: err.response?.data?.error || err.message || 'Internal Server Error',
    details: err.response?.data || undefined
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
