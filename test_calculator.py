import pytest

from calculator import add, subtract, multiply, divide


def test_add():
    """Test that add returns the sum of two numbers."""
    assert add(2, 3) == 5


def test_subtract():
    """Test that subtract returns the difference of two numbers."""
    assert subtract(5, 3) == 2


def test_multiply():
    """Test that multiply returns the product of two numbers."""
    assert multiply(2, 3) == 6


def test_divide():
    """Test that divide returns the quotient of two numbers."""
    assert divide(6, 2) == 3


def test_divide_by_zero_raises_value_error():
    """Test that divide raises ValueError when dividing by zero."""
    with pytest.raises(ValueError):
        divide(6, 0)