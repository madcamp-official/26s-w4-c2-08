const express = require('express');

const router = express.Router();

router.get('/leaderboard', (req, res) => {
  res.json({ leaderboard: [] });
});

module.exports = router;
