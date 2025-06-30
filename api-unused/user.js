const express = require('express');
const router = express.Router();
const { createUser, getUser, updateUser } = require('./utils/database');

// Create user
router.post('/', async (req, res) => {
  try {
    const userData = req.body;
    const user = await createUser(userData);
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get user
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await getUser(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userData = req.body;
    const updatedUser = await updateUser(id, userData);
    res.json(updatedUser);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router; 