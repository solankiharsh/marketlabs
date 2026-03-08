"""
Flow Workflow Executor

Traverses workflow DAG from start nodes, executing each node in order.
Stores execution logs and handles errors per-node.
"""

import json
import threading
from datetime import datetime

from app.utils.db import get_db_connection
from app.utils.logger import get_logger

logger = get_logger(__name__)


class WorkflowContext:
    """Holds execution state: variables, logs, results."""

    def __init__(self, workflow_id: int, execution_id: int, trigger_payload: dict = None):
        self.workflow_id = workflow_id
        self.execution_id = execution_id
        self.variables: dict = {}
        self.logs: list = []
        self.trigger_payload = trigger_payload or {}
        self.error: str = None

    def log(self, message: str, level: str = 'info'):
        entry = {
            'time': datetime.utcnow().isoformat(),
            'message': message,
            'level': level,
        }
        self.logs.append(entry)
        if level == 'error':
            logger.error(f"[Flow {self.workflow_id}] {message}")
        else:
            logger.info(f"[Flow {self.workflow_id}] {message}")

    def set_var(self, name: str, value):
        self.variables[name] = value

    def get_var(self, name: str, default=None):
        return self.variables.get(name, default)


def execute_workflow_async(workflow_id: int, execution_id: int, trigger_payload: dict = None):
    """Start workflow execution in a background thread."""
    t = threading.Thread(
        target=_run_workflow,
        args=(workflow_id, execution_id, trigger_payload),
        daemon=True,
    )
    t.start()


def _run_workflow(workflow_id: int, execution_id: int, trigger_payload: dict = None):
    """Main execution loop."""
    ctx = WorkflowContext(workflow_id, execution_id, trigger_payload)
    ctx.log("Starting workflow execution")

    try:
        # Load workflow
        with get_db_connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT nodes, edges FROM ml_flow_workflows WHERE id = %s", (workflow_id,))
            row = cur.fetchone()

        if not row:
            ctx.log("Workflow not found", 'error')
            _finish_execution(execution_id, 'failed', ctx.logs, "Workflow not found")
            return

        nodes_raw, edges_raw = row
        nodes = _parse_json(nodes_raw, [])
        edges = _parse_json(edges_raw, [])

        if not nodes:
            ctx.log("No nodes in workflow", 'error')
            _finish_execution(execution_id, 'failed', ctx.logs, "No nodes")
            return

        # Build adjacency map: source_id -> [(target_id, source_handle)]
        adjacency = {}
        for edge in edges:
            src = edge.get('source')
            tgt = edge.get('target')
            handle = edge.get('sourceHandle')
            if src and tgt:
                adjacency.setdefault(src, []).append((tgt, handle))

        # Build node map
        node_map = {n['id']: n for n in nodes}

        # Find start nodes (nodes without incoming edges)
        targets = {e.get('target') for e in edges if e.get('target')}
        start_nodes = [n['id'] for n in nodes if n['id'] not in targets]

        if not start_nodes:
            # Fallback: look for 'start' type nodes
            start_nodes = [n['id'] for n in nodes if n.get('type') == 'start']

        if not start_nodes:
            ctx.log("No start nodes found", 'error')
            _finish_execution(execution_id, 'failed', ctx.logs, "No start nodes")
            return

        # Store trigger payload as variable
        if trigger_payload:
            ctx.set_var('trigger_payload', trigger_payload)

        # BFS execution from start nodes
        visited = set()
        queue = list(start_nodes)

        while queue:
            node_id = queue.pop(0)
            if node_id in visited:
                continue
            visited.add(node_id)

            node = node_map.get(node_id)
            if not node:
                continue

            node_type = node.get('type', 'unknown')
            node_data = node.get('data', {})
            ctx.log(f"Executing node: {node_type} ({node_id})")

            try:
                result = _execute_node(node_type, node_data, ctx)

                # For condition nodes, follow true/false branches
                if result is not None and isinstance(result, bool):
                    handle = 'true' if result else 'false'
                    next_nodes = [
                        tgt for tgt, h in adjacency.get(node_id, [])
                        if h == handle or h is None
                    ]
                else:
                    next_nodes = [tgt for tgt, _ in adjacency.get(node_id, [])]

                queue.extend(next_nodes)

            except Exception as e:
                ctx.log(f"Node {node_type} failed: {e}", 'error')
                # Continue to next nodes if possible
                next_nodes = [tgt for tgt, _ in adjacency.get(node_id, [])]
                queue.extend(next_nodes)

        ctx.log("Workflow execution completed")
        _finish_execution(execution_id, 'completed', ctx.logs)

    except Exception as e:
        ctx.log(f"Workflow execution error: {e}", 'error')
        _finish_execution(execution_id, 'failed', ctx.logs, str(e))


