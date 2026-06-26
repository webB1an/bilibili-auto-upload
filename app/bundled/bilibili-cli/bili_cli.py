"""Lightweight Bilibili-only CLI for Wallpaper Studio.

Avoids importing patchright and other platform uploaders from sau_cli.py,
so it works on Python 3.13 with only `requests` installed.
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Sequence

from conf import BASE_DIR
from uploader.bilibili_uploader.runtime import run_biliup_command

SCHEDULE_FORMAT = "%Y-%m-%d %H:%M"


@dataclass(slots=True)
class BilibiliVideoUploadRequest:
    account_name: str
    video_file: Path
    title: str
    description: str
    tid: int
    tags: list[str]
    publish_date: datetime | int


def has_interactive_terminal() -> bool:
    return sys.stdin.isatty() and sys.stdout.isatty()


def resolve_account_file(account_name: str) -> Path:
    account_file = Path(BASE_DIR) / "cookies" / f"bilibili_{account_name}.json"
    account_file.parent.mkdir(exist_ok=True)
    return account_file


def parse_tags(raw_tags: str | None) -> list[str]:
    if not raw_tags:
        return []

    tags: list[str] = []
    for item in raw_tags.split(","):
        cleaned = item.strip().lstrip("#")
        if cleaned:
            tags.append(cleaned)
    return tags


def parse_schedule(raw_schedule: str | None) -> datetime | int:
    if not raw_schedule:
        return 0
    return datetime.strptime(raw_schedule, SCHEDULE_FORMAT)


async def login_bilibili_account(account_name: str) -> dict:
    account_file = resolve_account_file(account_name)
    if not has_interactive_terminal():
        return {
            "success": False,
            "message": (
                "Bilibili login requires a local interactive terminal. "
                f"Please run `python bili_cli.py login --account {account_name}` in a terminal. "
                "If the terminal QR code does not render completely, open `./qrcode.png` and scan that image."
            ),
            "account_file": str(account_file),
        }

    result = run_biliup_command(["-u", str(account_file), "login"], interactive=True)
    success = result.returncode == 0
    message = (result.stderr or result.stdout or "").strip()
    return {
        "success": success,
        "message": message or ("Bilibili login completed" if success else "Bilibili login failed"),
        "account_file": str(account_file),
    }


async def check_bilibili_account(account_name: str) -> bool:
    account_file = resolve_account_file(account_name)
    if not account_file.exists():
        return False
    result = run_biliup_command(["-u", str(account_file), "renew"])
    return result.returncode == 0


async def upload_bilibili_video(request: BilibiliVideoUploadRequest) -> Path:
    account_file = resolve_account_file(request.account_name)
    if not account_file.exists():
        raise RuntimeError(
            f"Bilibili account file is missing: {account_file}. "
            f"Run `python bili_cli.py login --account {request.account_name}` first."
        )

    arguments = [
        "-u",
        str(account_file),
        "upload",
        str(request.video_file),
        "--title",
        request.title,
        "--desc",
        request.description,
        "--tid",
        str(request.tid),
    ]
    if request.tags:
        arguments.extend(["--tag", ",".join(request.tags)])
    if isinstance(request.publish_date, datetime):
        arguments.extend(["--dtime", str(int(request.publish_date.timestamp()))])

    result = run_biliup_command(arguments)
    if result.returncode != 0:
        raise RuntimeError((result.stderr or result.stdout or "").strip() or "Bilibili upload failed")
    return account_file


def existing_file_path(value: str) -> Path:
    path = Path(value)
    if not path.is_file():
        raise argparse.ArgumentTypeError(f"File not found: {value}")
    return path


def schedule_value(value: str):
    try:
        return parse_schedule(value)
    except ValueError as exc:
        raise argparse.ArgumentTypeError(
            f"Invalid schedule '{value}'. Expected format: {SCHEDULE_FORMAT}"
        ) from exc


def build_parser() -> argparse.ArgumentParser:
    schedule_help = SCHEDULE_FORMAT.replace("%", "%%")
    parser = argparse.ArgumentParser(
        prog="bili_cli",
        description="Bilibili-only CLI for social-auto-upload (no patchright required).",
    )
    actions = parser.add_subparsers(dest="action", required=True)

    login_parser = actions.add_parser("login", help="Login to Bilibili via QR code")
    login_parser.add_argument("--account", required=True, help="User-defined account name")

    check_parser = actions.add_parser("check", help="Check whether Bilibili login is valid")
    check_parser.add_argument("--account", required=True, help="User-defined account name")

    upload_parser = actions.add_parser("upload-video", help="Upload one video to Bilibili")
    upload_parser.add_argument("--account", required=True, help="User-defined account name")
    upload_parser.add_argument("--file", required=True, type=existing_file_path, help="Video file path")
    upload_parser.add_argument("--title", required=True, help="Video title")
    upload_parser.add_argument("--desc", required=True, help="Video description")
    upload_parser.add_argument("--tid", required=True, type=int, help="Bilibili category id")
    upload_parser.add_argument("--tags", default="", help="Comma-separated tags, such as tag1,tag2")
    upload_parser.add_argument("--schedule", type=schedule_value, help=f"Schedule time in {schedule_help}")

    return parser


async def dispatch(args: argparse.Namespace) -> int:
    if args.action == "login":
        result = await login_bilibili_account(args.account)
        if not result["success"]:
            raise RuntimeError(result["message"])
        print(f"Bilibili login flow completed: {result['account_file']}")
        return 0

    if args.action == "check":
        is_valid = await check_bilibili_account(args.account)
        print("valid" if is_valid else "invalid")
        return 0 if is_valid else 1

    if args.action == "upload-video":
        request = BilibiliVideoUploadRequest(
            account_name=args.account,
            video_file=args.file,
            title=args.title,
            description=args.desc,
            tid=args.tid,
            tags=parse_tags(args.tags),
            publish_date=args.schedule or 0,
        )
        await upload_bilibili_video(request)
        print(f"Bilibili video upload submitted: {request.video_file}")
        return 0

    raise RuntimeError(f"Unsupported action: {args.action}")


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(list(argv) if argv is not None else None)
    try:
        return asyncio.run(dispatch(args))
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
