import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "home/dot_agents/skills/writing-for-agents/scripts/executable_check_skills.py"
HARD_CAP_LINES = 200


def skill_md(name, body_lines=(), extra_frontmatter=""):
    frontmatter = f"---\nname: {name}\ndescription: Use when testing the checker.\n{extra_frontmatter}---\n"
    return frontmatter + "\n".join(body_lines) + "\n"


def filler(count):
    return [f"line {number}" for number in range(count)]


class CheckSkillsTest(unittest.TestCase):
    def setUp(self):
        self.skills = Path(tempfile.mkdtemp()) / "skills"
        self.addCleanup(shutil.rmtree, self.skills.parent)
        scripts = self.skills / "writing-for-agents" / "scripts"
        scripts.mkdir(parents=True)
        shutil.copy(SCRIPT, scripts / "check_skills.py")
        (self.skills / "writing-for-agents" / "SKILL.md").write_text(skill_md("writing-for-agents"))

    def add_skill(self, name, text, references=None):
        directory = self.skills / name
        directory.mkdir()
        (directory / "SKILL.md").write_text(text)
        for reference, content in (references or {}).items():
            (directory / "references").mkdir(exist_ok=True)
            (directory / "references" / reference).write_text(content)

    def check(self, name):
        script = self.skills / "writing-for-agents" / "scripts" / "check_skills.py"
        return subprocess.run(
            [sys.executable, "-B", str(script), name], capture_output=True, text=True, check=False
        )

    def test_skill_md_at_hard_cap_passes(self):
        frontmatter_lines = 4
        self.add_skill("probe", skill_md("probe", filler(HARD_CAP_LINES - frontmatter_lines)))
        result = self.check("probe")
        self.assertEqual(result.returncode, 0, result.stdout)
        self.assertNotIn("FAIL", result.stdout)

    def test_skill_md_over_hard_cap_fails(self):
        self.add_skill("probe", skill_md("probe", filler(HARD_CAP_LINES + 1)))
        result = self.check("probe")
        self.assertEqual(result.returncode, 1)
        self.assertIn("FAIL  SKILL.md lines", result.stdout)

    def test_reference_over_hard_cap_fails(self):
        self.add_skill(
            "probe",
            skill_md("probe", ["See `references/long.md`."]),
            references={"long.md": "\n".join(filler(HARD_CAP_LINES + 1)) + "\n"},
        )
        result = self.check("probe")
        self.assertEqual(result.returncode, 1)
        self.assertIn("FAIL  long.md lines", result.stdout)

    def test_license_key_does_not_excuse_broken_pointer(self):
        self.add_skill("probe", skill_md("probe", ["See `references/missing.md`."], extra_frontmatter="license: MIT\n"))
        result = self.check("probe")
        self.assertEqual(result.returncode, 1)
        self.assertIn("FAIL  SKILL.md points at missing references/missing.md", result.stdout)
        self.assertIn("warn  unknown frontmatter key 'license'", result.stdout)


if __name__ == "__main__":
    unittest.main()
