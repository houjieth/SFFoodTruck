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
    render: function() {
        var template = _.template($('#infoWindow-template').html());
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
            icon: '/static/assets/truck_small.png'
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
    var mgr = new MarkerManager(this.map);
    var that = this;
    google.maps.event.addListener(mgr, 'loaded', function () {
        mgr.addMarkers(that.getMarkers(2), 12);
        mgr.addMarkers(that.getMarkers(45), 13);
        mgr.addMarkers(that.getMarkers(90), 14);
        mgr.addMarkers(that.getMarkers(180), 15);
        mgr.addMarkers(that.getMarkers(360), 16);
        mgr.addMarkers(that.getMarkers(720), 17);
        mgr.refresh();
    });
};

App.getMarkers = function(n) {
    var batch = [];
    maxSize = Object.keys(this.markerMap).length;
    n = n <= maxSize ? n : maxSize;
    console.log(n);
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



/**
 * List view
 */
/*
App.ItemView = Backbone.View.extend({
    template: '<%=title %>',
    tagName: 'li',

    events: {
        'mouseenter': 'selectItem',
        'mouseleave': 'deselectItem'
    },

    initialize: function () {
        _.bindAll(this, 'render', 'selectItem', 'deselectItem')

        this.model.on("remove", this.close, this);
    },

    render: function () {
        var html = _.template(this.template, this.model.toJSON());
        this.$el.html(html);

        return this;
    },

    close: function () {
        this.$el.remove();
    },

    selectItem: function () {
        this.model.select();
    },

    deselectItem: function () {
        this.model.deselect();
    }
});

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