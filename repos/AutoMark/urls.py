from django.urls import path
from django.http import JsonResponse

def status_view(request):
    return JsonResponse({"status": "online", "service": "AutoMark CV Assessment Engine"})

urlpatterns = [
    path('', status_view),
    path('api/scan', status_view),
]
