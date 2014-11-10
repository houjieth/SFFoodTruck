import unittest
import time
from selenium import webdriver
from selenium.webdriver.common.keys import Keys

# web integration test for testing basic search features
class SearchTest(unittest.TestCase):

    URL = 'http://foodtruck.jiehou.net'
    ADDRESS_INPUT_ID = 'address-input'
    KEYWORD_INPUT_ID = 'keyword-input'
    TITLE = 'SF Food Truck Finder'
    SEARCH_ADDRESS = '800 Brannan St'
    SEARCH_FOOD_KEYWORD = 'burger'
    SEARCH_FOOD_INVALID_KEYWORD = 'HIV_virus'
    SEARCH_RESULT_AREA_ID = 'search-result-area'
    NO_RESULT_TEXT = "No result found"

    def setUp(self):
        self.driver = webdriver.Firefox()

    def test_search_truck_with_address(self):
        driver = self.driver

        # tell the driver only wait when necessary
        driver.implicitly_wait(10)  # in seconds

        driver.get(self.URL)
        self.assertIn(self.TITLE, driver.title)

        # start a test search with address only
        address_input = driver.find_element_by_id(self.ADDRESS_INPUT_ID)
        address_input.send_keys(self.SEARCH_ADDRESS)
        address_input.send_keys(Keys.RETURN)

        # verify that result should not be empty
        result_area = driver.find_element_by_id(self.SEARCH_RESULT_AREA_ID)
        results = result_area.find_elements_by_xpath("./div/*")
        assert len(results) > 0, "Search result shouldn't be empty"
        if len(results) == 1:
            first_result_text = results[0].find_element_by_xpath("./h4")
            print first_result_text

    def test_search_truck_with_address_and_keyword(self):
        driver = self.driver

        # tell the driver only wait when necessary
        driver.implicitly_wait(10)  # in seconds

        driver.get(self.URL)
        self.assertIn(self.TITLE, driver.title)

        # start a test search with address and keyword
        address_input = driver.find_element_by_id(self.ADDRESS_INPUT_ID)
        address_input.send_keys(self.SEARCH_ADDRESS)
        keyword_input = driver.find_element_by_id(self.KEYWORD_INPUT_ID)
        keyword_input.send_keys(self.SEARCH_FOOD_KEYWORD)
        keyword_input.send_keys(Keys.RETURN)

        # verify that result should not be empty
        time.sleep(1)  # DOM refresh takes a moment
        result_area = driver.find_element_by_id(self.SEARCH_RESULT_AREA_ID)
        results = result_area.find_elements_by_xpath("./div/*")
        assert len(results) > 0, "Search result shouldn't be empty"
        if len(results) == 1:
            first_result_text = results[0].find_element_by_xpath("./h4").text
            assert first_result_text != self.NO_RESULT_TEXT, "Should display a valid result"

    def test_search_truck_with_address_and_keyword_no_result(self):
        driver = self.driver

        # tell the driver only wait when necessary
        driver.implicitly_wait(10)  # in seconds

        driver.get(self.URL)
        self.assertIn(self.TITLE, driver.title)

        # start a test search with address and keyword
        address_input = driver.find_element_by_id(self.ADDRESS_INPUT_ID)
        address_input.send_keys(self.SEARCH_ADDRESS)
        keyword_input = driver.find_element_by_id(self.KEYWORD_INPUT_ID)
        keyword_input.send_keys(self.SEARCH_FOOD_INVALID_KEYWORD)
        keyword_input.send_keys(Keys.RETURN)

        # verify that result should not be empty
        time.sleep(1)  # DOM refresh takes a moment
        result_area = driver.find_element_by_id(self.SEARCH_RESULT_AREA_ID)
        results = result_area.find_elements_by_xpath("./div/*")
        assert len(results) == 1, "Search result should be empty"
        first_result_text = results[0].find_element_by_xpath("./h4").text
        assert first_result_text == self.NO_RESULT_TEXT, "Should display no result found"

    def tearDown(self):
        self.driver.close()

if __name__ == "__main__":
    unittest.main()