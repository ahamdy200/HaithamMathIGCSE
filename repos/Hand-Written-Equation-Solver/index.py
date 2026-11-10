import json

def app(environ, start_response):
    status = '200 OK'
    headers = [('Content-type', 'application/json')]
    start_response(status, headers)
    body = json.dumps({"status": "online", "service": "Hand-Written Equation Solver Engine"}).encode('utf-8')
    return [body]

handler = app
