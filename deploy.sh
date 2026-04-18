#!/bin/bash
set -e

# Use locally installed Node 20 (system node is too old for Vite 5)
export PATH="$HOME/tools/node-v20.19.4-linux-x64/bin:$PATH"

echo "Building with $(node --version)..."
npx vite build

echo "Deploying to gh-pages..."
rm -rf /tmp/cpu-study-deploy
mkdir /tmp/cpu-study-deploy
cp -r dist/. /tmp/cpu-study-deploy/
cd /tmp/cpu-study-deploy
git init -b gh-pages
git add -A
git commit -m "Deploy $(date +%Y-%m-%d\ %H:%M)"
git remote add origin https://github.mangoboost.io/wonyeong-so/cpu-study.git
git push -f origin gh-pages

echo "Done! https://github.mangoboost.io/pages/wonyeong-so/cpu-study/"
