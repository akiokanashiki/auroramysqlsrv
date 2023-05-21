#!/bin/bash
while true; do
    bts=$(date "+%Y-%m-%d %H:%M:%S")
    echo -ne "${bts}\t"
    curl $1
    ats=$(date "+%Y-%m-%d %H:%M:%S")
    echo -ne "${ats}\t"
    echo ""
    sleep 1
done