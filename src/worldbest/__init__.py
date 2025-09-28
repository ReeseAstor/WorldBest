__all__ = ["greet"]

def greet(name: str = "World") -> str:
    """Return a friendly greeting string.

    Args:
        name: Name to greet.

    Returns:
        A greeting string.
    """
    safe = name.strip() if name is not None else "World"
    return f"Hello, {safe}!"
