const express = require('express');
const router = express.Router();
const allocationController = require('../controllers/allocationController');

router.post('/allocate', allocationController.allocateRoom);
router.post('/vacate', allocationController.vacateRoom);
router.get('/history', allocationController.getAllocationsHistory);

module.exports = router;

