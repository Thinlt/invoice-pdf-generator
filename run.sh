#!/bin/bash
cd $(dirname "$0")/
source ~/.nvm/nvm.sh
npm stop
npm start
