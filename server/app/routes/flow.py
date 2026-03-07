"""
Flow Workflow API Routes

Visual Strategy Builder — CRUD + webhook + execution endpoints.
"""

import json
import secrets
from datetime import datetime

from flask import Blueprint, jsonify, request, g

from app.utils.db import get_db_connection
from app.utils.logger import get_logger
from app.utils.auth import login_required

logger = get_logger(__name__)

flow_bp = Blueprint("flow", __name__)


def _format_dt(dt):
    if dt and hasattr(dt, 'isoformat'):
        return dt.isoformat()
    return dt


def _row_to_workflow(row, columns):
    wf = dict(zip(columns, row))
    for k in ('nodes', 'edges'):
        v = wf.get(k)
        if isinstance(v, str):
            wf[k] = json.loads(v) if v else []
        elif v is None:
            wf[k] = []
    for k in ('created_at', 'updated_at'):
        wf[k] = _format_dt(wf.get(k))
    return wf


def _row_to_execution(row, columns):
    ex = dict(zip(columns, row))
    v = ex.get('logs')
    if isinstance(v, str):
        ex['logs'] = json.loads(v) if v else []
    elif v is None:
        ex['logs'] = []
    for k in ('created_at', 'started_at', 'completed_at'):
        ex[k] = _format_dt(ex.get(k))
    return ex


# ── Workflow CRUD ───────────────────────────────────────────────────────────

@flow_bp.route('/workflows', methods=['GET'])
@login_required
def list_workflows():
    user_id = g.user_id
    with get_db_connection() as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT id, user_id, name, description, is_active, webhook_token, webhook_enabled, webhook_auth_type, created_at, updated_at "
            "FROM ml_flow_workflows WHERE user_id = %s ORDER BY updated_at DESC",
            (user_id,)
        )
        cols = [d[0] for d in cur.description]
        rows = cur.fetchall()
    workflows = []
    for r in rows:
        wf = dict(zip(cols, r))
        for k in ('created_at', 'updated_at'):
            wf[k] = _format_dt(wf.get(k))
        workflows.append(wf)
    return jsonify({'code': 1, 'msg': 'success', 'data': workflows})


@flow_bp.route('/workflows', methods=['POST'])
@login_required
def create_workflow():
    user_id = g.user_id
    data = request.get_json(force=True, silent=True) or {}
    name = data.get('name', 'Untitled Workflow')
    description = data.get('description', '')
    with get_db_connection() as conn:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO ml_flow_workflows (user_id, name, description) VALUES (%s, %s, %s) RETURNING id",
            (user_id, name, description)
        )
        wf_id = cur.fetchone()[0]
        conn.commit()
        cur.execute(
            "SELECT * FROM ml_flow_workflows WHERE id = %s", (wf_id,)
        )
        cols = [d[0] for d in cur.description]
        row = cur.fetchone()
    return jsonify({'code': 1, 'msg': 'created', 'data': _row_to_workflow(row, cols)})


@flow_bp.route('/workflows/<int:wf_id>', methods=['GET'])
@login_required
def get_workflow(wf_id):
    user_id = g.user_id
    with get_db_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM ml_flow_workflows WHERE id = %s AND user_id = %s", (wf_id, user_id))
        cols = [d[0] for d in cur.description]
        row = cur.fetchone()
    if not row:
        return jsonify({'code': 0, 'msg': 'Not found', 'data': None}), 404
    return jsonify({'code': 1, 'msg': 'success', 'data': _row_to_workflow(row, cols)})


