#!/bin/bash

# Script to test subscribe_table functionality
# Contains test cases for four different matching scenarios

echo "🧪 Testing subscribe_table real-time push functionality"
echo ""
echo "=========================================="
echo "Test Case 1: Match only dapp_key"
echo "=========================================="
echo ""
echo "📤 curl command:"
echo ""
cat << 'EOF'
curl -N -X POST http://localhost:8080/subscribe_table \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "dapp_key": "4a32e78c9e54fe50d6fbc10bca503516344e06eac6b7cd0b7603b37498b3d964::dapp_key::DappKey"
  }'
EOF
echo ""
echo ""

echo "=========================================="
echo "Test Case 2: Match dapp_key + account"
echo "=========================================="
echo ""
echo "📤 curl command:"
echo ""
cat << 'EOF'
curl -N -X POST http://localhost:8080/subscribe_table \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "dapp_key": "707a6ac36222e54cceaa8e06497159be811cada48a13d6462c48056c66ec2d33::dapp_key::DappKey",
    "account": "15fde77101778fafe8382743171294dfd8e7900a547711ee375379c27a85fd31"
  }'
EOF
echo ""
echo ""

echo "=========================================="
echo "Test Case 3: Match dapp_key + account + table"
echo "=========================================="
echo ""
echo "📤 curl command:"
echo ""
cat << 'EOF'
curl -N -X POST http://localhost:8080/subscribe_table \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "dapp_key": "707a6ac36222e54cceaa8e06497159be811cada48a13d6462c48056c66ec2d33::dapp_key::DappKey",
    "account": "15fde77101778fafe8382743171294dfd8e7900a547711ee375379c27a85fd31",
    "table": "counter2"
  }'
EOF
echo ""
echo ""

echo "=========================================="
echo "Test Case 4: Full match (dapp_key + account + table + key)"
echo "=========================================="
echo ""
echo "📤 curl command:"
echo ""
cat << 'EOF'
curl -N -X POST http://localhost:8080/subscribe_table \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "dapp_key": "8041ce715dc516da7e67fcc43c0acc853e8f091dae0fd7b11cc5b071016dd614::dapp_key::DappKey",
    "account": "15fde77101778fafe8382743171294dfd8e7900a547711ee375379c27a85fd31",
    "table": "counter2",
    "key": []
  }'
EOF
echo ""
echo ""

echo "=========================================="
echo "💡 Usage Instructions:"
echo "=========================================="
echo "1. Copy any of the curl commands above and execute in terminal"
echo "2. The command will keep the connection open and receive matched data in real-time (SSE stream)"
echo "3. When new matched data is inserted, you will receive push notifications immediately"
echo "4. Press Ctrl+C to stop subscription"
echo ""
echo "5. Run /submit in another terminal to trigger data insertion and test real-time push"
echo ""


curl -X POST http://127.0.0.1:8080/submit -H "Content-Type: application/json" -d '{"chain":"sui","sender":"0x15fde77101778fafe8382743171294dfd8e7900a547711ee375379c27a85fd31","nonce":123,"ptb":{"version":2,"sender":null,"expiration":null,"gasData":{"budget":null,"price":null,"owner":null,"payment":null},"inputs":[{"UnresolvedObject":{"objectId":"0x8460e77cb4975a3110dd2a14d675720cfffef38ea41d96d1fd73b99c77c8bbbe"},"$kind":"UnresolvedObject"},{"Pure":{"bytes":"Aw=="},"$kind":"Pure"}],"commands":[{"MoveCall":{"package":"0x707a6ac36222e54cceaa8e06497159be811cada48a13d6462c48056c66ec2d33","module":"counter_system","function":"inc","typeArguments":[],"arguments":[{"Input":0,"type":"object","$kind":"Input"},{"Input":1,"type":"pure","$kind":"Input"}]},"$kind":"MoveCall"}]},"signature":"base64_encoded_signature_placeholder"}'


# Example: Get table data
curl -X POST http://localhost:8080/get_table \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "dapp_key": "8041ce715dc516da7e67fcc43c0acc853e8f091dae0fd7b11cc5b071016dd614::dapp_key::DappKey",
    "account": "8041ce715dc516da7e67fcc43c0acc853e8f091dae0fd7b11cc5b071016dd614",
    "table": "dapp_fee_config",
    "key": []
  }'


#!/bin/bash

# Curl examples for testing /health and /nonce

echo "=========================================="
echo "1. Health check (GET /health)"
echo "=========================================="
echo ""
echo "curl http://localhost:8080/health"
echo ""
curl -s http://localhost:8080/health
echo ""
echo ""

echo "=========================================="
echo "2. Get nonce (POST /nonce)"
echo "=========================================="
echo ""
echo "curl -X POST http://localhost:8080/nonce -H \"Content-Type: application/json\" -d '{\"sender\": \"0x15fde77101778fafe8382743171294dfd8e7900a547711ee375379c27a85fd31\"}'"
echo ""
curl -s -X POST http://localhost:8080/nonce \
  -H "Content-Type: application/json" \
  -d '{"sender": "0x15fde77101778fafe8382743171294dfd8e7900a547711ee375379c27a85fd31"}'
echo ""