from app.core.logging import setup_logging

def main():
    # Initialize logging
    logger = setup_logging()
    logger.info("Starting bookmark backend application")


if __name__ == "__main__":
    main()