@flow_bp.route('/workflows/<int:wf_id>', methods=['PUT'])
@login_required
def update_workflow(wf_id):
    user_id = g.user_id
    data = request.get_json(force=True, silent=True) or {}
    sets = []
    params = []
    for field in ('name', 'description'):
        if field in data:
            sets.append(f"{field} = %s")
            params.append(data[field])
    for field in ('nodes', 'edges'):
        if field in data:
            sets.append(f"{field} = %s::jsonb")
            params.append(json.dumps(data[field]))
    if not sets:
        return jsonify({'code': 0, 'msg': 'No fields to update', 'data': None}), 400
    sets.append("updated_at = NOW()")
    params.extend([wf_id, user_id])
    with get_db_connection() as conn:
        cur = conn.cursor()
        cur.execute(
            f"UPDATE ml_flow_workflows SET {', '.join(sets)} WHERE id = %s AND user_id = %s",
            params
        )
        conn.commit()
        cur.execute("SELECT * FROM ml_flow_workflows WHERE id = %s", (wf_id,))
        cols = [d[0] for d in cur.description]
        row = cur.fetchone()
    if not row:
        return jsonify({'code': 0, 'msg': 'Not found', 'data': None}), 404
    return jsonify({'code': 1, 'msg': 'updated', 'data': _row_to_workflow(row, cols)})


@flow_bp.route('/workflows/<int:wf_id>', methods=['DELETE'])
@login_required
def delete_workflow(wf_id):
    user_id = g.user_id
    with get_db_connection() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM ml_flow_workflows WHERE id = %s AND user_id = %s", (wf_id, user_id))
        conn.commit()
    return jsonify({'code': 1, 'msg': 'deleted', 'data': None})


# ── Activate / Deactivate ──────────────────────────────────────────────────

@flow_bp.route('/workflows/<int:wf_id>/activate', methods=['POST'])
@login_required
def activate_workflow(wf_id):
    user_id = g.user_id
    with get_db_connection() as conn:
        cur = conn.cursor()
        cur.execute(
            "UPDATE ml_flow_workflows SET is_active = TRUE, updated_at = NOW() WHERE id = %s AND user_id = %s",
            (wf_id, user_id)
        )
        conn.commit()
    return jsonify({'code': 1, 'msg': 'activated', 'data': None})


@flow_bp.route('/workflows/<int:wf_id>/deactivate', methods=['POST'])
@login_required
def deactivate_workflow(wf_id):
    user_id = g.user_id
    with get_db_connection() as conn:
        cur = conn.cursor()
        cur.execute(
            "UPDATE ml_flow_workflows SET is_active = FALSE, updated_at = NOW() WHERE id = %s AND user_id = %s",
            (wf_id, user_id)
        )
        conn.commit()
    return jsonify({'code': 1, 'msg': 'deactivated', 'data': None})


# ── Execution ──────────────────────────────────────────────────────────────

@flow_bp.route('/workflows/<int:wf_id>/execute', methods=['POST'])
@login_required
def execute_workflow(wf_id):
    user_id = g.user_id
    with get_db_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM ml_flow_workflows WHERE id = %s AND user_id = %s", (wf_id, user_id))
        if not cur.fetchone():
            return jsonify({'code': 0, 'msg': 'Not found', 'data': None}), 404
        cur.execute(
            "INSERT INTO ml_flow_executions (workflow_id, status, started_at) VALUES (%s, 'running', NOW()) RETURNING id",
            (wf_id,)
        )
        exec_id = cur.fetchone()[0]
        conn.commit()

    # Execute workflow asynchronously (import here to avoid circular)
    try:
        from app.services.flow_executor import execute_workflow_async
        execute_workflow_async(wf_id, exec_id)
    except Exception as e:
        logger.error(f"Failed to start workflow execution: {e}")
        with get_db_connection() as conn:
            cur = conn.cursor()
            cur.execute(
                "UPDATE ml_flow_executions SET status = 'failed', error = %s, completed_at = NOW() WHERE id = %s",
                (str(e), exec_id)
            )
            conn.commit()

    return jsonify({'code': 1, 'msg': 'execution started', 'data': {'id': exec_id, 'status': 'running'}})


