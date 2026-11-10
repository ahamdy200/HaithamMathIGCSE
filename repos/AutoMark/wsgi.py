def application(environ, start_response):
    status = '200 OK'
    headers = [('Content-type', 'application/json')]
    start_response(status, headers)
    return [b'{"status": "online", "service": "AutoMark CV Assessment Engine"}']

app = application
