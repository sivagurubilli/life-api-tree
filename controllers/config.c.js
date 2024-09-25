const axios = require('axios')
let config = require('../config/config')
let models = require('../models')
let appUtils = require('../utils/appUtils')
let { Testing } = require("../models/index.js");


exports.getconfig = async (req, res) => {
  try {
    let data = 'noData';
    const {
      rzp,
    } = config;

    if (req.query.rzp) {
      data = {
        key: rzp.key_id,
        secret: rzp.key_secret
      }
      res.send(appUtils.responseJson(1, data, 'SUCCESS'))
    }
    else throw Error("Currently only rzp values available")
  }
  catch (e) {
    res.send(appUtils.responseJson(0, e.message, `Failed`))
  }
}


