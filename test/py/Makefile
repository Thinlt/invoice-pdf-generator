# Makefile for myproject

# Virtual environment settings
VENV_DIR = venv
VENV_PYTHON = $(VENV_DIR)/bin/python
VENV_PIP = $(VENV_DIR)/bin/pip

# Dependency settings
DEPENDENCIES = requests numpy pandas

# Default target
all: venv install

# Create virtual environment
venv:
	@echo "Creating virtual environment..."
	virtualenv $(VENV_DIR) --system-site-packages
	@echo "Virtual environment created."

# Install dependencies
install:
	@echo "Installing dependencies..."
	$(VENV_PIP) install -r requirements.txt
	@echo "Dependencies installed."

# Update dependencies
update:
	@echo "Updating dependencies..."
	$(VENV_PIP) install --upgrade -r requirements.txt
	@echo "Dependencies updated."

# Clean virtual environment
clean:
	@echo "Cleaning virtual environment..."
	rm -rf $(VENV_DIR)
	@echo "Virtual environment cleaned."

# Run tests
test:
	@echo "Running tests..."
	$(VENV_PYTHON) -m unittest discover -s tests -p 'test_*.py'
	@echo "Tests completed."

# Run application
run:
	@echo "Running testing application..."
	$(VENV_PYTHON) run.py
	@echo "Test application completed."