var App = {};

/* ---------------------- Models ---------------------- */

App.Truck = Backbone.GoogleMaps.Location.extend();

App.TruckCollection = Backbone.GoogleMaps.LocationCollection.extend({
    model: App.Truck,
    url: '/api/v1/trucks'
});

App.Query = Backbone.Model.extend({
    maxDistance: 400, // TODO: make this dynamic!
    toQueryString: function() {
        return "?lat=" + this.get('lat') + "&lng=" + this.get('lng') + "&maxDistance=" + this.maxDistance;
    }
});

App.QueryResultItem = Backbone.Model.extend();

App.QueryResultList = Backbone.Collection.extend({
    urlBase: '/api/v1/trucks/nearby',
    model: App.QueryResultItem,
    addressSuffix: " San Francisco, CA",

    initialize: function() {
        this.geocoder = new google.maps.Geocoder();
    },

    queryWithAddress: function(address) {
        address += this.addressSuffix;
        var that = this;
        this.geocoder.geocode( {'address': address}, function(results, status) {
            if (status == google.maps.GeocoderStatus.OK) {
                that.loc = results[0].geometry.location;
                var lat = that.loc.lat();
                var lng = that.loc.lng();
                var query = new App.Query({
                    lat: lat,
                    lng: lng
                });
                that.url = that.urlBase + query.toQueryString();
                that.fetch({
                    success: function(queryResult, response, options) {
                        that.updateMarkers();
                        that.displayQueryMarker();
                        that.updateResultListView();
                        App.map.setCenter(that.loc);
                        App.map.setZoom(17); // TODO: make this dynamic
                    }
                });
            } else {
                alert("Geocode was not successful for the following reason: " + status);
            }
        });
    },

    displayQueryMarker: function() {
        App.markerManager.addMarker(
            new google.maps.Marker({
                position: this.loc,
                title: 'Query Marker',
                animation: google.maps.Animation.DROP
            })
            , 13);
    },

    updateMarkers: function() {
        App.markerManager.clearMarkers();
        for(var i = 0; i < App.queryResult.size(); i++) {
            var result = App.queryResult.at(i);
            var locationId = result.get('location_id');
            App.markerManager.addMarker(App.markerMap[locationId], 13);
        }
    },

    updateResultListView: function() {
        var resultListView = new App.QueryResultListView({
            el: $('#search-result-area')
        });
        resultListView.render();
    }
});


/* ---------------------- Views ---------------------- */

App.InfoWindow = Backbone.View.extend({
    template: '#info-window-template',
    render: function() {
        var template = _.template($(this.template).html());
        this.$el.html(template({
            name: this.model.get('name'),
            address: this.model.get('address'),
            food_items_str: this.model.get('food_items_str')
        }));
        return this;
    }
});



App.SearchControlView = Backbone.View.extend({
    events: {
        'change #address-input': 'startSearchWithAddress'
    },

    startSearchWithAddress: function(e) {
        var address = $(e.currentTarget).val();
        App.queryResult.queryWithAddress(address);
    }
});


App.QueryResultItemView = Backbone.View.extend({
    template: '#search-result-template',

    events: {
        'mouseenter': 'simulateMarkerClick'
    },

    simulateMarkerClick: function() {
        var locationId = this.model.get('location_id');
        var marker = App.markerMap[locationId];
        google.maps.event.trigger(marker, 'click');
    },

    render: function() {
        var template = _.template($(this.template).html());
        this.$el.html(template({
            location_id: this.model.get('location_id'),
            name: this.model.get('name'),
            address: this.model.get('address'),
            food_items_str: this.model.get('food_items_str')
        }));
        return this;
    }
});

App.QueryResultListView = Backbone.View.extend({

    render: function() {
        var resultArea = this.$el.find('div');
        resultArea.html("");
        for (var i = 0; i < App.queryResult.size(); i++) {
            var locationId = App.queryResult.at(i).get('location_id');
            var truck = App.trucks.findWhere({
                location_id: locationId
            });
            var childDivId = "search-result-" + locationId;
            resultArea.append('<div id="' + childDivId + '"></div>');
            var childDivArea = resultArea.find('#' + childDivId);
            var resultItemView = new App.QueryResultItemView({
                model: truck,
                el: childDivArea
            });
            resultItemView.render();
        }
    }
});

/* ---------------------- Util functions ---------------------- */

App.createMap = function () {
    var mapOptions = {
        center: new google.maps.LatLng(37.77, -122.4167),
        zoom: 13,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };

    // Instantiate map
    this.map = new google.maps.Map($('#map_canvas')[0], mapOptions);

};

App.createMarkerMap = function(trucks) {
    this.markerMap = {};
    for (var i = 0; i < trucks.size(); i++) {
        var truck = trucks.at(i);
        var locationId = truck.get('location_id');
        var marker = new google.maps.Marker({
            position: new google.maps.LatLng(truck.get('lat'), truck.get('lng')),
            title: 'Truck Marker',
            icon: '/static/images/truck_small.png',
            animation: google.maps.Animation.DROP
        });
        var infoWindow = new google.maps.InfoWindow({
            content: new App.InfoWindow({ model: truck }).render().el
        });
        google.maps.event.addListener(marker, 'click',
            function(marker, infoWindow) {
                return function() {
                    if (App.currentInfoWindow)
                        App.currentInfoWindow.close();
                    App.currentInfoWindow = infoWindow;
                    infoWindow.open(this.map, marker);
                }
            }(marker, infoWindow)
        );
        this.markerMap[locationId] = marker;
    }
};

App.setupMarkers = function() {
    this.markerManager = new MarkerManager(this.map);
    var that = this;
    google.maps.event.addListener(this.markerManager, 'loaded', function () {
        that.markerManager.addMarkers(that.getMarkers(2), 12);
        that.markerManager.addMarkers(that.getMarkers(45), 13);
        that.markerManager.addMarkers(that.getMarkers(90), 14);
        that.markerManager.addMarkers(that.getMarkers(180), 15);
        that.markerManager.addMarkers(that.getMarkers(360), 16);
        that.markerManager.addMarkers(that.getMarkers(720), 17);
        that.markerManager.refresh();
    });
};

App.getMarkers = function(n) {
    var batch = [];
    maxSize = Object.keys(this.markerMap).length;
    n = n <= maxSize ? n : maxSize;
    var locationIds = this.getRandomK(Object.keys(this.markerMap), n);
    for (var i = 0; i < n; i++) {
        //var tmpIcon = getWeatherIcon();
        batch.push(this.markerMap[locationIds[i]]);
    }
    return batch;
};

// randomly select k distinct indexes from array
App.getRandomK = function(array, k) {
    var taken = [];
    var ret = [];
    while (k > 0) {
        var index = Math.floor(Math.random() * array.length);
        if (index in taken) continue;
        taken.push(index);
        ret.push(array[index]);
        k--;
    }
    return ret;
};

App.init = function () {
    this.createMap();

    this.trucks = new this.TruckCollection();
    var that = this;
    this.trucks.fetch({
        success: function(trucks, response, options) {
            that.createMarkerMap(trucks);
            that.setupMarkers();
        }
    });

    new App.SearchControlView({el: $('#search-area') });
    this.queryResult = new App.QueryResultList();
};

/* ---------------------- Booting up ---------------------- */

$(document).ready(function () {
    App.currentInfoWindow = null;
    App.init();
});