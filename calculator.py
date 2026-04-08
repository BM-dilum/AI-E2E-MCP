"""
Simple calculator module providing basic arithmetic operations.
"""

from typing import Union

Number = Union[int, float]

__all__ = ["add", "subtract", "multiply", "divide"]


def add(a: Number, b: Number) -> Number:
    """
    Return the sum of a and b.
    """
    return a + b


def subtract(a: Number, b: Number) -> Number:
    """
    Return the difference of a and b.
    """
    return a - b


def multiply(a: Number, b: Number) -> Number:
    """
    Return the product of a and b.
    """
    return a * b


def divide(a: Number, b: Number) -> Number:
    """
    Return the division of a by b. Raises ValueError if b is zero.
    """
    if b == 0:
        raise ValueError("Division by zero is not allowed")
    return a / b