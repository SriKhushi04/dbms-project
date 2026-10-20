import express from 'express';
import { getAllRooms, getAllBlocks } from '../controllers/roomController.js';

const router = express.Router();

router.get('/', getAllRooms);
router.get('/blocks', getAllBlocks);

export default router;

