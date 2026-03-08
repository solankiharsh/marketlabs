"""
K-line (Candlestick) Data API Routes
"""
from flask import Blueprint, request, jsonify
from datetime import datetime
import time
import traceback

from app.services.kline import KlineService
from app.utils.logger import get_logger
from app.utils.market_hours import get_market_status

logger = get_logger(__name__)

kline_bp = Blueprint('kline', __name__)
kline_service = KlineService()


@kline_bp.route('/kline', methods=['GET'])
def get_kline():
    """
    Get K-line (candlestick) data.

    Parameters:
        market: Market type (Crypto, USStock, Forex, Futures)
        symbol: Trading pair / stock ticker
        timeframe: Time period (1m, 5m, 15m, 30m, 1H, 4H, 1D, 1W)
        limit: Number of data points (default 300)
        before_time: Get data before this time (optional, Unix timestamp)
    """
    try:
        # Force GET, use request.args
        market = request.args.get('market', 'USStock')
        symbol = request.args.get('symbol', '')
        timeframe = request.args.get('timeframe', '1D')
        limit = int(request.args.get('limit', 300))
        before_time = request.args.get('before_time') or request.args.get('beforeTime')
        
        if before_time:
            before_time = int(before_time)
        
        if not symbol:
            return jsonify({
                'code': 0,
                'msg': 'Missing symbol parameter',
                'data': None
            }), 400
        
        logger.info(f"Requesting K-lines: {market}:{symbol}, timeframe={timeframe}, limit={limit}")
        
        klines = kline_service.get_kline(
            market=market,
            symbol=symbol,
            timeframe=timeframe,
            limit=limit,
            before_time=before_time
        )
        
        if not klines:
            # Provide more detailed hints for specific cases
            msg = 'No data found'
            if market == 'Forex' and timeframe == '1m':
                msg = 'Forex 1-minute data requires Tiingo paid subscription'
            elif market == 'Forex' and timeframe in ('1W', '1M'):
                msg = 'No weekly/monthly data available for this period'
            return jsonify({
                'code': 0,
                'msg': msg,
                'data': [],
                'hint': 'tiingo_subscription' if (market == 'Forex' and timeframe == '1m') else None
            })
        
        market_status = get_market_status(market)
        meta = {
            'market_open': market_status['is_open'],
            'data_age_seconds': int(time.time() - klines[-1]['time']) if klines else None,
            'timeframe': timeframe,
            'count': len(klines),
        }

        return jsonify({
            'code': 1,
            'msg': 'success',
            'data': klines,
            'meta': meta,
        })
        
    except Exception as e:
        logger.error(f"Failed to fetch K-lines: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            'code': 0,
            'msg': f'Failed to fetch kline data: {str(e)}',
            'data': None
        }), 500


@kline_bp.route('/price', methods=['GET'])
def get_price():
    """Get the latest price."""
    try:
        market = request.args.get('market', 'USStock')
        symbol = request.args.get('symbol', '')
        
        if not symbol:
            return jsonify({
                'code': 0,
                'msg': 'Missing symbol parameter',
                'data': None
            }), 400
        
        price_data = kline_service.get_latest_price(market, symbol)
        
        if not price_data:
            return jsonify({
                'code': 0,
                'msg': 'No price data found',
                'data': None
            })
        
        return jsonify({
            'code': 1,
            'msg': 'success',
            'data': price_data
        })
        
    except Exception as e:
        logger.error(f"Failed to fetch price: {str(e)}")
        return jsonify({
            'code': 0,
            'msg': f'Failed to fetch price: {str(e)}',
            'data': None
        }), 500

