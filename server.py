import json

from flask import Flask
from flask import request
from pymongo import MongoClient
from flask import render_template


WORK_DB = 'test'
WORK_COLLECTION = 'SFFoodTruck'

app = Flask(__name__)
mongo_client = MongoClient()
db = mongo_client[WORK_DB]
collection = db[WORK_COLLECTION]

# TODO: for all the methods here, add exception handling logic!

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/v1/trucks')
def trucks_list():
    trucks = []
    cursor = collection.find()
    for truck in cursor:
        del(truck['_id']) # no need to expose internal id
        trucks.append(truck)
    return json.dumps(trucks)

@app.route('/api/v1/trucks/nearby')
def nearby_trucks_list():
    maxDistance = float(request.args.get('maxDistance'))
    lng = float(request.args.get('lng'))
    lat = float(request.args.get('lat'))
    trucks = []
    cursor = collection.find({'loc':
                                  {'$near':
                                       {'$geometry':
                                            {'type': 'Point',
                                             'coordinates': [lng, lat]},
                                        '$maxDistance': maxDistance
                                       }}})
    for truck in cursor:
        trucks.append({
            'location_id': truck['location_id']
        })
    return json.dumps(trucks)

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=80)
