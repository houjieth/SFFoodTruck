import json

from flask import Flask
from flask import request
from pymongo import MongoClient


WORK_DB = 'test'
WORK_COLLECTION = 'SFFoodTruck'

app = Flask(__name__)
mongo_client = MongoClient()
db = mongo_client[WORK_DB]
collection = db[WORK_COLLECTION]

# TODO: for all the methods here, add exception handling logic!

@app.route("/api/v1/trucks")
def trucks_list():
    trucks = []
    cursor = collection.find()
    for truck in cursor:
        del(truck['_id']) # no need to expose internal id
        trucks.append(truck)
    return json.dumps(trucks)

@app.route("/api/v1/trucks/nearby")
def nearby_trucks_list():
    maxDistance = float(request.args.get('maxDistance'))
    log = float(request.args.get('log'))
    lat = float(request.args.get('lat'))
    trucks = []
    cursor = collection.find({'loc':
                                  {'$near':
                                       {'$geometry':
                                            {'type': 'Point',
                                             'coordinates': [log, lat]},
                                        '$maxDistance': maxDistance
                                       }}})
    for truck in cursor:
        del(truck['_id']) # no need to expose internal id
        trucks.append(truck)
    return json.dumps(trucks)

if __name__ == "__main__":
    app.run(debug=True)
