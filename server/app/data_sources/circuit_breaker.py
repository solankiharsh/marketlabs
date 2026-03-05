# -*- coding: utf-8 -*-
"""
===================================
Circuit Breaker Module
===================================

Manages data source circuit/cooldown state to avoid repeated requests on consecutive failures.

State machine:
CLOSED (normal) --N failures--> OPEN (tripped) --cooldown elapsed--> HALF_OPEN (probing)
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
    CLOSED = "closed"       # Normal
    OPEN = "open"           # Tripped (unavailable)
    HALF_OPEN = "half_open"  # Probing


class CircuitBreaker:
    """
    Circuit breaker - manages data source trip/cooldown state.

    Strategy:
    - After N consecutive failures, enter OPEN (tripped) state
    - Skip the data source while tripped
    - After cooldown, enter HALF_OPEN (probing)
    - On success in HALF_OPEN, return to CLOSED; on failure, stay OPEN
    """

    def __init__(
        self,
        failure_threshold: int = 3,
        cooldown_seconds: float = 300.0,
        half_open_max_calls: int = 1
    ):
        self.failure_threshold = failure_threshold
        self.cooldown_seconds = cooldown_seconds
        self.half_open_max_calls = half_open_max_calls
        self._states: Dict[str, Dict[str, Any]] = {}

    def _get_state(self, source: str) -> Dict[str, Any]:
        """Get or initialize state for a data source."""
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

        Returns True if a request may be attempted, False if the source should be skipped.
        """
        state = self._get_state(source)
        current_time = time.time()

        if state['state'] == CircuitState.CLOSED:
            return True

        if state['state'] == CircuitState.OPEN:
            time_since_failure = current_time - state['last_failure_time']
            if time_since_failure >= self.cooldown_seconds:
                state['state'] = CircuitState.HALF_OPEN
                state['half_open_calls'] = 0
                logger.info(f"[CircuitBreaker] {source} cooldown complete, entering HALF_OPEN")
                return True
            else:
                remaining = self.cooldown_seconds - time_since_failure
                logger.debug(f"[CircuitBreaker] {source} tripped, remaining cooldown: {remaining:.0f}s")
                return False

        if state['state'] == CircuitState.HALF_OPEN:
            if state['half_open_calls'] < self.half_open_max_calls:
                return True
            return False

        return True

    def record_success(self, source: str) -> None:
        """Record a successful request."""
        state = self._get_state(source)

        if state['state'] == CircuitState.HALF_OPEN:
            logger.info(f"[CircuitBreaker] {source} HALF_OPEN request succeeded, recovered")

        state['state'] = CircuitState.CLOSED
        state['failures'] = 0
        state['half_open_calls'] = 0
        state['last_error'] = None

    def record_failure(self, source: str, error: Optional[str] = None) -> None:
        """Record a failed request."""
        state = self._get_state(source)
        current_time = time.time()

        state['failures'] += 1
        state['last_failure_time'] = current_time
        state['last_error'] = error

        if state['state'] == CircuitState.HALF_OPEN:
            state['state'] = CircuitState.OPEN
            state['half_open_calls'] = 0
            logger.warning(f"[CircuitBreaker] {source} HALF_OPEN request failed, tripping for {self.cooldown_seconds}s")
        elif state['failures'] >= self.failure_threshold:
            state['state'] = CircuitState.OPEN
            logger.warning(
                f"[CircuitBreaker] {source} failed {state['failures']} times, tripping (cooldown {self.cooldown_seconds}s)"
            )
            if error:
                logger.warning(f"[CircuitBreaker] Last error: {error}")

    def get_status(self) -> Dict[str, Dict[str, Any]]:
        """Get status for all data sources."""
        return {
            source: {
                'state': info['state'].value,
                'failures': info['failures'],
                'last_error': info['last_error']
            }
            for source, info in self._states.items()
        }

    def reset(self, source: Optional[str] = None) -> None:
        """Reset circuit state."""
        if source:
            if source in self._states:
                del self._states[source]
                logger.info(f"[CircuitBreaker] Reset {source}")
        else:
            self._states.clear()
            logger.info("[CircuitBreaker] Reset all sources")


# Global circuit breaker instance for realtime (stricter)
_realtime_circuit_breaker = CircuitBreaker(
    failure_threshold=2,
    cooldown_seconds=180.0,
    half_open_max_calls=1
)


def get_realtime_circuit_breaker() -> CircuitBreaker:
    """Get the realtime circuit breaker."""
    return _realtime_circuit_breaker
