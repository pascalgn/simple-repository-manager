#!/bin/sh

REPOSITORY="/tmp/simple-repository-manager-it"

test -e pom.xml || exit 1

rm -rf "./target"
mkdir -p "target"

rm -rf "${REPOSITORY}" || exit 1
mkdir -p "${REPOSITORY}" || exit 1

../src/main.js ./config.yaml &
SERVER_PID="$!"

if ! mvn -s ./settings.xml deploy &>target/mvn.log; then
    echo "mvn deploy did not finish successfully!"
fi

kill ${SERVER_PID}

find "${REPOSITORY}" >"target/find.txt" || exit 1

diff "expected.txt" "target/find.txt" && echo "Test OK!"
