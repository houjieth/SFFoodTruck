import json

from flask import Flask
from flask import request
from pymongo import MongoClient
from flask import render_template
from werkzeug.exceptions import BadRequest, InternalServerError


WORK_DB = 'test'
WORK_COLLECTION = 'SFFoodTruck'

app = Flask(__name__)
mongo_client = MongoClient()
db = mongo_client[WORK_DB]
collection = db[WORK_COLLECTION]

@app.route('/')
def index():
    return render_template('index.html')

'''
Get a list of all information about all trucks.

- Parameters:
    none
- Return:
    a json list of all trucks' information
'''
@app.route('/api/v1/trucks')
def trucks_list():
    trucks = []
    try:
        cursor = collection.find()
    except:
        raise InternalServerError("DB lookup failed")

    for truck in cursor:
        del(truck['_id'])  # we don't want to expose internal id
        trucks.append(truck)
    return json.dumps(trucks)

'''
Query nearby trucks based on the location, max distance and food item keyword

- Parameters:
    lat: latitude of location query
    lng: longitude of location query
    maxDistance: query radius (in meters)
    keyword: (optional) keyword specify the food type
- Return:
    a json list of location ids of the trucks in the query result
'''
@app.route('/api/v1/trucks/nearby')
def nearby_trucks_list():
    try:
        max_distance = float(request.args.get('maxDistance'))
        lng = float(request.args.get('lng'))
        lat = float(request.args.get('lat'))
        keyword = request.args.get('keyword')
    except:
        raise BadRequest("Invalid query request")

    try:
        truck_ids = []
        cursor = collection.find({'loc': {'$near':
                                              {'$geometry':
                                                   {'type': 'Point',
                                                    'coordinates': [lng, lat]},
                                               '$maxDistance': max_distance
                                              }}})
    except:
        raise InternalServerError("DB lookup failed")

    for truck in cursor:
        truck_ids.append(truck['location_id'])

    # Since mongodb doesn't support use text search and geospatial search
    # in the same query, we need to do two queries separately and find
    # the intersection of the results
    if keyword is not None:
        try:
            cursor = collection.find({'$text': {'$search': keyword}})
        except:
            raise InternalServerError("DB lookup failed")
        truck_ids_2 = []
        for truck in cursor:
            truck_ids_2.append(truck['location_id'])
        truck_ids = list(set(truck_ids).intersection(set(truck_ids_2)))

    trucks = []
    for tid in truck_ids:  # generating the result json list
        trucks.append({
            'location_id': tid
        })
    return json.dumps(trucks)

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5000)