module.exports = require(app.set('controllers') + '/ApplicationController').extend()
  .methods({
    index: function () {
      this.render('index', {
        title: 'Sensor.IO'
      });
    },
    location: function() {
      this.render('location', {
        title: 'Sensor.IO - Location'
        , scripts: [
          {path: 'http://maps.google.com/maps/api/js?sensor=false'}
          , {path: '/lib/socketio/socket.io.min.js'}
          , {path: '/lib/valentine/valentine.min.js'}
          , {path: '/lib/klass/klass.min.js'}
          , {path: '/js/mapview.js'}
        ]
        , styles: [
          {path: '/css/mapview.css'}
        ]
        , onload: 'initMap()'
      });
    }
  });
