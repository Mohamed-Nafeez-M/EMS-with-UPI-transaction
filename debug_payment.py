import urllib.request
import urllib.error
import json

base = 'http://127.0.0.1:5000'

# Login as seeded admin user to get token
login_data = json.dumps({'email': 'admin@ptu.edu.in', 'password': 'admin123'}).encode('utf-8')
req = urllib.request.Request(base + '/api/auth/login', data=login_data, headers={'Content-Type': 'application/json'}, method='POST')
try:
    resp = urllib.request.urlopen(req, timeout=5)
    auth = json.loads(resp.read().decode('utf-8'))
    token = auth['token']
    print('token', token[:20] + '...')
except urllib.error.HTTPError as e:
    print('login failed', e.code, e.read().decode('utf-8'))
    raise SystemExit(1)

# Create order with token
body = json.dumps({'eventId': 1}).encode('utf-8')
req = urllib.request.Request(base + '/api/registrations/create-order', data=body, headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token}, method='POST')
try:
    resp = urllib.request.urlopen(req, timeout=5)
    print('create-order status', resp.status)
    print(resp.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print('create-order failed', e.code, e.read().decode('utf-8'))