def _execute_node(node_type: str, data: dict, ctx: WorkflowContext):
    """Execute a single node. Returns bool for condition nodes, else None."""

    # ── Trigger nodes (just pass through) ──
    if node_type in ('start', 'webhook'):
        return None

    # ── Log node ──
    if node_type == 'log':
        message = _interpolate(data.get('message', ''), ctx)
        level = data.get('level', 'info')
        ctx.log(f"[LOG] {message}", level)
        return None

    # ── Variable node ──
    if node_type == 'variable':
        name = data.get('variableName', '')
        op = data.get('operation', 'set')
        value = data.get('value', '')
        if op == 'set':
            ctx.set_var(name, value)
        elif op == 'get':
            pass  # just makes the variable accessible
        elif op == 'add':
            current = float(ctx.get_var(name, 0))
            ctx.set_var(name, current + float(value))
        elif op == 'subtract':
            current = float(ctx.get_var(name, 0))
            ctx.set_var(name, current - float(value))
        ctx.log(f"Variable '{name}' = {ctx.get_var(name)}")
        return None

    # ── Delay node ──
    if node_type == 'delay':
        import time
        val = float(data.get('delayValue', 5))
        unit = data.get('delayUnit', 'seconds')
        if unit == 'minutes':
            val *= 60
        elif unit == 'hours':
            val *= 3600
        ctx.log(f"Delaying {val}s")
        time.sleep(min(val, 300))  # Cap at 5 min
        return None

    # ── Condition nodes ──
    if node_type == 'timeWindow':
        from datetime import datetime
        now = datetime.now()
        start = data.get('startTime', '00:00')
        end = data.get('endTime', '23:59')
        current_time = now.strftime('%H:%M')
        result = start <= current_time <= end
        ctx.log(f"Time window check: {start}-{end}, now={current_time}, result={result}")
        return result

    if node_type == 'fundCheck':
        min_avail = float(data.get('minAvailable', 0))
        # For now, always pass (would check actual funds via API)
        ctx.log(f"Fund check: min={min_avail} (simulated pass)")
        return True

    if node_type in ('positionCheck', 'priceCondition', 'timeCondition'):
        ctx.log(f"Condition node {node_type} (simulated pass)")
        return True

    if node_type in ('andGate', 'orGate', 'notGate'):
        ctx.log(f"Logic gate {node_type} (pass-through)")
        return True

    # ── Data nodes ──
    if node_type in ('getQuote', 'getDepth', 'history', 'openPosition', 'expiry',
                      'intervals', 'multiQuotes', 'symbol', 'optionSymbol',
                      'orderBook', 'tradeBook', 'positionBook', 'syntheticFuture',
                      'optionChain', 'holidays', 'timings', 'getOrderStatus'):
        out_var = data.get('outputVariable', '')
        ctx.log(f"Data node {node_type}: would fetch data (simulated)")
        if out_var:
            ctx.set_var(out_var, {'simulated': True, 'node_type': node_type})
        return None

    # ── Streaming nodes ──
    if node_type in ('subscribeLtp', 'subscribeQuote', 'subscribeDepth', 'unsubscribe'):
        ctx.log(f"Streaming node {node_type} (simulated)")
        return None

    # ── Risk nodes ──
    if node_type in ('holdings', 'funds', 'margin'):
        out_var = data.get('outputVariable', '')
        ctx.log(f"Risk node {node_type} (simulated)")
        if out_var:
            ctx.set_var(out_var, {'simulated': True})
        return None

    # ── Action nodes ──
    if node_type in ('placeOrder', 'smartOrder', 'optionsOrder', 'optionsMultiOrder',
                      'basketOrder', 'splitOrder'):
        symbol = _interpolate(data.get('symbol', ''), ctx)
        action = data.get('action', 'BUY')
        quantity = data.get('quantity', 0)
        ctx.log(f"Order: {action} {quantity} {symbol} (simulated — would queue to pending_orders)")
        return None

    if node_type in ('modifyOrder', 'cancelOrder', 'cancelAllOrders', 'closePositions'):
        ctx.log(f"Action {node_type} (simulated)")
        return None

    # ── Utility nodes ──
    if node_type == 'telegramAlert':
        message = _interpolate(data.get('message', ''), ctx)
        ctx.log(f"Telegram alert: {message} (simulated)")
        return None

    if node_type == 'waitUntil':
        target = data.get('targetTime', '')
        ctx.log(f"Wait until {target} (simulated)")
        return None

    if node_type == 'mathExpression':
        expr = data.get('expression', '')
        out_var = data.get('outputVariable', '')
        ctx.log(f"Math: {expr} -> {out_var} (simulated)")
        return None

    if node_type == 'httpRequest':
        url = _interpolate(data.get('url', ''), ctx)
        method = data.get('method', 'GET')
        ctx.log(f"HTTP {method} {url} (simulated)")
        return None

    if node_type == 'priceAlert':
        ctx.log("Price alert trigger (simulated)")
        return None

    ctx.log(f"Unknown node type: {node_type}", 'warn')
    return None


def _interpolate(template: str, ctx: WorkflowContext) -> str:
    """Replace {{variable}} placeholders with context values."""
    if not template or '{{' not in template:
        return template
    import re
    def replacer(match):
        var_name = match.group(1).strip()
        val = ctx.get_var(var_name, match.group(0))
        return str(val)
    return re.sub(r'\{\{(.+?)\}\}', replacer, template)


def _parse_json(val, default):
    if val is None:
        return default
    if isinstance(val, (dict, list)):
        return val
    if isinstance(val, str):
        try:
            return json.loads(val)
        except Exception:
            return default
    return default


def _finish_execution(execution_id: int, status: str, logs: list, error: str = None):
    """Update execution record with final status."""
    try:
        with get_db_connection() as conn:
            cur = conn.cursor()
            cur.execute(
                "UPDATE ml_flow_executions SET status = %s, logs = %s::jsonb, error = %s, completed_at = NOW() WHERE id = %s",
                (status, json.dumps(logs), error, execution_id)
            )
            conn.commit()
    except Exception as e:
        logger.error(f"Failed to update execution {execution_id}: {e}")
