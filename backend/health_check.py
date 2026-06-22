#!/usr/bin/env python
"""
Health Check Utility for Commerce Dashboard Backend
Usage: python health_check.py
"""

import requests
import sys
import time
from urllib.parse import urljoin

def check_health(host="127.0.0.1", port=5000, timeout=5, retries=3):
    """Check backend health with retry logic."""
    base_url = f"http://{host}:{port}"
    health_url = urljoin(base_url, "/api/health")
    
    print(f"Checking backend health at {health_url}...")
    
    for attempt in range(1, retries + 1):
        try:
            response = requests.get(health_url, timeout=timeout)
            
            if response.status_code == 200:
                data = response.json()
                print(f"✓ Status: {data.get('status')}")
                print(f"✓ Service: {data.get('service')}")
                print(f"✓ Database: {data.get('database', 'N/A')}")
                print("\n✓ Backend is healthy!")
                return True
            else:
                print(f"✗ Unexpected status code: {response.status_code}")
                print(f"  Response: {response.text}")
        except requests.exceptions.ConnectionError:
            print(f"✗ Connection failed (attempt {attempt}/{retries})")
            if attempt < retries:
                wait_sec = 2 ** attempt
                print(f"  Retrying in {wait_sec}s...")
                time.sleep(wait_sec)
        except requests.exceptions.Timeout:
            print(f"✗ Request timeout (attempt {attempt}/{retries})")
        except Exception as e:
            print(f"✗ Error: {e}")
    
    print("\n✗ Backend is not responding. Please start it using:")
    print("  - Windows CMD: start_backend.cmd")
    print("  - PowerShell: .\\start_backend.ps1")
    print("  - Manual: python run.py")
    return False

def check_login(host="127.0.0.1", port=5000, email="admin@dashboard.com", password="Admin@123"):
    """Test login endpoint."""
    base_url = f"http://{host}:{port}"
    login_url = urljoin(base_url, "/api/auth/login")
    
    print(f"\nTesting login at {login_url}...")
    
    try:
        response = requests.post(
            login_url,
            json={"email": email, "password": password},
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Login successful")
            print(f"✓ User: {data['data']['user']['full_name']} ({data['data']['user']['role']})")
            print(f"✓ Access token received")
            return True
        else:
            print(f"✗ Login failed: {response.status_code}")
            print(f"  {response.json().get('message', 'Unknown error')}")
            return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

if __name__ == "__main__":
    print("=" * 50)
    print("  Commerce Dashboard - Backend Health Check")
    print("=" * 50)
    print()
    
    host = "127.0.0.1"
    port = 5000
    
    # Check health
    if check_health(host, port):
        # Try login
        check_login(host, port)
        sys.exit(0)
    else:
        sys.exit(1)
