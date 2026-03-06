# -*- coding: utf-8 -*-
"""
===================================
Circuit Breaker module
i===================================

Reference: daily_stock_analysis project.
Manages data source circuit/cooldown state to avoid repeated requests on consecutive failures.

State machine:
CLOSED (normal) --N failures--> OPEN (tripped) --cooldown--> HALF_OPEN
HALF_OPEN --success--> CLOSED
HALF_OPEN --failure--> OPEN
"""

import time
import logging
from typing import Dict, Any, Optional
from enum import Enum

logger = logging.getLogger(__name__)


class CircuitState(Enum):
    """Circuit breaker state."""
    CLOSED = "closed"       # normal
    OPEN = "open"          # tripped (unavailable)
    HALF_OPEN = "half_open"  # probing


class CircuitBreaker:
    """
    Circuit breaker - manages data source trip/cooldown state.

    - After N consecutive failures, enter OPEN (tripped).
    - Skip the source while tripped.
    - After cooldown, enter HALF_OPEN.
    - In HALF_OPEN: one success -> CLOSED; failure -> OPEN again.
    """

    def __init__(
        self,
        failure_threshold: int = 3,       # consecutive failures to trip
        cooldown_seconds: float = 300.0,  # cooldown (seconds), default 5 min
        half_open_max_calls: int = 1      # max attempts in half-open
    ):
        self.failure_threshold = failure_threshold
        self.cooldown_seconds = cooldown_seconds
        self.half_open_max_calls = half_open_max_calls

        # per-source state: {source_name: {state, failures, last_failure_time, half_open_calls}}
        self._states: Dict[str, Dict[str, Any]] = {}

    def _get_state(self, source: str) -> Dict[str, Any]:
        """Get or init state for a source."""
        if source not in self._states:
            self._states[source] = {
                'state': CircuitState.CLOSED,
                'failures': 0,
                'last_failure_time': 0.0,
                'half_open_calls': 0,
                'last_error': None
            }
        return self._states[source]

    def is_available(self, source: str) -> bool:
        """
        Check if the data source is available.
        True = may attempt request; False = skip this source.
        """
        state = self._get_state(source)
        current_time = time.time()

        if state['state'] == CircuitState.CLOSED:
            return True

        if state['state'] == CircuitState.OPEN:
            # check cooldown
            time_since_failure = current_time - state['last_failure_time']
            if time_since_failure >= self.cooldown_seconds:
                # cooldown done, enter half-open
                state['state'] = CircuitState.HALF_OPEN
                state['half_open_calls'] = 0
                logger.info(f"[circuit] {source} cooldown done, entering half-open")
                return True
            else:
                remaining = self.cooldown_seconds - time_since_failure
                logger.debug(f"[circuit] {source} tripped, remaining cooldown: {remaining:.0f}s")
                return False

        if state['state'] == CircuitState.HALF_OPEN:
            if state['half_open_calls'] < self.half_open_max_calls:
                return True
            return False

        return True

    def record_success(self, source: str) -> None:
        """Record successful request."""
        state = self._get_state(source)

        if state['state'] == CircuitState.HALF_OPEN:
            logger.info(f"[circuit] {source} half-open success, recovered")

        state['state'] = CircuitState.CLOSED
        state['failures'] = 0
        state['half_open_calls'] = 0
        state['last_error'] = None

    def record_failure(self, source: str, error: Optional[str] = None) -> None:
        """Record failed request."""
        state = self._get_state(source)
        current_time = time.time()

        state['failures'] += 1
        state['last_failure_time'] = current_time
        state['last_error'] = error

        if state['state'] == CircuitState.HALF_OPEN:
            state['state'] = CircuitState.OPEN
            state['half_open_calls'] = 0
            logger.warning(f"[circuit] {source} half-open failed, tripped again {self.cooldown_seconds}s")
        elif state['failures'] >= self.failure_threshold:
            state['state'] = CircuitState.OPEN
            logger.warning(f"[circuit] {source} {state['failures']} failures, tripped (cooldown {self.cooldown_seconds}s)")
            if error:
                logger.warning(f"[circuit] last error: {error}")

    def get_status(self) -> Dict[str, Dict[str, Any]]:
        """Get status for all sources."""
        return {
            source: {
                'state': info['state'].value,
                'failures': info['failures'],
                'last_error': info['last_error']
            }
            for source, info in self._states.items()
        }

    def reset(self, source: Optional[str] = None) -> None:
        """Reset circuit state (one source or all)."""
        if source:
            if source in self._states:
                del self._states[source]
                logger.info(f"[circuit] reset {source}")
        else:
            self._states.clear()
            logger.info("[circuit] reset all sources")


# ============================================
# Global circuit breaker instance
# ============================================

_realtime_circuit_breaker = CircuitBreaker(
    failure_threshold=2,
    cooldown_seconds=180.0,
    half_open_max_calls=1
)


def get_realtime_circuit_breaker() -> CircuitBreaker:
    """Get real-time quotes circuit breaker."""
    return _realtime_circuit_breaker
