module.exports = require('./BaseModel').extend(function() {
  this.mongoose = require('mongoose')
  this.Schema = this.mongoose.Schema
})
.methods({
  query: function() {
    return this.DBModel.find(arguments);
  }
})
