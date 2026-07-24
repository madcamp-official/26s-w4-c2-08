const express = require('express');

const router = express.Router();

router.post('/scores', (req, res) => {
  console.log('req.body:', req.body);
  res.json({ ok: true });
});

module.exports = router;
