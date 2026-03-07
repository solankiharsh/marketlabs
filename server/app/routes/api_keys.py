"""
API Key management routes.

Users can generate API keys to authenticate external tools (TradingView webhooks,
Python scripts, Amibroker, etc.) without sharing their password.
"""
import hashlib
import secrets
from flask import Blueprint, request, jsonify, g

from app.utils.auth import login_required
from app.utils.db import get_db_connection
from app.utils.logger import get_logger

logger = get_logger(__name__)

api_keys_bp = Blueprint('api_keys', __name__)


@api_keys_bp.route('/generate', methods=['POST'])
@login_required
def generate_api_key():
    """Generate a new API key for the current user."""
    try:
        user_id = g.user_id
        data = request.get_json() or {}
        label = (data.get('label') or '').strip() or 'Default'
        permissions = (data.get('permissions') or 'read,trade').strip()

        # Generate a secure random key
        raw_key = f"ml_{secrets.token_hex(24)}"
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        key_prefix = raw_key[:10]

        with get_db_connection() as db:
            cur = db.cursor()
            cur.execute(
                "INSERT INTO ml_api_keys (user_id, key_hash, key_prefix, label, permissions) "
                "VALUES (%s, %s, %s, %s, %s)",
                (user_id, key_hash, key_prefix, label, permissions)
            )
            db.commit()
            cur.close()

        return jsonify({
            'code': 1,
            'msg': 'API key generated',
            'data': {
                'key': raw_key,  # Only shown once!
                'prefix': key_prefix,
                'label': label,
                'permissions': permissions,
            }
        })
    except Exception as e:
        logger.error(f"generate_api_key failed: {e}")
        return jsonify({'code': 0, 'msg': str(e)}), 500


@api_keys_bp.route('/list', methods=['GET'])
@login_required
def list_api_keys():
    """List all API keys for the current user (shows prefix only, not full key)."""
    try:
        user_id = g.user_id
        with get_db_connection() as db:
            cur = db.cursor()
            cur.execute(
                "SELECT id, key_prefix, label, permissions, is_active, last_used_at, created_at "
                "FROM ml_api_keys WHERE user_id = %s ORDER BY created_at DESC",
                (user_id,)
            )
            rows = cur.fetchall()
            cur.close()

        keys = []
        for row in rows:
            keys.append({
                'id': row['id'],
                'prefix': row['key_prefix'],
                'label': row['label'],
                'permissions': row['permissions'],
                'is_active': row['is_active'],
                'last_used_at': str(row['last_used_at']) if row['last_used_at'] else None,
                'created_at': str(row['created_at']),
            })

        return jsonify({'code': 1, 'msg': 'success', 'data': keys})
    except Exception as e:
        logger.error(f"list_api_keys failed: {e}")
        return jsonify({'code': 0, 'msg': str(e)}), 500


@api_keys_bp.route('/revoke/<int:key_id>', methods=['DELETE'])
@login_required
def revoke_api_key(key_id):
    """Revoke (deactivate) an API key."""
    try:
        user_id = g.user_id
        with get_db_connection() as db:
            cur = db.cursor()
            cur.execute(
                "UPDATE ml_api_keys SET is_active = FALSE WHERE id = %s AND user_id = %s",
                (key_id, user_id)
            )
            db.commit()
            cur.close()

        return jsonify({'code': 1, 'msg': 'API key revoked'})
    except Exception as e:
        logger.error(f"revoke_api_key failed: {e}")
        return jsonify({'code': 0, 'msg': str(e)}), 500
