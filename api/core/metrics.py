from prometheus_client import Gauge

active_websockets = Gauge('active_websockets', 'Active websockets connections')