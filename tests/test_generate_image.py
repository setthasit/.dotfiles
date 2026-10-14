import base64
import contextlib
import email.message
import importlib.util
import io
import json
import os
import signal
import socket
import sys
import tempfile
import unittest
import urllib.request
from pathlib import Path
from unittest import mock

SCRIPT = Path(__file__).resolve().parents[1] / "home/dot_agents/skills/image-generation/scripts/executable_generate_image.py"
PLACEHOLDER_KEY = "placeholder-not-a-key"
PNG = b"\x89PNG\r\n\x1a\n" + b"image bytes"
REAL_BUILD_OPENER = urllib.request.build_opener


def load_script():
    sys.dont_write_bytecode = True
    spec = importlib.util.spec_from_file_location("generate_image", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


gen = load_script()


def image_response(image=PNG):
    return json.dumps({"data": [{"b64_json": base64.b64encode(image).decode()}]}).encode()


class RedirectingHandler(urllib.request.BaseHandler):
    handler_order = 100

    def __init__(self):
        self.requested = []

    def https_open(self, request):
        self.requested.append(request.full_url)
        headers = email.message.Message()
        headers["Location"] = "https://attacker.invalid/steal"
        response = urllib.request.addinfourl(io.BytesIO(b""), headers, request.full_url, 302)
        response.msg = "Found"
        return response


class FailingWriteFile:
    def __init__(self, real_file):
        self.real_file = real_file

    def write(self, _data):
        raise OSError(28, "No space left on device")

    def close(self):
        self.real_file.close()

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()


class GenerateImageTest(unittest.TestCase):
    def setUp(self):
        self.directory = Path(tempfile.mkdtemp())
        self.addCleanup(self.remove_directory)
        self.out = self.directory / "out.png"
        self.requests = []
        environment = mock.patch.dict(os.environ, {gen.API_KEY_VARIABLE: PLACEHOLDER_KEY})
        environment.start()
        self.addCleanup(environment.stop)
        no_network = mock.patch.object(gen.urllib.request, "build_opener", side_effect=AssertionError("network"))
        no_network.start()
        self.addCleanup(no_network.stop)
        previous_handler = signal.getsignal(signal.SIGTERM)
        self.addCleanup(signal.signal, signal.SIGTERM, previous_handler)

    def remove_directory(self):
        for path in self.directory.iterdir():
            path.unlink()
        self.directory.rmdir()

    def stub_request(self, response=None, error=None):
        def request_image(body, api_key):
            self.requests.append(body)
            if error is not None:
                raise error
            return response

        patcher = mock.patch.object(gen, "request_image", side_effect=request_image)
        patcher.start()
        self.addCleanup(patcher.stop)

    def run_script(self, out=None):
        stderr = io.StringIO()
        with contextlib.redirect_stderr(stderr), contextlib.redirect_stdout(io.StringIO()):
            exit_code = gen.main(["--prompt", "a red cube", "--out", str(out or self.out)])
        return exit_code, stderr.getvalue()

    def test_success_writes_exact_bytes(self):
        self.stub_request(response=image_response())
        exit_code, _ = self.run_script()
        self.assertEqual(exit_code, 0)
        self.assertEqual(self.out.read_bytes(), PNG)

    def test_api_error_exits_1_and_removes_file(self):
        self.stub_request(error=gen.ApiError("HTTP 500: upstream"))
        exit_code, stderr = self.run_script()
        self.assertEqual(exit_code, 1)
        self.assertIn("HTTP 500", stderr)
        self.assertFalse(os.path.lexists(self.out))

    def test_write_failure_exits_3_paid_not_saved_and_removes_file(self):
        self.stub_request(response=image_response())
        real_open = open

        def open_failing_write(path, mode="r", *args, **kwargs):
            return FailingWriteFile(real_open(path, mode, *args, **kwargs))

        with mock.patch.object(gen, "open", side_effect=open_failing_write, create=True):
            exit_code, stderr = self.run_script()
        self.assertEqual(exit_code, 3)
        self.assertIn("likely charged, but nothing was saved", stderr)
        self.assertIn("No space left on device", stderr)
        self.assertFalse(os.path.lexists(self.out))

    def test_response_without_png_exits_3_and_removes_file(self):
        self.stub_request(response=image_response(image=b"not a png"))
        exit_code, stderr = self.run_script()
        self.assertEqual(exit_code, 3)
        self.assertIn("not a PNG", stderr)
        self.assertFalse(os.path.lexists(self.out))

    def test_existing_output_exits_2_without_request(self):
        self.stub_request(response=image_response())
        self.out.write_bytes(b"user data")
        exit_code, stderr = self.run_script()
        self.assertEqual(exit_code, 2)
        self.assertIn("refusing to overwrite", stderr)
        self.assertEqual(self.requests, [])
        self.assertEqual(self.out.read_bytes(), b"user data")

    def test_output_created_after_validation_is_not_overwritten(self):
        self.stub_request(response=image_response())
        validate = gen.new_png_path

        def validate_then_race(raw_path):
            path = validate(raw_path)
            path.write_bytes(b"user data")
            return path

        with mock.patch.object(gen, "new_png_path", side_effect=validate_then_race):
            exit_code, _ = self.run_script()
        self.assertEqual(exit_code, 2)
        self.assertEqual(self.requests, [])
        self.assertEqual(self.out.read_bytes(), b"user data")

    def test_dangling_symlink_exits_2_and_creates_no_target(self):
        self.stub_request(response=image_response())
        target = self.directory / "target.png"
        self.out.symlink_to(target)
        exit_code, _ = self.run_script()
        self.assertEqual(exit_code, 2)
        self.assertFalse(target.exists())
        self.assertEqual(self.requests, [])

    def test_sigterm_during_request_removes_file(self):
        def request_then_terminated(body, api_key):
            self.assertTrue(self.out.exists())
            os.kill(os.getpid(), signal.SIGTERM)
            raise AssertionError("SIGTERM did not interrupt the request")

        def handler_missing(*_):
            raise AssertionError("the script installed no SIGTERM handler")

        signal.signal(signal.SIGTERM, handler_missing)
        with mock.patch.object(gen, "request_image", side_effect=request_then_terminated):
            with self.assertRaises(SystemExit) as stopped:
                self.run_script()
        self.assertEqual(stopped.exception.code, 128 + signal.SIGTERM)
        self.assertFalse(os.path.lexists(self.out))

    def test_redirect_is_not_followed(self):
        handler = RedirectingHandler()

        def opener_with_fake_transport(*handlers):
            return REAL_BUILD_OPENER(*handlers, handler)

        with mock.patch.object(socket, "create_connection", side_effect=AssertionError("network")), \
                mock.patch.object(gen.urllib.request, "build_opener", side_effect=opener_with_fake_transport):
            with self.assertRaises(gen.ApiError) as failed:
                gen.request_image({"prompt": "x"}, PLACEHOLDER_KEY)
        self.assertIn("HTTP 302", str(failed.exception))
        self.assertEqual(handler.requested, [gen.ENDPOINT])


if __name__ == "__main__":
    unittest.main()
