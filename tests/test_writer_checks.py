import json
import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
HOOK = REPO / "home/dot_agents/hooks/executable_writer-checks.sh"
JQ = shutil.which("jq")

PASSING_CHECKS = "#!/usr/bin/env bash\ncat > \"$CHECKS_LOG\"\n"
FAILING_CHECKS = "#!/usr/bin/env bash\ncat > \"$CHECKS_LOG\"\necho 'FAIL test_cart_total'\nexit 1\n"


@unittest.skipUnless(JQ, "jq is required")
class WriterChecksTest(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.tmp)
        self.home = self.tmp / "home"
        (self.home / ".config/ai").mkdir(parents=True)
        self.repo = self.tmp / "repo"
        self.repo.mkdir()
        git = ["git", "-C", str(self.repo)]
        subprocess.run([*git, "init", "-q"], check=True)
        subprocess.run([*git, "-c", "user.name=t", "-c", "user.email=t@example.com",
                        "commit", "-q", "--allow-empty", "-m", "base"], check=True)
        self.root = subprocess.run([*git, "rev-parse", "--show-toplevel"], check=True,
                                   capture_output=True, text=True).stdout.strip()
        self.log = self.tmp / "checks.log"
        (self.repo / "cart.py").write_text("total = 1\n")

    def allow(self):
        (self.home / ".config/ai/writer-checks.allow").write_text(self.root + "\n")

    def add_checks(self, body):
        script = self.repo / ".agents/writer-checks.sh"
        script.parent.mkdir()
        script.write_text(body)
        script.chmod(0o755)

    def run_hook(self, stop_hook_active=False):
        payload = {"hook_event_name": "SubagentStop", "cwd": str(self.repo),
                   "stop_hook_active": stop_hook_active, "agent_type": "task"}
        env = {**os.environ, "HOME": str(self.home), "CHECKS_LOG": str(self.log)}
        return subprocess.run(["bash", str(HOOK)], input=json.dumps(payload),
                              capture_output=True, text=True, env=env)

    def test_repo_not_on_allow_list_never_runs_its_script(self):
        self.add_checks(FAILING_CHECKS)
        result = self.run_hook()
        self.assertEqual(result.returncode, 0)
        self.assertFalse(self.log.exists())

    def test_allowed_repo_without_a_checks_script_lets_the_writer_stop(self):
        self.allow()
        self.assertEqual(self.run_hook().returncode, 0)

    def test_passing_checks_get_the_changed_files_and_let_the_writer_stop(self):
        self.allow()
        self.add_checks(PASSING_CHECKS)
        result = self.run_hook()
        self.assertEqual(result.returncode, 0)
        self.assertIn("cart.py", self.log.read_text().splitlines())

    def test_failing_checks_block_the_stop_and_show_the_failure(self):
        self.allow()
        self.add_checks(FAILING_CHECKS)
        result = self.run_hook()
        self.assertEqual(result.returncode, 2)
        self.assertIn("FAIL test_cart_total", result.stderr)

    def test_second_stop_after_a_block_is_let_through(self):
        self.allow()
        self.add_checks(FAILING_CHECKS)
        result = self.run_hook(stop_hook_active=True)
        self.assertEqual(result.returncode, 0)
        self.assertFalse(self.log.exists())

    def test_allow_list_entry_for_a_parent_directory_does_not_match(self):
        (self.home / ".config/ai/writer-checks.allow").write_text(str(Path(self.root).parent) + "\n")
        self.add_checks(FAILING_CHECKS)
        self.assertEqual(self.run_hook().returncode, 0)


if __name__ == "__main__":
    unittest.main()
