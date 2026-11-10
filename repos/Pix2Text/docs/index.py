def app(environ, start_response):
    status = '200 OK'
    headers = [('Content-type', 'text/html')]
    start_response(status, headers)
    html = b'<!doctype html><html><head><title>Pix2Text Docs</title></head><body><h1>Pix2Text Documentation Service</h1><p>Documentation for Pix2Text LaTeX formula recognition.</p></body></html>'
    return [html]

handler = app
