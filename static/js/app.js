var App = {};

/* ---------------------- Models ---------------------- */

App.Truck = Backbone.GoogleMaps.Location.extend();

App.TruckCollection = Backbone.GoogleMaps.LocationCollection.extend({
    model: App.Truck,
    url: '/api/v1/trucks'
});

App.Query = Backbone.Model.extend({
    // The search range is currently fixed, which is not ideal.
    // In future we should dynamically set this based on how many result we can get,
    // because we don't want to show too many or too few results to the user.
    maxDistance: 600, // in meters

    toQueryString: function() {
        var str = "?lat=" + this.get('lat') + "&lng=" + this.get('lng') + "&maxDistance=" + this.maxDistance;
        if (this.get('keyword'))
            str += "&keyword=" + this.get('keyword');
        return str;
    }
});

App.QueryResultItem = Backbone.Model.extend();

App.QueryResultList = Backbone.Collection.extend({
    urlBase: '/api/v1/trucks/nearby',
    model: App.QueryResultItem,
    addressSuffix: " San Francisco, CA", // we only search in SF
    resultArea: '#search-result-area',

    initialize: function() {
        this.geocoder = new google.maps.Geocoder();
    },

    makeQuery: function(address, keyword) {
        if (!address) {
            alert("Please input an address");
            return;
        }
        address += this.addressSuffix;
        var that = this;

        // To make an query, we will first use Google's geocoding API to translate
        // street address into coordinates. Then we call our backend API to get a
        // list of locationIds for food trucks.
        this.geocoder.geocode( {'address': address}, function(results, status) {
            if (status == google.maps.GeocoderStatus.OK) {
                that.loc = results[0].geometry.location;
                var lat = that.loc.lat();
                var lng = that.loc.lng();
                var query = new App.Query({
                    lat: lat,
                    lng: lng,
                    keyword: keyword
                });
                that.url = that.urlBase + query.toQueryString();
                that.fetch({
                    success: function(queryResult, response, options) {
                        that.updateMarkers();
                        that.displayQueryMarker();
                        that.updateResultListView();
                        App.map.setCenter(that.loc); // center screen to the typed address
                        App.map.setZoom(17); // zoom close enough to the typed address
                    }
                });
            } else {
                alert("Geocode was not successful for the following reason: " + status);
            }
        });
    },

    // Display a big marker in the center of screen to indicate the typed address
    displayQueryMarker: function() {
        App.markerManager.addMarker(
            new google.maps.Marker({
                position: this.loc,
                title: 'Query Marker',
                animation: google.maps.Animation.DROP
            })
            , 13); // minimum zoom level
    },

    // Render the marker on the screen based on the result food truck list
    updateMarkers: function() {
        App.markerManager.clearMarkers();
        for(var i = 0; i < App.queryResult.size(); i++) {
            var result = App.queryResult.at(i);
            var locationId = result.get('location_id');
            App.markerManager.addMarker(App.markerMap[locationId], 13);
        }
    },

    // update result list in the right side of screen
    updateResultListView: function() {
        var resultListView = new App.QueryResultListView({
            el: $(this.resultArea)
        });
        resultListView.render();
        var resultArea = $(this.resultArea);
        // add pull down animation for the search result
        resultArea.css('visibility', 'visible');
        resultArea.addClass('pullDown');
    }
});


/* ---------------------- Views ---------------------- */

// View for the popup after clicking the marker
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

// View for typing the search address and food keyword
App.SearchControlView = Backbone.View.extend({
    events: {
        'change input': 'startSearch'
    },
    addressInputTag: '#address-input',
    keywordInputTag: '#keyword-input',

    startSearch: function(e) {
        var address = this.$el.find(this.addressInputTag).val();
        var keyword = this.$el.find(this.keywordInputTag).val();
        App.queryResult.makeQuery(address, keyword);
    }
});

// View for showing a single search result
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

// View for showing when there's no result found
App.QueryResultEmptyItemView = Backbone.View.extend({
    template: '#search-result-empty-template',

    render: function() {
        var template = _.template($(this.template).html());
        this.$el.html(template());
        return this;
    }
});

// View for showing a list of search results
App.QueryResultListView = Backbone.View.extend({

    render: function() {
        var resultArea = this.$el.find('div');
        resultArea.html("");
        if (App.queryResult.length == 0) {
            var emptyResultView = new App.QueryResultEmptyItemView({
                el: resultArea
            });
            emptyResultView.render();
        }
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
        center: new google.maps.LatLng(37.77, -122.4167), // locate to the center of SF
        zoom: 13,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };

    // Instantiate map
    this.map = new google.maps.Map($('#map_canvas')[0], mapOptions);

};

// We only load the truck data once (during the first page load). These truck data are
// stored by App.Truck models. For display, we will render markers for some trucks on
// the screen. So we use a markerMap which tells "should we display marker for this truck
// or not". The markerMap will be updated regularly when search result changes, but no more
// truck data load is needed.
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
        // Bind the click event to the marker. After clicking a marker,
        // a info window will popup showing the details
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

// We need to be smart to make a great browsing (not searching) experience for user.
// There are too many trucks to be shown at the same time on the screen, we need
// to show only some of the trucks to not make the map look too messy. And, this will
// also save cpu and memory resource of the client's browser. So we use Google's
// MarkerManger to pre-set the number of markers on the screen depends on different
// zoom levels.
App.setupMarkers = function() {
    this.markerManager = new MarkerManager(this.map);
    var that = this;
    google.maps.event.addListener(this.markerManager, 'loaded', function () {
        // show different number of markers for different zoom level
        that.markerManager.addMarkers(that.getMarkers(2), 12);
        that.markerManager.addMarkers(that.getMarkers(45), 13);
        that.markerManager.addMarkers(that.getMarkers(90), 14);
        that.markerManager.addMarkers(that.getMarkers(180), 15);
        that.markerManager.addMarkers(that.getMarkers(360), 16);
        that.markerManager.addMarkers(that.getMarkers(720), 17);
        that.markerManager.refresh();
    });
};

// randomly get n markers
App.getMarkers = function(n) {
    var batch = [];
    maxSize = Object.keys(this.markerMap).length;
    n = n <= maxSize ? n : maxSize;
    var locationIds = this.getRandomK(Object.keys(this.markerMap), n);
    for (var i = 0; i < n; i++) {
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