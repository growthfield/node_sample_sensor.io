var defaultLatlng = new google.maps.LatLng(35.70584,139.650513);
var iPhone = klass(function(map) {
  this.map = map;
  this.streetview = map.getStreetView();
  this.buffer = []
  this.connected= false;
  this.readied = false;
  this.iconOnline = new google.maps.MarkerImage('http://' + location.host + '/img/red-dot.png')
  this.iconOffline = new google.maps.MarkerImage('http://' + location.host + '/img/gray-dot.png')
}).methods({
  init: function() {
    var opts = {
      strokeColor: '#0000ff'
      , strokeOpacity: 0.6
      , strokeWeight: 5
    }
    this.connected = false;
    this.readied = false;
    this.buffer = [];
    if (this.poly) {
      this.poly.setMap(null);
    }
    this.poly = new google.maps.Polyline(opts)
    if (this.marker) {
      this.marker.setMap(null);
    }
    this.marker = new google.maps.Marker({map: this.map, clickable: true})
    this.marker.setIcon(this.iconOffline)
  }
  , fini: function() {
    this.online(false);
  }
  , ready: function() {
    this.readied = true;
    this.pushCoordinates(this.buffer);
    this.buffer = [];
    this.map.setZoom(17);
    this.poly.setMap(this.map);
    this.render();
  }
  , online: function(flag) {
    if (flag && !this.connected) {
      this.marker.setIcon(this.iconOnline);
      this.connected = true;
    } else if (!flag && this.connected) {
      this.marker.setIcon(this.iconOffline);
      this.connected = false;
    }
  }
  , pushRoute: function(locList) {
    this.pushCoordinates(locList);
  }
  , locate: function(loc) {
    this.online(true)
    if (!this.readied) {
      this.buffer.push(loc);
      return;
    }
    this.pushCoordinates(loc);
    this.render();
  }
  , heading: function(heading) {
    this.online(true);
    this.streetview.setPov({
      heading: heading.value
      , zoom: 1
      , pitch: 0
    });

  }
  , render: function() {
    var ll = v.last(this.poly.getPath().getArray());
    if (!ll) {
      ll = new google.maps.LatLng(35.70584, 139.650513);
    }
    this.map.setCenter(ll);
    this.streetview.setPosition(ll);
    this.marker.setPosition(ll);
  }
  , pushCoordinates: function(locList) {
    v.each(array(locList), function(loc) {
      var latlng= new google.maps.LatLng(loc.coordinate[1], loc.coordinate[0]);
      this.poly.getPath().push(latlng);
    }, this);
    function array(p) {
      if (v.is.arr(p)) {
        return p;
      } else {
        return [p];
      }
    }
  }
});

function initMap() {

  var resizemap = function() {
    var winh = $(window).outerHeight();
    var navh = $('#mainnav').height();
    var maph = winh - navh;
    var svbar = $('#streetview-bar').height();
    $('#map-canvas').height(maph);
    $('#streetview-canvas').height(maph - 53);
  }
  resizemap(); 
  $(window).resize(resizemap);

  var map = new google.maps.Map(document.getElementById("map-canvas"), {
    zoom: 10
    , center: defaultLatlng
    , mapTypeId: google.maps.MapTypeId.ROADMAP
    , disableDefaultUI: true
    , scaleControl: true
    , scaleControlOptions: {
        position: google.maps.ControlPosition.TOP_LEFT
    }
    , streetViewControl: false
  });
  var streetview = new google.maps.StreetViewPanorama(document.getElementById('map-canvas'), {
    addressControl: false
    , disableDoubleClickZoom: true
    , enableCloseButton: false
    , linksControl: false
    , scrollwheel: false
    , zoomControl: false
    , panControl: false
    , position: defaultLatlng
    , pov: {
        heading: 265
        , zoom:1
        , pitch:0
      }
    , visible: false
  });
  map.setStreetView(streetview);
  var iphone = new iPhone(map);
  var socket = io.connect('http://' + location.host + '/mapview');
  socket.on('connect', function() {
    iphone.init();
    google.maps.event.addListener(iphone.marker, 'click', function() {
      $('#info-map').hide();
      iphone.streetview.setVisible(true);
      $('#info-streetview').show();
    });
    $('#close-map-msg').click(function() {
      $('#info-map').hide();
    });
    $('#close-streetview').click(function() {
      $('#info-streetview').hide();
      iphone.streetview.setVisible(false);
    });
  });
  socket.on('disconnect', function() {
    iphone.fini();
  });
  socket.on('load_start', function() {
    $('#info-map').hide();
    $('#info-streetview').hide();
    $('#info-loading').show();
  });
  socket.on('loading', function(total, cnt, locations) {
    progress(Math.floor(cnt / total * 100));
    iphone.pushRoute(locations);
  })
  socket.on('load_end', function() {
    progress(100);
  })
  socket.on('location', function(loc) {
    iphone.locate(loc);
  });
  socket.on('heading', function(loc) {
    iphone.heading(loc);
  });
  socket.on('device_state', function(state) {
    iphone.online('online' == state.type);
  });
  function progress(percent) {
    $('#map-init-progress-bar').css('width', percent + '%');
    if (percent == 100) {
      setTimeout(function() {
        $('#map-init-progress').fadeOut(500, function() {
          iphone.ready();
          $('#info-map').show();
          $('#info-loading').hide();
        });
      }, 700);
    }
  }
}
