const express = require('express');
const router = express.Router();
const hostelController = require('../controllers/hostelController');

router.get('/', hostelController.getAllHostels);
router.get('/blocks/all', hostelController.getAllBlocks);
router.get('/:id', hostelController.getHostelById);
router.post('/', hostelController.createHostel);
router.post('/:id/blocks', hostelController.createBlock);

module.exports = router;

