from worldbest import greet


def test_greet_default():
    assert greet() == "Hello, World!"


def test_greet_custom():
    assert greet("Alice") == "Hello, Alice!"


def test_greet_strips_whitespace():
    assert greet("  Bob  ") == "Hello, Bob!"
