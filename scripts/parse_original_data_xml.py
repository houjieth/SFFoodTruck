import xml.etree.ElementTree as ET
import json
import re

from pygeocoder import Geocoder

'''
Read the raw food truck data in xml, then pick up the fields we feel 
interested in and put them into a new json file for later use in MongoDB
'''

output_file = open("food_truck_data.json", "w")

# xml parser
tree = ET.parse("food_truck_original_data.xml")
root = tree.getroot()

trucks = []

for row in root.find('row'):
    status = row.find('status').text
    if status == 'APPROVED': # only collect the active data
        location_id = row.find('objectid').text
        name = row.find('applicant').text
        address = None
        lat = None
        log = None
        if (row.find('address') != None):
            address =  row.find('address').text
        if (row.find('latitude') != None):
            lat = row.find('latitude').text
        if (row.find('longitude') != None):
            log = row.find('longitude').text
        # if we have the address but not the coordinates, we can use Google's Geocoding
        # API to get the latitude and longitude for the given address
        if (lat == None and address != None):
            address = address + ' San Francisco'
            geo_location = Geocoder.geocode(address)[0].coordinates
            lat = geo_location[0]
            log = geo_location[1]
        # collect descriptive keywords for later indexing in DB
        food_item_words = filter(None, re.split(":| |&|(|)", row.find('fooditems').text))
        food_items = [x.lower() for x in food_item_words]

        if (address and lat):
            truck = {
                'location_id': location_id,
                'name': name,
                'address': address,
                'lat': lat,
                'log': log,
                'food_items': food_items
            }
            trucks.append(truck)

# write out into new json file
trucks_json = json.dumps(trucks)
output_file.write(trucks_json)
output_file.close()
