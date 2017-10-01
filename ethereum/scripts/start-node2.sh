#!/bin/bash

GETH=/usr/bin/geth
DATADIR=/home/carlos/work/dev/ethereum/geth_test/private
NETWORKID=15
BOOTNODE_IP=54.255.217.250
#BOOTNODE=enode://0aab06416a20cbf8dd5ee5beb2d2ec647034c65a19ebbd9b3f2bbb79368b21df0f083c7c837c9dee00954eb8b62463c4e061fe3affb76f4b75d601abd20085b9@"$BOOTNODE_IP":30303
#BOOTNODE=enode://88748fad9c3812040676d9ca4aac7061b9164056c5d49c4cf4835e90f1d6d3958a03a87c0c0c86a7b0181a117c3cb924a8efd1968d61bb89eae192656599ac2f@"$BOOTNODE_IP":30303?discport=0
BOOTNODE=enode://dc776fad97f0266add4d8a6762cf3eab9f6c8614b158089f76c4ae6a19e9563dccdd853aa86ed7a69157bcd730ff418732be42acb39cd0f5dcf79b3c6e6a10a7@"$BOOTNODE_IP":30303

echo "$BOOTNODE"

$GETH \
 --bootnodes "$BOOTNODE" \
 --datadir "$DATADIR" \
 --nodiscover \
 --maxpeers 10 \
 --networkid "$NETWORKID" \
 --rpc \
 --rpccorsdomain "*" \
 --fast \
 console
