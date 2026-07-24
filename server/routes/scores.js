const express = require('express');
const db = require('../db');

const router = express.Router();

const insertScore = db.prepare(
  'INSERT INTO scores (group_id, user_name, score) VALUES (?, ?, ?)'
);

router.post('/scores', (req, res) => {
  const { groupId, userName, score } = req.body;
  insertScore.run(groupId, userName, score);
  res.json({ ok: true });
});

module.exports = router;
