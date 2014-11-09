// TODO: 将不同的backbone class定义放到不同的文件中

var App = {};

App.Truck = Backbone.GoogleMaps.Location.extend({
});

App.TruckCollection = Backbone.GoogleMaps.LocationCollection.extend({
    model: App.Truck,
    url: '/api/v1/trucks'
});

//App.InfoWindow = Backbone.GoogleMaps.InfoWindow.extend({
//    template: '#infoWindow-template'
//});

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

App.currentInfoWindow = null;

/*
App.MarkerView = Backbone.GoogleMaps.MarkerView.extend({
    infoWindow: App.InfoWindow,

    initialize: function () {
        _.bindAll(this, 'handleDragEnd');
    },

    mapEvents: {
        'dragend': 'handleDragEnd',
        dblclick: 'tellTheWorldAboutIt'
    },

    handleDragEnd: function (e) {
        alert('Dropped at: \n Lat: ' + e.latLng.lat() + '\n lng: ' + e.latLng.lng());
    },

    tellTheWorldAboutIt: function () {
        console.assert(this instanceof App.MarkerView);
        alert('You done gone and double-clicked me!');
        this.logIt('I hope you know that this will go down on your permanent record.')
    },

    logIt: function (message) {
        console.assert(this instanceof App.MarkerView);
        console.log(message);
    }
});
*/

/*
App.TruckMarker = App.MarkerView.extend({
    overlayOptions: {
        icon: '/static/assets/truck_small.png'
    }
});

App.MarkerCollectionView = Backbone.GoogleMaps.MarkerCollectionView.extend({
    markerView: App.MarkerView,

    addChild: function (model) {
        this.markerView = App.TruckMarker;

        Backbone.GoogleMaps.MarkerCollectionView.prototype.addChild.apply(this, arguments);
    }
});
*/

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

    /*
    // Render Markers
    var markerCollectionView = new this.MarkerCollectionView({
        collection: this.trucks,
        map: this.map
    });
    markerCollectionView.render();
    */

    /*
    // Render ListView
    var listView = new App.ListView({
        collection: this.places
    });
    listView.render();
    */
};

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
            icon: '/static/assets/truck_small.png',
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

App.SearchControlView = Backbone.View.extend({
    events: {
        'change #address-input': 'startSearchWithAddress'
    },

    startSearchWithAddress: function(e) {
        var address = $(e.currentTarget).val();
        App.queryResult.queryWithAddress(address);
    }
});

App.Query = Backbone.Model.extend({
    maxDistance: 500, // TODO: make this dynamic!
    toQueryString: function() {
        return "?lat=" + this.get('lat') + "&lng=" + this.get('lng') + "&maxDistance=" + this.maxDistance;
    }
});

App.QueryResultItem = Backbone.Model.extend({

});

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
                //map.setCenter(results[0].geometry.location);
                //var marker = new google.maps.Marker({
                //    map: map,
                //    position: results[0].geometry.location
                //});
                that.loc = results[0].geometry.location;
                var lat = that.loc.lat();
                var lng = that.loc.lng();
                console.log(that.loc);
                var query = new App.Query({
                    lat: lat,
                    lng: lng
                });
                that.url = that.urlBase + query.toQueryString();
                console.log(that.url);
                that.fetch({
                    success: function(queryResult, response, options) {
                        that.updateMarkers();
                        that.displayQueryMarker();
                        that.updateResultListView();
                        App.map.setCenter(that.loc);
                        App.map.setZoom(16); // TODO: make this dynamic
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
        var resultListView = new App.QueryResultListView();
        resultListView.render();
    }
});

App.QueryResultItemView = Backbone.View.extend({
    template: '#search-result-template',

    render: function() {
        var template = _.template($(this.template).html());
        this.$el.html(template({
            name: this.model.get('name'),
            address: this.model.get('address'),
            food_items_str: this.model.get('food_items_str')
        }));
        console.log(this.el);
        return this;
    }
});

App.QueryResultListView = Backbone.View.extend({
    render: function() {
        $('#search-result-area > div').html("");
        for (var i = 0; i < App.queryResult.size(); i++) {
            var locationId = App.queryResult.at(i).get('location_id');
            var truck = App.trucks.findWhere({
                location_id: locationId
            });
            var resultItemView = new App.QueryResultItemView({
                model: truck
            });
            resultItemView.render();
            console.log(resultItemView.el);
            $('#search-result-area > div').append(resultItemView.$el.html());
        }
    }
});

/*
App.ItemView = Backbone.View.extend({
    template: '#search-result-template',
    tagName: 'li',

    events: {
        'mouseenter': 'selectItem',
        'mouseleave': 'deselectItem'
    },

    initialize: function () {
        _.bindAll(this, 'render', 'selectItem', 'deselectItem')

        this.model.on("remove", this.close, this);
    },

    render: function() {
        var template = _.template($(this.template).html());
        this.$el.html(template({
            name: this.model.get('name'),
            address: this.model.get('address'),
            food_items_str: this.model.get('food_items_str')
        }));
        return this;
    },

    close: function () {
        this.$el.remove();
    },

    selectItem: function () {
        alert("select");
        //this.model.select();
    },

    deselectItem: function () {
        alert("deselect");
        //this.model.deselect();
    }
});
*/

/*
App.ListView = Backbone.View.extend({
    tagName: 'ul',
    className: 'overlay',
    id: 'listing',

    initialize: function () {
        _.bindAll(this, "refresh", "addChild");

        this.collection.on("reset", this.refresh, this);
        this.collection.on("add", this.addChild, this);

        this.$el.appendTo('body');
    },

    render: function () {
        this.collection.each(this.addChild);
    },

    addChild: function (childModel) {
        var childView = new App.ItemView({ model: childModel });
        childView.render().$el.appendTo(this.$el);
    },

    refresh: function () {
        this.$el.empty();
        this.render();
    }
});
*/


$(document).ready(function () {
    App.init();

    /*
    $('#bars').click(function () {
        App.places.reset(bars);
    });

    $('#museums').click(function () {
        App.places.reset(museums);
    });

    $('#addBtn').click(function () {
        App.places.add({
            title: 'State Capitol Building',
            lat: 44.9543075,
            lng: -93.102222
        });
    });

    $('#removeBtn').click(function () {
        App.places.remove(App.places.at(0));
    });
    */
});