from __future__ import annotations

import argparse
import sys

from . import greet


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(prog="worldbest", description="WorldBest CLI")
    parser.add_argument("name", nargs="?", default="World", help="Name to greet")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    ns = parse_args(argv)
    print(greet(ns.name))
    return 0


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
