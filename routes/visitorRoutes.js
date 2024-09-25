var express = require('express');
var multer = require('multer');
var router = express.Router();
let {
    visitors
} = require('../controllers');



//Login-Api's
router.post('/login', visitors.visitorLogin);

//Current_Affairs
router.get('/currentAffairs/fetch', visitors.fetchCurrentAffairsByUser);
router.post('/save/current-affair-logs', visitors.saveCurrentAffairLog);

module.exports = router;
