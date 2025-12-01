const router = require('express').Router();
const { createDelivery, getallcreatedeliveries, getDeliveriesByToken } = require('../controllers/createDeliveryController');
const updateDeliveryStatus = require('../controllers/updateDelivery');
const authenticate = require('../middleware/createdeliveryMiddleware');

router.post('/createdelivery', authenticate, createDelivery);
router.get('/createdelivery', authenticate, getallcreatedeliveries);
router.get('/mydeliveries', authenticate, getDeliveriesByToken);
router.patch("/status", authenticate, updateDeliveryStatus);

module.exports = router;