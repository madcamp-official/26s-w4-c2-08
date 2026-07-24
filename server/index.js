const express = require('express');
const cors = require('cors');
const scoresRouter = require('./routes/scores');
const leaderboardRouter = require('./routes/leaderboard');
require('./db');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

app.use('/api', scoresRouter);
app.use('/api', leaderboardRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`listening on ${PORT}`));
