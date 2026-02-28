import logging
import logging.handlers
import os
import contextvars

# Context variable to hold the trace_id for current execution context
trace_id_ctx_var = contextvars.ContextVar("trace_id", default="-")

class TraceFilter(logging.Filter):
    """Injects the current trace_id into the log record."""
    def filter(self, record):
        record.trace_id = trace_id_ctx_var.get()
        return True
import os

def setup_logging():
    """Sets up robust file logging with rotation for the backend."""
    log_dir = "logs"
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)

    log_file = os.path.join(log_dir, "primer.log")

    # Rotating file handler - up to 10MB per file, keeping 5 backups
    handler = logging.handlers.RotatingFileHandler(
        log_file,
        maxBytes=10 * 1024 * 1024,
        backupCount=5
    )
    
    # Also log to stdout for Docker compose readability
    console_handler = logging.StreamHandler()

    formatter = logging.Formatter(
        '[%(asctime)s] %(levelname)s [Trace: %(trace_id)s] [%(name)s:%(lineno)d] %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    handler.setFormatter(formatter)
    console_handler.setFormatter(formatter)
    
    trace_filter = TraceFilter()
    handler.addFilter(trace_filter)
    console_handler.addFilter(trace_filter)

    # Root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    
    # Avoid duplicate handlers if setup multiple times
    if not root_logger.handlers:
        root_logger.addHandler(handler)
        root_logger.addHandler(console_handler)
        
    # Tone down noisy libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
