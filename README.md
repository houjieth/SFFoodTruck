SF Food Truck Finder
====================
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