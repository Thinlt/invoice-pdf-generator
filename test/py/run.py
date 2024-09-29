import requests
from concurrent.futures import ThreadPoolExecutor
import time

def get_url_status(url):
    """
    Get URL status and time
    """
    start_time = time.time()
    try:
        # please suggest print testing url
        print(f"GET: {url}")
        response = requests.get(url, timeout=60)
        status_code = response.status_code
        elapsed_time = time.time() - start_time
        return url, status_code, elapsed_time
    except requests.RequestException:
        return url, None, "request failed"

def main():
    start_time_main = time.time()
    with open('urls.txt') as f:
        links = [line.strip() for line in f]

    num_tests = len(links)
    num_passed = 0
    num_failed = 0

    print(f" --- START TESTING ---")

    # Test with ThreadPoolExecutor
    with ThreadPoolExecutor() as executor:
        results = list(executor.map(get_url_status, links))
        print(f" --- TESTED URLS ---")
        for url, status_code, elapsed_time in results:
            if isinstance(elapsed_time, (int, float)) and status_code == 200:
                print(f"{url}: [{status_code}] ({elapsed_time:.2f} seconds)")
                num_passed += 1
            else:
                print(f"{url}: [{status_code}] ({elapsed_time})")
                num_failed += 1

    elapsed_time_main = time.time() - start_time_main
    print(f" --- TEST RESULTS ---")
    print(f"Total time taken: {elapsed_time_main:.2f} seconds")
    print(f"Total number of tests: {num_tests}")
    print(f"Tests passed: {num_passed}/{num_tests}")
    print(f"Tests failed: {num_failed}")

if __name__ == '__main__':
    main()