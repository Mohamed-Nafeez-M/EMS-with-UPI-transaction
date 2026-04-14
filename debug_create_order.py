import urllib.request
import urllib.error
import json

url = 'http://127.0.0.1:5000/api/registrations/create-order'
body = json.dumps({ 'eventId': 1 }).encode('utf-8')
req = urllib.request.Request(url, data=body, headers={'Content-Type': 'application/json'}, method='POST')
try:
    resp = urllib.request.urlopen(req, timeout=5)
    print('status', resp.status)
    print(resp.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print('status', e.code)
    print(e.read().decode('utf-8'))
except Exception as e:
    print('error', e)
