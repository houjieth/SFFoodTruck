San Francisco Food Truck Finder
===============================

This web app let you find food trucks around a specific location in San Francisco. You can also specify the food type keywords in your search. 

The app is currently hosted at [foodtruck.jiehou.net](http://foodtruck.jiehou.net)

This app is basically a single page application using frontend rendering and ajax only. We use Backbone.js, Flask and MongoDB in the technical stack. So it's a full-stack product.

Data Preparation
----------------
All the food truck data comes from [here](https://data.sfgov.org/Economy-and-Community/Mobile-Food-Facility-Permit/rqzj-sfat?). We export the data to a XML document, then we use `parse_original_data_xml.py` to read the xml, getting the fields we feel interested in, and then write to a new JSON text file (`food_truck_data.json`). 

We notice that some of the original food truck data miss the coordinates, but has street address. During the above process we use Google's geocoding API to translate the street address into coordinates. In the end, all food trucks have specific latitude and longitute.

Data Storage
------------
We use MongoDB for storing the data. We choose MongoDB because:

* We are not storing relational data, and we don't need a relational schema for supporting joints and aggregation
* MongoDB provides a good indexing system which allows us to query text and geospatial coordinates efficiently
* We didn't choose MySQL or PostgreSQL because we don't need table joins or complex queries

One interesting part is how MongoDB keep the geospatial index. Essentially it uses a multikey index called "2dsphere" which indexes locations based on their coordinates. Internally it uses B tree to support `O(logn)` speed for doing range query, which is what we use to query locations around a specific coordinate.

We have a collection in MongoDB called "SFFoodTruck". Each doc in this collection is a json representing the name, address, coordinates, location id and food types of a truck. Trucks are indexed by text in food items and coordinates, with two separate indexes.

Backend Design
--------------
We use Flask for our backend service. We choose Flask becuase:

* It's lightweight!
* In this app, we will only need to expose very simple APIs. There's not so much rendering happening in our backend because our frontend handling most of the DOM rendering. So we can focus on providing good APIs for our front to use
* We didn't choose Django because it's too heavy weight and we don't actually need the complex backend rendering and logic inside it

The backend provides with only three APIs exposed:

GET `/`

* Render the index.html

GET `/api/v1/trucks`

* Get a list of all information about all trucks

GET `/api/v1/trucks/nearby`

* Query nearby trucks based on the location, max distance and food item keyword

What Flask does is mostly querying MongoDB and result the query result. When we need to query both food item text and coordinates, we will do the interesections in memory, instead of doing it using complex MongoDB queries.

The server is really lightweight and contains a single file `server.py`.

Frontend Design
---------------
We use Backbone.js for modeling or truck data and all views becuase:

* We don't want to store the data in DOM and we don't want to doing extensive DOM manipulations in the frontend because it's hard to scale our project and painful to write.
* We want to provide good interactive UI where the frontend handling the view changes as the user operates
* We didn't chosse Angular or Ember because it's still a simple app. At this scale, Backbone is good enough to handle the event binding manually where as Angular or Ember is sort of overkilling.

We extensively use Google Maps APIs to visualize the trucks on the map. The main logic is included inside `app.js`

### Models ###
At the initial page load, we load and store all the trucks' information in a collection of `App.Truck` model. We also model the query in `App.Query` and query result in `App.QueryResultItem` and `App.QueryResultList` so we can use object-oriented way for interacting with the model.

### Views ###
All the query result, and info popup window are representated with Backbone views. For easier integration with Google Maps Javascript API, we use a [open source library](https://github.com/eschwartz/backbone.googlemaps) which servers as adapter betwee our Backbone view object and Google Maps Javascript object.

### Connecting Models and Views ###
We have all the truck info in memory, but we need to decide when to show which views depend on the user query. So we keep a `markerMap`, which maps a truck model to its views including markers and info window. When the query changes, we change the mapping accordingly so the user can see the screen updates.

### Optimization for Browsing ###
The user can not only make queries, but also browsing the maps to view available trucks. Since there are too many trucks, we cannot show all the markers on screen (this will pollute the map). We use Google's [MarkerManager](http://google-maps-utility-library-v3.googlecode.com/svn/tags/markermanager/1.0/docs/reference.html) to help us doing optimizations. Basically we randomly choose different amount of trucks to show on the screen depends on the current zoom level.

### UI Polishing ###
We use Bootstrap and css animation for making the UI prettier. We keep a simplistic design so the user interface is clean and intuitive.

Testing
-------
We have end to end test for testing our basic search features including happy and error cases.

We use [Selenium Webdriver](http://www.seleniumhq.org) as our test driver. The test is written in python in `test/search_test.py` using python SDKs for Selenium. We simulate the user typing the url, typing search words and firing queries. We check the DOM to verify our website is giving sane output.

This repo contains files for SF Food Truck Finder app.

How to Run
----------
First, install dependencies

    (In your virtualenv)
    $ pip install -r requirements.txt
	
Start the Flask server (You may want to first modify the port number in `server.py` before run it)

	$ python server.py
	
Open your browser and hit `localhost:[PORT_NUMBER]`, there you go!

How to Run Test
---------------
Download and install Selenium Driver from [http://www.seleniumhq.org/](http://www.seleniumhq.org/). The start the driver:

	$ java -jar ava -jar selenium-server-standalone-[VERSION_NUMBER].jar
	
Then we can run the integration test using:

	$ python test/search_test.py
	
Remember that by default you need to have Firefox installed since it's the default testing browser Selenium uses.

File Structures
---------------
	.
	├── README.md
	├── requirements.txt
	├── scripts								// scripts for processing raw data
	│   ├── __init__.py
	│   ├── food_truck_data.json
	│   ├── food_truck_original_data.json
	│   ├── food_truck_original_data.xml
	│   ├── migrate_data_to_db.py
	│   └── parse_original_data_xml.py
	├── server.py
	├── static
	│   ├── css
	│   │   ├── app.css						// main css
	│   │   └── lib
	│   │       ├── animation.css
	│   │       ├── bootstrap.css
	│   │       └── bootstrap.css.map
	│   ├── doc
	│   │   ├── design_doc.html
	│   │   └── design_doc.md
	│   ├── images
	│   │   ├── favicon.ico
	│   │   ├── truck.png
	│   │   └── truck_small.png
	│   └── js
	│       ├── app.js						// main js
	│       └── lib
	│           ├── backbone.googlemaps.js
	│           ├── backbone.js
	│           ├── bootstrap.js
	│           ├── jquery-2.0.3.js
	│           ├── markermanager.js
	│           └── underscore.js
	├── templates
	│   └── index.html						// main website page
	└── test								// integration tests
	    └── search_test.py
	  
Known Issue
-----------
The initial page load needs to load about 200KB data as well as Google Maps data. It might take a few seconds. If it fails to load, refresh it. The later page load will be much faster since most maps data will be cached.

Acknowledgement
---------------
Opensoure libraries used for this project:

* [backbone.googlemaps](https://github.com/eschwartz/backbone.googlemaps)
* [Bootstrap](http://getbootstrap.com/)
* [CSS Animation Cheetsheet](http://www.justinaguilar.com/animations/index.html)


*Copyright 2014 Jie Hou. All the sources for this project is fully free for use for any purposes.*