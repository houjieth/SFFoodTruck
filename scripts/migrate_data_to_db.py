import json

from pymongo import MongoClient

WORK_DB = 'test'
WORK_COLLECTION = 'SFFoodTruck'
INPUT_FILE_NAME = 'food_truck_data.json'

client = MongoClient()
db = client[WORK_DB]
collection = db[WORK_COLLECTION]

# clean the working collection if we already have one
if collection.count() > 0:
    collection.drop()

input_file = open(INPUT_FILE_NAME, "r")
trucks_json = input_file.read()
trucks = json.loads(trucks_json)

collection.insert(trucks)
collection.ensure_index([('food_items_str', 'text')])
collection.ensure_index([('loc', '2dsphere')])
