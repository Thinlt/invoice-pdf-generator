import requests
from concurrent.futures import ThreadPoolExecutor
import time

def get_url_status(url):
    """
    Get URL status and time
    """
    start_time = time.time()
    try:
        response = requests.get(url, timeout=60)
        status_code = response.status_code
        elapsed_time = time.time() - start_time
        return url, status_code, elapsed_time
    except requests.RequestException:
        return url, None, "request failed"

def main():
    with open('urls.txt') as f:
        links = [line.strip() for line in f]

    # Test with ThreadPoolExecutor
    with ThreadPoolExecutor() as executor:
        results = list(executor.map(get_url_status, links))
        for url, status_code, elapsed_time in results:
            if isinstance(elapsed_time, (int, float)):
                print(f"{url}: {status_code} ({elapsed_time:.2f} seconds)")
            else:
                print(f"{url}: {status_code} ({elapsed_time})")

if __name__ == '__main__':
    main()