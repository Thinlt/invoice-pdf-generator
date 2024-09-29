# Testing Program

## Getting Started

This testing program helps you evaluate the performance of your application by running tests on various URLs.

### Prerequisites

- Python 3.x installed
- Make utility (usually pre-installed on Unix-based systems)

### Installation

1. Clone the repository:
   `git clone https://github.com/your-repository-url`

2. Navigate to the project directory:
   `cd ./pdf_generator/test/py`

3. Create a virtual environment (optional, but recommended):

   ```
   python3 -m venv venv
   source venv/bin/activate
   ```

4. Install the required dependencies:
   `pip install -r requirements.txt`

### Usage

1. Add your URLs to the `urls.txt` file, one URL per line.

2. Run the tests using the Makefile:
   `make & make run`

## Modifying the Test Program

To customize the test program, refer to the Makefile in the project directory. For more information on the Makefile, refer to the following links:

- https://www.gnu.org/software/make/manual/make.html
- https://makefiletutorial.com/
