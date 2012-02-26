module.exports = require('./ApplicationModel').extend(function() {
  var schema = new this.Schema({
    timestamp     : { type: Date, index: true }
    , coordinate  : { type: [Number], index: '2d' }
  });
  this.DBModel = this.mongoose.model('Location', schema);
})
.methods({
  create: function (timestamp, coordinate, callback) {
    var loc = new this.DBModel({
      timestamp: timestamp
      , coordinate: coordinate
    })
    loc.save(callback)
  }
});
