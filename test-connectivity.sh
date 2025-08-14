#!/bin/bash

# Test script to verify real data connectivity
echo "🧪 Testing Shugur Relay Data Connectivity"
echo "========================================"

RELAY_HOST="localhost:8080"
METRICS_HOST="localhost:2112"

echo ""
echo "Testing relay APIs..."

# Test 1: NIP-11 endpoint
echo -n "1. NIP-11 Relay Info: "
if curl -s -H "Accept: application/nostr+json" http://$RELAY_HOST/ > /dev/null; then
    echo "✅ Success"
    echo "   $(curl -s -H "Accept: application/nostr+json" http://$RELAY_HOST/ | jq -r '.name // "Unknown"') - $(curl -s -H "Accept: application/nostr+json" http://$RELAY_HOST/ | jq -r '.software // "Unknown"') v$(curl -s -H "Accept: application/nostr+json" http://$RELAY_HOST/ | jq -r '.version // "Unknown"')"
else
    echo "❌ Failed"
    echo "   Make sure your relay is running on port 8080"
fi

# Test 2: Stats API
echo -n "2. Stats API: "
if curl -s http://$RELAY_HOST/api/stats > /dev/null; then
    echo "✅ Success"
    STATS=$(curl -s http://$RELAY_HOST/api/stats)
    CONNECTIONS=$(echo $STATS | jq -r '.stats.active_connections // 0')
    EVENTS=$(echo $STATS | jq -r '.stats.events_stored // 0')
    echo "   $CONNECTIONS active connections, $EVENTS events stored"
else
    echo "❌ Failed"
    echo "   API endpoint not available"
fi

# Test 3: Cluster API
echo -n "3. Cluster API: "
if curl -s http://$RELAY_HOST/api/cluster > /dev/null; then
    echo "✅ Success"
    IS_CLUSTER=$(curl -s http://$RELAY_HOST/api/cluster | jq -r '.is_cluster // false')
    echo "   Cluster mode: $IS_CLUSTER"
else
    echo "❌ Failed"
    echo "   Cluster API not available"
fi

# Test 4: Metrics endpoint
echo -n "4. Prometheus Metrics: "
if curl -s http://$METRICS_HOST/metrics > /dev/null; then
    echo "✅ Success"
    METRIC_COUNT=$(curl -s http://$METRICS_HOST/metrics | grep -c "nostr_relay_")
    echo "   $METRIC_COUNT Nostr metrics available"
else
    echo "❌ Failed"
    echo "   Metrics not available on port 2112"
fi

echo ""
echo "Dashboard connectivity test..."

# Test 5: Dashboard can reach APIs
echo -n "5. Dashboard Connectivity: "
cd "$(dirname "$0")"
if [ -f "dashboard.js" ]; then
    echo "✅ Dashboard files present"
    echo "   Start dashboard with: python3 -m http.server 8001"
    echo "   Then visit: http://localhost:8001"
else
    echo "❌ Dashboard files missing"
fi

echo ""
echo "Quick Commands:"
echo "  Start Relay:     cd ../.. && ./bin/relay start"
echo "  Start Dashboard: python3 -m http.server 8001"
echo "  View Metrics:    curl http://localhost:2112/metrics | grep nostr_relay"
echo ""

# Show current relay process
if pgrep -f "relay" > /dev/null; then
    echo "✅ Relay process is running"
else
    echo "⚠️  No relay process detected"
    echo "   Run: cd ../.. && ./bin/relay start"
fi
