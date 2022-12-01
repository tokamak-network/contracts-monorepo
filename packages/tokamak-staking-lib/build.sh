#!/bin/sh

tsc
cp ./README.md ./dist/
cp ./package.json ./dist/
cp -r ./src/contracts/abi ./dist/src/contracts/

exit 0
