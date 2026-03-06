"""
Billing APIs - Membership Purchase / Plan Configuration (Mock Payment)

Current version implements the minimum viable "quick business loop":
- Reads 3 membership tiers (monthly/yearly/lifetime) amounts and bonus credits config from system settings (.env)
- User purchases on the frontend and membership is activated / credits are issued immediately (can be replaced with a real payment gateway later)
"""

from flask import Blueprint, jsonify, request, g

from app.utils.auth import login_required
from app.utils.logger import get_logger
from app.services.billing_service import get_billing_service
from app.services.usdt_payment_service import get_usdt_payment_service

logger = get_logger(__name__)

billing_bp = Blueprint("billing", __name__)


@billing_bp.route("/plans", methods=["GET"])
@login_required
def get_membership_plans():
    """Get membership plan configuration + current user's billing snapshot."""
    try:
        user_id = getattr(g, "user_id", None)
        svc = get_billing_service()
        plans = svc.get_membership_plans()
        billing_info = svc.get_user_billing_info(user_id) if user_id else {}
        return jsonify({"code": 1, "msg": "success", "data": {"plans": plans, "billing": billing_info}})
    except Exception as e:
        logger.error(f"get_membership_plans failed: {e}", exc_info=True)
        return jsonify({"code": 0, "msg": str(e), "data": None}), 500


@billing_bp.route("/purchase", methods=["POST"])
@login_required
def purchase_membership():
    """
    Purchase membership (mock: immediate activation).

    Body:
      { plan: "monthly" | "yearly" | "lifetime" }
    """
    try:
        user_id = getattr(g, "user_id", None)
        data = request.get_json() or {}
        plan = (data.get("plan") or "").strip().lower()
        if not plan:
            return jsonify({"code": 0, "msg": "missing_plan", "data": None}), 400

        success, msg, out = get_billing_service().purchase_membership(user_id, plan)
        if success:
            return jsonify({"code": 1, "msg": msg, "data": out})
        return jsonify({"code": 0, "msg": msg, "data": out}), 400
    except Exception as e:
        logger.error(f"purchase_membership failed: {e}", exc_info=True)
        return jsonify({"code": 0, "msg": str(e), "data": None}), 500


# =========================
# USDT Pay (Plan B)
# =========================


@billing_bp.route("/usdt/create", methods=["POST"])
@login_required
def usdt_create_order():
    """
    Create USDT order for membership plan (per-order address).

    Body:
      { plan: "monthly"|"yearly"|"lifetime" }
    """
    try:
        user_id = getattr(g, "user_id", None)
        data = request.get_json() or {}
        plan = (data.get("plan") or "").strip().lower()
        if not plan:
            return jsonify({"code": 0, "msg": "missing_plan", "data": None}), 400

        ok, msg, out = get_usdt_payment_service().create_order(user_id, plan)
        if ok:
            return jsonify({"code": 1, "msg": "success", "data": out})
        return jsonify({"code": 0, "msg": msg, "data": out}), 400
    except Exception as e:
        logger.error(f"usdt_create_order failed: {e}", exc_info=True)
        return jsonify({"code": 0, "msg": str(e), "data": None}), 500


@billing_bp.route("/usdt/order/<int:order_id>", methods=["GET"])
@login_required
def usdt_get_order(order_id: int):
    """Get my USDT order; refresh chain status by default."""
    try:
        user_id = getattr(g, "user_id", None)
        refresh = str(request.args.get("refresh", "1")).lower() in ("1", "true", "yes")
        ok, msg, out = get_usdt_payment_service().get_order(user_id, order_id, refresh=refresh)
        if ok:
            return jsonify({"code": 1, "msg": "success", "data": out})
        return jsonify({"code": 0, "msg": msg, "data": out}), 404
    except Exception as e:
        logger.error(f"usdt_get_order failed: {e}", exc_info=True)
        return jsonify({"code": 0, "msg": str(e), "data": None}), 500

