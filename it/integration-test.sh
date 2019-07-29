#!/bin/sh

REPOSITORY="/tmp/simple-repository-manager-it"

test -e pom.xml || exit 1

rm -rf "./target"
mkdir -p "target"

rm -rf "${REPOSITORY}"
mkdir -p "${REPOSITORY}"

../src/main.js ./config.yaml &
SERVER_PID="$!"

mvn deploy &>target/mvn.log

kill ${SERVER_PID}

find "${REPOSITORY}" >"target/find.txt" || exit 1

diff "expected.txt" "target/find.txt"