@flow_bp.route('/workflows/<int:wf_id>/executions', methods=['GET'])
@login_required
def list_executions(wf_id):
    user_id = g.user_id
    with get_db_connection() as conn:
        cur = conn.cursor()
        # Verify ownership
        cur.execute("SELECT id FROM ml_flow_workflows WHERE id = %s AND user_id = %s", (wf_id, user_id))
        if not cur.fetchone():
            return jsonify({'code': 0, 'msg': 'Not found', 'data': None}), 404
        cur.execute(
            "SELECT * FROM ml_flow_executions WHERE workflow_id = %s ORDER BY created_at DESC LIMIT 50",
            (wf_id,)
        )
        cols = [d[0] for d in cur.description]
        rows = cur.fetchall()
    executions = [_row_to_execution(r, cols) for r in rows]
    return jsonify({'code': 1, 'msg': 'success', 'data': executions})


# ── Webhook Config ─────────────────────────────────────────────────────────

@flow_bp.route('/workflows/<int:wf_id>/webhook', methods=['GET'])
@login_required
def get_webhook_config(wf_id):
    user_id = g.user_id
    with get_db_connection() as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT webhook_token, webhook_enabled, webhook_auth_type FROM ml_flow_workflows WHERE id = %s AND user_id = %s",
            (wf_id, user_id)
        )
        row = cur.fetchone()
    if not row:
        return jsonify({'code': 0, 'msg': 'Not found', 'data': None}), 404
    return jsonify({'code': 1, 'msg': 'success', 'data': {
        'webhook_token': row[0],
        'webhook_enabled': row[1],
        'webhook_auth_type': row[2],
    }})


@flow_bp.route('/workflows/<int:wf_id>/webhook/enable', methods=['POST'])
@login_required
def enable_webhook(wf_id):
    user_id = g.user_id
    token = secrets.token_urlsafe(32)
    secret = secrets.token_urlsafe(32)
    with get_db_connection() as conn:
        cur = conn.cursor()
        cur.execute(
            "UPDATE ml_flow_workflows SET webhook_enabled = TRUE, webhook_token = %s, webhook_secret = %s, updated_at = NOW() "
            "WHERE id = %s AND user_id = %s AND (webhook_token IS NULL OR webhook_token = '')",
            (token, secret, wf_id, user_id)
        )
        # If token already exists, just enable
        cur.execute(
            "UPDATE ml_flow_workflows SET webhook_enabled = TRUE, updated_at = NOW() WHERE id = %s AND user_id = %s",
            (wf_id, user_id)
        )
        conn.commit()
    return jsonify({'code': 1, 'msg': 'enabled', 'data': None})


@flow_bp.route('/workflows/<int:wf_id>/webhook/disable', methods=['POST'])
@login_required
def disable_webhook(wf_id):
    user_id = g.user_id
    with get_db_connection() as conn:
        cur = conn.cursor()
        cur.execute(
            "UPDATE ml_flow_workflows SET webhook_enabled = FALSE, updated_at = NOW() WHERE id = %s AND user_id = %s",
            (wf_id, user_id)
        )
        conn.commit()
    return jsonify({'code': 1, 'msg': 'disabled', 'data': None})


@flow_bp.route('/workflows/<int:wf_id>/webhook/regenerate', methods=['POST'])
@login_required
def regenerate_webhook(wf_id):
    user_id = g.user_id
    token = secrets.token_urlsafe(32)
    secret = secrets.token_urlsafe(32)
    with get_db_connection() as conn:
        cur = conn.cursor()
        cur.execute(
            "UPDATE ml_flow_workflows SET webhook_token = %s, webhook_secret = %s, updated_at = NOW() WHERE id = %s AND user_id = %s",
            (token, secret, wf_id, user_id)
        )
        conn.commit()
    return jsonify({'code': 1, 'msg': 'regenerated', 'data': {'webhook_token': token}})


