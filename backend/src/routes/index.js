const { Router } = require('express');
const { sendSuccess } = require('../utils/response');
const authRoutes = require('./auth.routes');
const usersRoutes = require('./users.routes');
const dependentsRoutes = require('./dependents.routes');

const router = Router();

router.get('/health', (req, res) =>
  sendSuccess(res, {
    data: { status: 'ok', uptimeSeconds: Math.round(process.uptime()), timestamp: new Date().toISOString() },
  }),
);

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/dependents', dependentsRoutes);

module.exports = router;
