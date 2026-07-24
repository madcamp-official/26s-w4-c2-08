const express = require('express');
const db = require('../db');

const router = express.Router();

const getLeaderboard = db.prepare(`
  SELECT user_name as userName, MAX(score) as score
  FROM scores
  WHERE group_id = ?
  GROUP BY user_name
  ORDER BY score DESC
  LIMIT 20
`);

router.get('/leaderboard', (req, res) => {
  const { groupId } = req.query;
  const leaderboard = getLeaderboard.all(groupId);
  res.json({ leaderboard });
});

module.exports = router;
