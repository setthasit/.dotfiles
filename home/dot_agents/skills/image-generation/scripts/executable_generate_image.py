#!/usr/bin/env python3

import argparse
import base64
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ENDPOINT = "https://api.openai.com/v1/images/generations"
API_KEY_VARIABLE = "OPENAI_API_KEY"

DEFAULT_MODEL = "gpt-image-2.5-flare-2026-09-08"
MODELS = (
    DEFAULT_MODEL,
    "gpt-image-2.5-flare",
    "gpt-image-2.5-sunburst-2026-09-08",
    "gpt-image-2.5-sunburst",
)
SIZES = ("1024x1024", "1536x1024", "1024x1536")
QUALITIES = ("low", "medium", "high", "xhigh", "max")
MAX_PROMPT_CHARS = 32000

REQUEST_TIMEOUT_SECONDS = 300
HTTP_UNAUTHORIZED = 401
MAX_ERROR_MESSAGE_CHARS = 300
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"

EXIT_OK, EXIT_API_FAILED, EXIT_USAGE = 0, 1, 2


class UsageError(Exception):
    exit_code = EXIT_USAGE


class ApiError(Exception):
    exit_code = EXIT_API_FAILED


class RefuseRedirects(urllib.request.HTTPRedirectHandler):
    # urllib resends the Authorization header to whatever host a redirect names.
    def redirect_request(self, *_):
        return None


def build_parser():
    parser = argparse.ArgumentParser(
        description="Generate one PNG image from a text prompt.",
        allow_abbrev=False,
    )
    prompt = parser.add_mutually_exclusive_group(required=True)
    prompt.add_argument("--prompt", help="the prompt text")
    prompt.add_argument("--prompt-file", type=Path, help="a UTF-8 file holding the prompt")
    parser.add_argument("--out", required=True, help="a new .png path, never overwritten")
    parser.add_argument("--size", choices=SIZES, default=SIZES[0])
    parser.add_argument("--quality", choices=QUALITIES, default=QUALITIES[0])
    parser.add_argument("--model", choices=MODELS, default=DEFAULT_MODEL)
    parser.add_argument("--transparent", action="store_true", help="transparent background")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="validate, print the request, send nothing",
    )
    return parser


def read_prompt(arguments):
    prompt = arguments.prompt
    if arguments.prompt_file is not None:
        try:
            prompt = arguments.prompt_file.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError) as error:
            raise UsageError(f"cannot read --prompt-file: {error}") from None
    prompt = prompt.strip()
    if not prompt:
        raise UsageError("the prompt is empty")
    if len(prompt) > MAX_PROMPT_CHARS:
        raise UsageError(f"the prompt is {len(prompt)} characters, the limit is {MAX_PROMPT_CHARS}")
    return prompt


def request_body(arguments, prompt):
    body = {
        "model": arguments.model,
        "prompt": prompt,
        "n": 1,
        "size": arguments.size,
        "quality": arguments.quality,
        "output_format": "png",
    }
    if arguments.transparent:
        body["background"] = "transparent"
    return body


def new_png_path(raw_path):
    path = Path(os.path.abspath(raw_path))
    if path.suffix.lower() != ".png":
        raise UsageError("--out must end in .png")
    if os.path.lexists(path):
        raise UsageError(f"{path} exists, refusing to overwrite it")
    if not path.parent.is_dir():
        raise UsageError(f"{path.parent} is not an existing directory")
    return path


def read_api_key():
    api_key = os.environ.get(API_KEY_VARIABLE, "")
    if not api_key:
        raise UsageError(f"{API_KEY_VARIABLE} is not set")
    if not (api_key.isascii() and api_key.isprintable()):
        raise UsageError(f"{API_KEY_VARIABLE} holds a character that cannot go in a request header")
    return api_key


def describe_request(body, out_path):
    shown = {**body, "prompt": f"{len(body['prompt'])} characters"}
    lines = ["dry run, nothing sent", f"endpoint: {ENDPOINT}"]
    lines += [f"{field}: {value}" for field, value in shown.items()]
    lines.append(f"out: {out_path}")
    return "\n".join(lines)


def api_error_message(status, response_body, api_key):
    if status == HTTP_UNAUTHORIZED:
        return f"the API rejected the key in {API_KEY_VARIABLE}"
    try:
        message = str(json.loads(response_body)["error"]["message"])
    except (ValueError, LookupError, TypeError):
        return "the response held no error message"
    one_line = " ".join(message.replace(api_key, "<redacted>").split())
    return one_line[:MAX_ERROR_MESSAGE_CHARS]


def request_image(body, api_key):
    request = urllib.request.Request(
        ENDPOINT,
        data=json.dumps(body).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    opener = urllib.request.build_opener(RefuseRedirects)
    try:
        with opener.open(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            return response.read()
    except urllib.error.HTTPError as error:
        reason = api_error_message(error.code, error.read(), api_key)
        raise ApiError(f"HTTP {error.code}: {reason}") from None
    except OSError as error:
        raise ApiError(f"request failed: {error}") from None


def decode_png(response_body):
    try:
        image = base64.b64decode(json.loads(response_body)["data"][0]["b64_json"], validate=True)
    except (ValueError, LookupError, TypeError):
        raise ApiError("the response held no base64 image at data[0].b64_json") from None
    if not image.startswith(PNG_SIGNATURE):
        raise ApiError("the response image is not a PNG")
    return image


def write_new_file(path, content):
    try:
        with open(path, "xb") as new_file:
            new_file.write(content)
    except OSError as error:
        raise UsageError(f"cannot write {path}: {error.strerror}") from None


def run(arguments):
    body = request_body(arguments, read_prompt(arguments))
    out_path = new_png_path(arguments.out)
    api_key = read_api_key()
    if arguments.dry_run:
        print(describe_request(body, out_path))
        return
    write_new_file(out_path, decode_png(request_image(body, api_key)))
    print(f"wrote {out_path}")


def main(argv):
    arguments = build_parser().parse_args(argv)
    try:
        run(arguments)
    except (UsageError, ApiError) as error:
        print(error, file=sys.stderr)
        return error.exit_code
    return EXIT_OK


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
