import sys
import os

# Add project root to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from app.services.agents.reflection import ReflectionService

def main():
    """
    Run automated reflection verification task.
    Suggest running via cron or timed task scheduler daily.
    """
    print("Running Automated Reflection Verification Task...")
    service = ReflectionService()
    service.run_verification_cycle()
    print("Task Completed.")

if __name__ == "__main__":
    main()

