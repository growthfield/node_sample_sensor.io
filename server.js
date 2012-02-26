var matador = require('matador')
var io = require('socket.io').listen(app);
var db = require('mongoose').connect('mongodb://localhost/test', function(err) {
  if (err) throw err;
});

var deviceOrigin = process.env['SENSORIO_DEVICE_ORIGIN'];
var privateLatMin = process.env['SENSORIO_PRIVATE_LATMIN']
var privateLatMax = process.env['SENSORIO_PRIVATE_LATMAX']
var privateLngMin = process.env['SENSORIO_PRIVATE_LNGMIN']
var privateLngMax = process.env['SENSORIO_PRIVATE_LNGMAX']
var privacyFiltering = true;

app.configure(function () {
  app.set('models', __dirname + '/app/models');
  app.set('helpers', __dirname + '/app/helpers');
  app.set('views', __dirname + '/app/views');
  app.set('controllers', __dirname + '/app/controllers');
  app.set('view engine', 'html');
  app.set('viewPartials', matador.partials.build(app.set('views')));
  app.register('.html', matador.engine);
  app.use(matador.cookieParser());
  app.use(matador.bodyParser());
  app.use(matador.methodOverride());
  app.use(matador.static(__dirname + '/public'));
});
app.configure('development', function () {
  app.use(matador.errorHandler({ dumpExceptions: true, showStack: true }));
  privacyFiltering = false;
  console.log('server has been configured as DEVELOPMENT MODE');
});
app.configure('production', function () {
  app.use(matador.errorHandler());
  if (privateLatMin && privateLatMax && privateLngMin && privateLngMax) {
    console.log('Private area has been  defined as [' + privateLatMin + ',' + privateLngMin + '] - [' + privateLatMax + ',' + privateLngMax + ']')
  } else {
    console.log('Private area has not been defined!!');
  }
  console.log('server has been configured as PRODUCTION MODE');
});
io.configure(function() {
  io.set('log level', 1);
  io.set('heartbeat interval', 180);
});

matador.mount(require('./app/config/routes'));
app.listen(8080);

function getModel(name) {
  if (app.set('modelCache')[name]) return app.set('modelCache')[name]
    return (app.set('modelCache')[name] = new (require(app.set('models') + '/' + name + 'Model')))
}
function isPrivateArea(coordinate) {
  if (!privacyFiltering) {
    return false;
  }
  var lng = coordinate[0];
  var lat = coordinate[1];
  if ((lng >= privateLngMin && lng <= privateLngMax) && (lat >= privateLatMin && lat <= privateLatMax)) {
    return true;
  }
  return false;
}

var LocationModel = getModel('Location');
var deviceCnt = 0;
var mapviewCnt = 0;
var device = io.of('/device').authorization(function(data, fn) {
  var errMsg = null;
  var result = false;
  if (data.headers.origin == deviceOrigin) {
    result = true;
  } else {
    result = false;
    errMsg = 'Invalid device';
  }
  fn(errMsg, result);
})
.on('connection', function(socket) {
  socket.emit('viewer', mapviewCnt);
  deviceCnt++;
  mapview.emit('device_state', {type: 'online'}); 
  socket.on('location', function(loc) {
    if (isPrivateArea(loc.coordinate)) {
      return;
    }
    LocationModel.create(new Date(loc.timestamp), loc.coordinate, function(err) {
      if (err) {
        console.log('Failed to insert location data. err=' + err);
      }
    });
    mapview.emit('location', loc);
  });
  socket.on('heading', function(heading) {
    mapview.emit('heading', heading);
  });
  socket.on('disconnect', function() {
    deviceCnt--;
    if (!deviceCnt) {
      mapview.emit('device_state', {type: 'offline'}); 
    }
  });
});

var mapview = io.of('/mapview')
.on('connection', function(socket) {
  device.emit('viewer', ++mapviewCnt);
  var buff = [];
  var total = 0;
  var cnt = 0;
  var date = new Date(now - 6 * 60 * 60 * 1000);
  LocationModel.query()
    .where('timestamp').$gte(date)
    .count(function(err, num) {
      total = num;
    });
  socket.emit('load_start');
  var now = new Date().getTime();
  var lstream = LocationModel.query()
    .where('timestamp').$gte(date)
    .asc('timestamp')
    .stream();
  lstream.on('data', function(doc) {
    if (!isPrivateArea(doc.coordinate)) {
      buff.push(doc);
    }
    if (buff.length >= 10) {
      cnt += buff.length;
      socket.emit('loading', total, cnt, buff);
      buff = [];
    }
  });
  lstream.on('error', function(err) {
    console.log('Failed to read location stream. err=' + err); 
  });
  lstream.on('close', function() {
    if (buff.length) {
      cnt += buff.length;
      socket.emit('loading', total, cnt, buff);
    }
    socket.emit('load_end')
    if (deviceCnt) {
      mapview.emit('device_state', {type: 'online'}); 
    }
  });
  socket.on('disconnect', function() {
    device.emit('viewer', --mapviewCnt);
  });
});