@flow_bp.route('/workflows/<int:wf_id>/webhook/auth-type', methods=['POST'])
@login_required
def set_webhook_auth_type(wf_id):
    user_id = g.user_id
    data = request.get_json(force=True, silent=True) or {}
    auth_type = data.get('auth_type', 'payload')
    if auth_type not in ('payload', 'header', 'none'):
        return jsonify({'code': 0, 'msg': 'Invalid auth type', 'data': None}), 400
    with get_db_connection() as conn:
        cur = conn.cursor()
        cur.execute(
            "UPDATE ml_flow_workflows SET webhook_auth_type = %s, updated_at = NOW() WHERE id = %s AND user_id = %s",
            (auth_type, wf_id, user_id)
        )
        conn.commit()
    return jsonify({'code': 1, 'msg': 'updated', 'data': None})


# ── Export / Import ────────────────────────────────────────────────────────

@flow_bp.route('/workflows/<int:wf_id>/export', methods=['GET'])
@login_required
def export_workflow(wf_id):
    user_id = g.user_id
    with get_db_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM ml_flow_workflows WHERE id = %s AND user_id = %s", (wf_id, user_id))
        cols = [d[0] for d in cur.description]
        row = cur.fetchone()
    if not row:
        return jsonify({'code': 0, 'msg': 'Not found', 'data': None}), 404
    wf = _row_to_workflow(row, cols)
    # Strip sensitive fields
    export_data = {
        'name': wf['name'],
        'description': wf.get('description', ''),
        'nodes': wf['nodes'],
        'edges': wf['edges'],
        'version': '1.0',
    }
    return jsonify({'code': 1, 'msg': 'success', 'data': export_data})


@flow_bp.route('/workflows/import', methods=['POST'])
@login_required
def import_workflow():
    user_id = g.user_id
    data = request.get_json(force=True, silent=True) or {}
    name = data.get('name', 'Imported Workflow')
    description = data.get('description', '')
    nodes = json.dumps(data.get('nodes', []))
    edges = json.dumps(data.get('edges', []))
    with get_db_connection() as conn:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO ml_flow_workflows (user_id, name, description, nodes, edges) "
            "VALUES (%s, %s, %s, %s::jsonb, %s::jsonb) RETURNING id",
            (user_id, name, description, nodes, edges)
        )
        wf_id = cur.fetchone()[0]
        conn.commit()
        cur.execute("SELECT * FROM ml_flow_workflows WHERE id = %s", (wf_id,))
        cols = [d[0] for d in cur.description]
        row = cur.fetchone()
    return jsonify({'code': 1, 'msg': 'imported', 'data': _row_to_workflow(row, cols)})


# ── External Webhook Trigger (no auth) ─────────────────────────────────────

@flow_bp.route('/webhook/<token>', methods=['POST'])
def webhook_trigger(token):
    """External webhook trigger — no auth required. Token-based."""
    with get_db_connection() as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT id, user_id, is_active, webhook_enabled FROM ml_flow_workflows WHERE webhook_token = %s",
            (token,)
        )
        row = cur.fetchone()
    if not row:
        return jsonify({'status': 'error', 'message': 'Invalid webhook token'}), 404
    wf_id, user_id, is_active, webhook_enabled = row
    if not is_active or not webhook_enabled:
        return jsonify({'status': 'error', 'message': 'Workflow inactive or webhook disabled'}), 403

    # Create execution
    with get_db_connection() as conn:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO ml_flow_executions (workflow_id, status, started_at) VALUES (%s, 'running', NOW()) RETURNING id",
            (wf_id,)
        )
        exec_id = cur.fetchone()[0]
        conn.commit()

    try:
        from app.services.flow_executor import execute_workflow_async
        payload = request.get_json(force=True, silent=True) or {}
        execute_workflow_async(wf_id, exec_id, trigger_payload=payload)
    except Exception as e:
        logger.error(f"Webhook trigger failed: {e}")
        with get_db_connection() as conn:
            cur = conn.cursor()
            cur.execute(
                "UPDATE ml_flow_executions SET status = 'failed', error = %s, completed_at = NOW() WHERE id = %s",
                (str(e), exec_id)
            )
            conn.commit()

    return jsonify({'status': 'ok', 'execution_id': exec_id})
