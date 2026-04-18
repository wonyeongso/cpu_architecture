#!/bin/bash
set -e

# Use locally installed Node 20 (system node is too old for Vite 5)
export PATH="$HOME/tools/node-v20.19.4-linux-x64/bin:$PATH"

echo "Building with $(node --version)..."
npx vite build

echo "Deploying to gh-pages..."
rm -rf /tmp/arm-study-deploy
mkdir /tmp/arm-study-deploy
cp -r dist/. /tmp/arm-study-deploy/
cd /tmp/arm-study-deploy
git init -b gh-pages
git add -A
git commit -m "Deploy $(date +%Y-%m-%d\ %H:%M)"
git remote add origin https://github.mangoboost.io/wonyeong-so/arm-study.git
git push -f origin gh-pages

echo "Done! https://github.mangoboost.io/pages/wonyeong-so/arm-study/"
