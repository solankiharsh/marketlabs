"""
Health Check Routes
"""
from flask import Blueprint, jsonify
from datetime import datetime

health_bp = Blueprint('health', __name__)


@health_bp.route('/', methods=['GET'])
def index():
    """API home page."""
    return jsonify({
        'name': 'MarketLabs Python API',
        'version': '2.0.0',
        'status': 'running',
        'timestamp': datetime.now().isoformat()
    })


@health_bp.route('/health', methods=['GET'])
def health_check():
    """Health check."""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat()
    })


@health_bp.route('/api/health', methods=['GET'])
def api_health_check():
    """Compatibility path: used for container health checks / reverse-proxy probes."""
    return health_check()
