

# PDF Generator Document

## 1. Install Nodejs (version v18)
  - Install nvm (https://github.com/nvm-sh/nvm) to support managing easily nodejs versions
    
    ```
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
    ```

  - Add nvm path to .bashrc - run follow command
    
    ```
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion
    ```

  - Install nodejs version by command 
    
    ```
    nvm install 18.18.0
    ```

  - Install google chrome driver
    
    ```
    npx puppeteer browsers install chrome
    ```

    If successful, the command outputs the actual browser buildId that was installed and the absolute path to the
    browser executable (format: <browser>@<buildID> <path>), we will see the output like this:
    
    chrome@127.0.6533.88 /home/ubuntu/.cache/puppeteer/chrome/linux-127.0.6533.88/chrome-linux64/chrome
    
    If run this command `npx puppeteer browsers launch chrome` and error 
    
    ```
    code: 'ENOENT',
    syscall: 'spawn /home/ubuntu/.cache/puppeteer/chrome/linux-pinned/chrome-linux64/chrome',
    path: '/home/ubuntu/.cache/puppeteer/chrome/linux-pinned/chrome-linux64/chrome',
    ```

    please make the link in the folder /home/ubuntu/.cache/puppeteer/chrome/linux-127.0.6533.88/chrome-linux64/chrome to /home/ubuntu/.cache/puppeteer/chrome/linux-pinned/chrome-linux64/chrome

    ```
    mkdir -p /home/ubuntu/.cache/puppeteer/chrome/linux-pinned/chrome-linux64 && ln -nfs /home/ubuntu/.cache/puppeteer/chrome/linux-127.0.6533.88/chrome-linux64/chrome /home/ubuntu/.cache/puppeteer/chrome/linux-pinned/chrome-linux64/chrome
    ```

## 2. Install Chromium (Required *)
- Install Chromium by snap
  ```sudo snap install chromium```

  or by apt:

- Step 1: Add (if not added already) the Google Chrome repository
    ```
    wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
    ```
    ```
    sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list'
    ```
- Step 2: Install or Upgrade Google Chrome
    ```
    sudo apt-get update
    ```
    ```
    sudo apt-get install google-chrome-stable
    ```
    run this if error when installing
    ```
    sudo apt-get install -f
    ```
- Step-3: Verify version
    ```
    google-chrome --version
    ```
    you will see the output will be Google Chrome version.


## 3. Add config to Supervisor (install supervisor if not installed)
  - Add config to supervisor
    ```
    # Run PDF Generator (node puppeteer)
    [program:pdf_generator]
    process_name=%(program_name)s
    command=/var/www/pdf_invoice/pdf_generator/run.sh
    user=ubuntu
    autostart=true
    autorestart=true
    redirect_stderr=true
    stdout_logfile=/var/log/supervisor/worker_pdf_generator.log
    ```
  Note: 
  + Replace path /var/www/pdf_invoice/ with your project path
  + You should run the command `supervisorctl reread` and `supervisorctl update`
  
## 4. Troubleshooting: 
(Read more here https://pptr.dev/troubleshooting)

### Install required for chromium in server (ubuntu):
  - Check by command `ldd chrome | grep not` and see which dependencies are missing below
    ```
    ca-certificates
    fonts-liberation
    libasound2
    libatk-bridge2.0-0
    libatk1.0-0
    libc6
    libcairo2
    libcups2
    libdbus-1-3
    libexpat1
    libfontconfig1
    libgbm1
    libgcc1
    libglib2.0-0
    libgtk-3-0
    libnspr4
    libnss3
    libpango-1.0-0
    libpangocairo-1.0-0
    libstdc++6
    libx11-6
    libx11-xcb1
    libxcb1
    libxcomposite1
    libxcursor1
    libxdamage1
    libxext6
    libxfixes3
    libxi6
    libxrandr2
    libxrender1
    libxss1
    libxtst6
    lsb-release
    wget
    xdg-utils
    ```