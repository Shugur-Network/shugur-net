#!/usr/bin/env python3
"""
Test script for the centralized dashboard endpoints
"""
import requests
import json
import time

def test_endpoints():
    base_url = "http://localhost:8003"
    
    print("🧪 Testing Shugur Network Dashboard Endpoints\n")
    
    # Test 1: Single relay proxy
    print("1️⃣ Testing single relay proxy...")
    try:
        response = requests.get(f"{base_url}/proxy/shu01.shugur.net", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ shu01.shugur.net: {data.get('name', 'Unknown')} - {data.get('description', 'No description')}")
        else:
            print(f"❌ shu01.shugur.net: HTTP {response.status_code}")
    except Exception as e:
        print(f"❌ shu01.shugur.net: {str(e)}")
    
    # Test 2: Batch proxy
    print("\n2️⃣ Testing batch proxy...")
    try:
        response = requests.get(f"{base_url}/batch-proxy", timeout=15)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Batch request successful - {len(data)} relays processed")
            for relay, result in data.items():
                status = result.get('status', 'unknown')
                print(f"   📡 {relay}: {status}")
        else:
            print(f"❌ Batch proxy: HTTP {response.status_code}")
    except Exception as e:
        print(f"❌ Batch proxy: {str(e)}")
    
    # Test 3: Network stats
    print("\n3️⃣ Testing network stats...")
    try:
        response = requests.get(f"{base_url}/api/network-stats", timeout=15)
        if response.status_code == 200:
            data = response.json()
            network = data.get('network', {})
            nodes = data.get('nodes', [])
            
            print(f"✅ Network stats successful")
            print(f"   🌐 Total Connections: {network.get('total_connections', 0)}")
            print(f"   📊 Total Messages: {network.get('total_messages', 0)}")
            print(f"   📂 Total Events: {network.get('total_events', 0)}")
            print(f"   ❤️ Health: {network.get('health_percentage', 0)}%")
            print(f"   🖥️ Online Nodes: {network.get('online_nodes', 0)}/{network.get('total_nodes', 0)}")
            
            print(f"\n   Node Details:")
            for node in nodes:
                print(f"   📡 {node.get('node', 'unknown')}: {node.get('status', 'unknown')}")
        else:
            print(f"❌ Network stats: HTTP {response.status_code}")
    except Exception as e:
        print(f"❌ Network stats: {str(e)}")
    
    print(f"\n🏁 Test completed at {time.strftime('%H:%M:%S')}")

if __name__ == "__main__":
    test_endpoints()
