import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "home/dot_agents/skills/implementation-plan-creator/scripts/executable_plan_check.py"

REQUIREMENTS = """\
## Requirements — specify now

### R1: Export
#### S1: Happy path
#### S2: Empty list
"""

OUTLINE = "# Phase {n}: Later\n\nStatus: outline\n\n## Goal\n\nLater work.\n\n**Serves**: R1.S2\n"


def leaf(leaf_id, done=False, blocked_by="none", files=None, serves="R1.S1"):
    return {"id": leaf_id, "done": done, "blocked_by": blocked_by, "files": files or f"modify `src/{leaf_id}.py`", "serves": serves}


def checkbox_lines(leaves):
    lines, parent = [], None
    for item in leaves:
        task_number = item["id"].split(".")[0]
        if task_number != parent:
            lines.append(f"- [ ] Task {task_number}: Group {task_number}")
            parent = task_number
        lines.append(f"  - [{'x' if item['done'] else ' '}] {item['id']}: Do {item['id']}")
    return lines


def detail_lines(item):
    return [
        f"#### {item['id']}: Do {item['id']}",
        f"Serves: {item['serves']}",
        f"Files: {item['files']}",
        f"Blocked by: {item['blocked_by']}",
        "Read first: `src/x.py:1` (pattern)",
        "Change: do it",
        "Done when: `test_x` passes",
        "",
    ]


def phase_text(leaves, parts=None, number=1):
    """`parts` lists (ends_with, leaf count) per part heading. None writes no part headings."""
    lines = ["## Tasks", ""]
    if parts is None:
        lines += checkbox_lines(leaves)
    else:
        cursor = 0
        for index, (ends_with, count) in enumerate(parts, 1):
            lines.append(f"### Part {number}.{index}: Part {index}")
            if ends_with:
                lines.append(f"Ends with: {ends_with}")
            lines += checkbox_lines(leaves[cursor:cursor + count])
            cursor += count
    lines += ["", "## Implementation Details", ""]
    for item in leaves:
        lines += detail_lines(item)
    return "\n".join(lines) + "\n"


class PlanCheckTest(unittest.TestCase):
    def plan(self, files):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        plan_dir = Path(tmp.name)
        files = {"requirements.md": REQUIREMENTS, **files}
        for name, text in files.items():
            if text is not None:
                (plan_dir / name).write_text(text, encoding="utf-8")
        return plan_dir

    def run_script(self, command, plan_dir):
        result = subprocess.run([sys.executable, str(SCRIPT), command, str(plan_dir)], capture_output=True, text=True)
        return result.returncode, result.stdout + result.stderr

    def assert_lint_error(self, files, expected):
        code, output = self.run_script("lint", self.plan(files))
        self.assertEqual(code, 1, output)
        self.assertIn(expected, output)

    def status_output(self, files):
        code, output = self.run_script("status", self.plan(files))
        self.assertEqual(code, 0, output)
        return output


class LintTest(PlanCheckTest):
    def test_clean_plan_passes(self):
        code, output = self.run_script("lint", self.plan({"plan.md": phase_text([leaf("1.1"), leaf("1.2", blocked_by="1.1 (uses its helper)")])}))
        self.assertEqual(code, 0, output)
        self.assertIn("clean", output)

    def test_missing_detail_line_fails(self):
        self.assert_lint_error({"plan.md": phase_text([leaf("1.1")]).replace("Change: do it\n", "")}, "1.1 has no `Change:` line")

    def test_fenced_snippet_does_not_end_the_details(self):
        snippet = "Change: do it\n```python\n# a comment inside a snippet\n```\n"
        code, output = self.run_script("lint", self.plan({"plan.md": phase_text([leaf("1.1")]).replace("Change: do it\n", snippet)}))
        self.assertEqual(code, 0, output)

    def test_tilde_fence_does_not_end_the_details(self):
        snippet = "Change: do it\n~~~\n# retry\n~~~\n"
        code, output = self.run_script("lint", self.plan({"plan.md": phase_text([leaf("1.1")]).replace("Change: do it\n", snippet)}))
        self.assertEqual(code, 0, output)

    def test_unknown_blocker_fails(self):
        self.assert_lint_error({"plan.md": phase_text([leaf("1.1", blocked_by="9.9")])}, "blocked by unknown task 9.9")

    def test_self_blocker_is_reported_once(self):
        code, output = self.run_script("lint", self.plan({"plan.md": phase_text([leaf("1.1", blocked_by="1.1")])}))
        self.assertEqual(code, 1, output)
        self.assertIn("1.1 is blocked by itself", output)
        self.assertNotIn("cycle", output)

    def test_blocker_cycle_fails(self):
        self.assert_lint_error({"plan.md": phase_text([leaf("1.1", blocked_by="1.2"), leaf("1.2", blocked_by="1.1")])}, "`Blocked by` cycle")

    def test_blocked_by_prose_fails(self):
        self.assert_lint_error({"plan.md": phase_text([leaf("1.1", blocked_by="the schema task")])}, "neither `none` nor task IDs")

    def test_files_without_path_fails(self):
        self.assert_lint_error({"plan.md": phase_text([leaf("1.1", files="this plan")])}, "names no `backticked` path")

    def test_files_with_line_number_fails(self):
        self.assert_lint_error({"plan.md": phase_text([leaf("1.1", files="modify `src/a.py:10`")])}, "carries a line number")

    def test_unknown_scenario_fails(self):
        self.assert_lint_error({"plan.md": phase_text([leaf("1.1", serves="R2.S1")])}, "R2.S1, absent from requirements.md")

    def test_infra_with_reason_passes(self):
        code, output = self.run_script("lint", self.plan({"plan.md": phase_text([leaf("1.1", serves="infra (shared helper)")])}))
        self.assertEqual(code, 0, output)

    def test_missing_requirements_only_warns(self):
        code, output = self.run_script("lint", self.plan({"plan.md": phase_text([leaf("1.1")]), "requirements.md": None}))
        self.assertEqual(code, 0, output)
        self.assertIn("warn: missing: `Serves` IDs not checked", output)

    def test_malformed_checkbox_fails(self):
        self.assert_lint_error({"plan.md": phase_text([leaf("1.1")]).replace("  - [ ] 1.1:", "  - [X] 1.1:")}, "checkbox the executor cannot parse")

    def test_duplicate_task_id_fails(self):
        text = phase_text([leaf("1.1")]).replace("  - [ ] 1.1: Do 1.1", "  - [ ] 1.1: Do 1.1\n  - [ ] 1.1: Again")
        code, output = self.run_script("lint", self.plan({"plan.md": text}))
        self.assertEqual(code, 1, output)
        self.assertIn("task ID 1.1 appears twice", output)
        self.assertNotIn("has no leaf tasks", output)

    def test_parent_without_leaves_fails(self):
        self.assert_lint_error({"plan.md": phase_text([leaf("1.1")]).replace("## Implementation", "- [ ] Task 2: Empty\n\n## Implementation")}, "Task 2 has no leaf tasks under it")

    def test_details_without_checkbox_fails(self):
        text = phase_text([leaf("1.1")]) + "\n".join(detail_lines(leaf("1.2")))
        self.assert_lint_error({"plan.md": text}, "details for 1.2, which has no checkbox")

    def test_seven_leaves_without_parts_fail(self):
        self.assert_lint_error({"plan.md": phase_text([leaf(f"1.{n}") for n in range(1, 8)])}, "7 leaf tasks need `### Part` headings")

    def test_part_over_cap_fails(self):
        self.assert_lint_error({"plan.md": phase_text([leaf(f"1.{n}") for n in range(1, 8)], parts=[("done", 7)])}, "part 1.1 holds 7 leaf tasks")

    def test_four_parts_fail(self):
        text = phase_text([leaf(f"{n}.1") for n in range(1, 5)], parts=[("a", 1), ("b", 1), ("c", 1), ("d", 1)])
        self.assert_lint_error({"plan.md": text}, "4 parts, cap is 3")

    def test_part_without_ends_with_fails(self):
        self.assert_lint_error({"plan.md": phase_text([leaf("1.1")], parts=[(None, 1)])}, "part 1.1 has no `Ends with:` line")

    def test_misnumbered_part_fails(self):
        text = phase_text([leaf("1.1")], parts=[("a", 1)]).replace("### Part 1.1:", "### Part 2.1:")
        self.assert_lint_error({"plan.md": text}, "part 2.1 should be numbered 1.1")

    def test_leaf_before_first_part_fails(self):
        text = phase_text([leaf("1.1"), leaf("2.1")], parts=[("a", 1), ("b", 1)]).replace("### Part 1.1: Part 1\nEnds with: a\n", "")
        self.assert_lint_error({"plan.md": text}, "1.1 sits before the first part heading")

    def test_blocker_in_later_part_fails(self):
        text = phase_text([leaf("1.1", blocked_by="2.1"), leaf("2.1")], parts=[("a", 1), ("b", 1)])
        self.assert_lint_error({"plan.md": text}, "1.1 is blocked by 2.1 in a later part")

    def test_outline_with_tasks_fails(self):
        self.assert_lint_error({"phase-1-x.md": OUTLINE.format(n=1) + phase_text([leaf("1.1")])}, "outline holds tasks")

    def test_outline_without_serves_fails(self):
        outline = OUTLINE.format(n=2).replace("**Serves**: R1.S2\n", "")
        self.assert_lint_error({"phase-1-x.md": phase_text([leaf("1.1")]), "phase-2-y.md": outline}, "outline has no **Serves** line")

    def test_second_detailed_phase_only_warns(self):
        code, output = self.run_script("lint", self.plan({"phase-1-x.md": phase_text([leaf("1.1")]), "phase-2-y.md": phase_text([leaf("1.1")], number=2)}))
        self.assertEqual(code, 0, output)
        self.assertIn("warn: detailed before phase 1 shipped", output)

    def test_phase_file_without_description_is_read(self):
        code, output = self.run_script("lint", self.plan({"phase-1.md": phase_text([leaf("1.1")])}))
        self.assertEqual(code, 0, output)

    def test_unparsable_phase_name_exits_2(self):
        code, output = self.run_script("lint", self.plan({"phase-one.md": phase_text([leaf("1.1")])}))
        self.assertEqual(code, 2, output)
        self.assertIn("phase-one.md is not named", output)

    def test_plan_and_phase_files_together_exit_2(self):
        code, output = self.run_script("lint", self.plan({"plan.md": phase_text([leaf("1.1")]), "phase-1-x.md": phase_text([leaf("1.1")])}))
        self.assertEqual(code, 2, output)
        self.assertIn("one shape or the other", output)

    def test_duplicate_phase_number_exits_2(self):
        code, output = self.run_script("lint", self.plan({"phase-1-a.md": phase_text([leaf("1.1")]), "phase-1-b.md": phase_text([leaf("1.1")])}))
        self.assertEqual(code, 2, output)
        self.assertIn("two files claim one phase number", output)

    def test_empty_directory_exits_2(self):
        code, output = self.run_script("lint", self.plan({}))
        self.assertEqual(code, 2, output)
        self.assertIn("no plan.md or phase-*.md", output)


class StatusTest(PlanCheckTest):
    BRANCH = "## Phase started — phase 1 — branch feat/x\n"

    def test_batch_skips_blocked_and_overlapping_leaves(self):
        leaves = [
            leaf("1.1", files="modify `src/a.py`"),
            leaf("1.2", files="modify `./src/a.py`"),
            leaf("1.3", blocked_by="1.1"),
            leaf("1.4"),
            leaf("1.5"),
            leaf("1.6"),
        ]
        output = self.status_output({"plan.md": phase_text(leaves)})
        self.assertIn("phase 1  plan.md  open  0/6", output)
        self.assertIn("state: run-part", output)
        self.assertIn("part: whole phase  0/6  ends after 1.6, then ship", output)
        self.assertIn("ready: 1.1 1.2 1.4 1.5 1.6", output)
        self.assertIn("batch: 1.1 1.4 1.5", output)
        self.assertIn("branch: none yet", output)

    def test_batch_stays_inside_the_current_part(self):
        text = phase_text([leaf("1.1"), leaf("2.1")], parts=[("a", 1), ("b", 1)])
        output = self.status_output({"plan.md": text})
        self.assertIn("part: 1.1  0/1  ends after 1.1, then handoff", output)
        self.assertIn("batch: 1.1\n", output)

    def test_leaf_without_paths_runs_alone(self):
        text = phase_text([leaf("1.1"), leaf("1.2")]).replace("Files: modify `src/1.1.py`", "Files: none")
        self.assertIn("batch: 1.1\n", self.status_output({"plan.md": text}))

    def test_finished_part_moves_on_and_asks_for_part_review(self):
        text = phase_text([leaf("1.1", done=True), leaf("2.1")], parts=[("a", 1), ("b", 1)])
        output = self.status_output({"plan.md": text, "progress.md": self.BRANCH + "## 1/1.1 — done — abc1234\n"})
        self.assertIn("phase 1  plan.md  open  1/2  part 1.1 1/1  part 1.2 0/1", output)
        self.assertIn("part: 1.2  0/1  ends after 2.1, then ship", output)
        self.assertIn("branch: feat/x", output)
        self.assertIn("part 1.1 has every task [x] and no `## Handoff`: run its Part review", output)

    def test_recorded_handoff_clears_the_attention(self):
        text = phase_text([leaf("1.1", done=True), leaf("2.1")], parts=[("a", 1), ("b", 1)])
        ledger = self.BRANCH + "## Handoff — part 1.1 done — branch feat/x — abc1234 — next: part 1.2, task 1/2.1\n"
        output = self.status_output({"plan.md": text, "progress.md": ledger})
        self.assertIn("part: 1.2  0/1", output)
        self.assertNotIn("attention", output)

    def test_ledger_accepts_hyphen_and_en_dash(self):
        ledger = "## Phase started - phase 1 - branch feat/x\n## Ship started – phase 1\n"
        output = self.status_output({"plan.md": phase_text([leaf("1.1", done=True)]), "progress.md": ledger})
        self.assertIn("state: ship-resume", output)
        self.assertIn("branch: feat/x", output)

    def test_complete_phase_without_ship_entries_asks(self):
        output = self.status_output({"plan.md": phase_text([leaf("1.1", done=True)]), "progress.md": self.BRANCH})
        self.assertIn("phase 1  plan.md  complete, not shipped  1/1", output)
        self.assertIn("state: ask-shipped", output)

    def test_missing_branch_comes_before_the_ship_states(self):
        output = self.status_output({"plan.md": phase_text([leaf("1.1", done=True)]), "progress.md": "## Ship started — phase 1\n"})
        self.assertIn("state: ask-branch", output)

    def test_shipped_phase_hands_over_to_the_outline(self):
        ledger = self.BRANCH + "## Shipped — phase 1 — pushed — abc1234\n"
        output = self.status_output({"phase-1-x.md": phase_text([leaf("1.1", done=True)]), "phase-2-y.md": OUTLINE.format(n=2), "progress.md": ledger})
        self.assertIn("phase 1  phase-1-x.md  shipped  1/1", output)
        self.assertIn("phase 2  phase-2-y.md  outline", output)
        self.assertIn("current: phase 2", output)
        self.assertIn("state: detail-outline", output)

    def test_every_phase_shipped_is_done(self):
        ledger = self.BRANCH + "## Shipped — phase 1 — pushed — abc1234\n"
        self.assertIn("state: done", self.status_output({"plan.md": phase_text([leaf("1.1", done=True)]), "progress.md": ledger}))

    def test_done_tasks_without_phase_started_ask_for_branch(self):
        self.assertIn("state: ask-branch", self.status_output({"plan.md": phase_text([leaf("1.1", done=True), leaf("1.2")])}))

    def test_ambiguous_bare_ids_ask(self):
        files = {"phase-1-x.md": phase_text([leaf("1.1")]), "phase-2-y.md": phase_text([leaf("1.1")], number=2), "progress.md": "## 1.1 — done — abc1234\n"}
        self.assertIn("state: ask-legacy-ids", self.status_output(files))

    def test_single_owner_bare_ids_get_a_ruling_line(self):
        files = {"plan.md": phase_text([leaf("1.1", done=True), leaf("1.2")]), "progress.md": self.BRANCH + "## 1.1 — done — abc1234\n"}
        output = self.status_output(files)
        self.assertIn("state: run-part", output)
        self.assertIn("append `## Ruling - legacy bare IDs - phase 1`", output)

    def test_recorded_legacy_ruling_stops_the_question(self):
        ledger = "## 1.1 — done — abc1234\n## Ruling — legacy bare IDs — phase 1\n"
        files = {"phase-1-x.md": phase_text([leaf("1.1")]), "phase-2-y.md": phase_text([leaf("1.1")], number=2), "progress.md": ledger}
        output = self.status_output(files)
        self.assertIn("state: run-part", output)
        self.assertIn("batch: 1.1", output)

    def test_lint_errors_surface_as_attention(self):
        output = self.status_output({"plan.md": phase_text([leaf("1.1", blocked_by="9.9"), leaf("1.2")])})
        self.assertIn("lint: 1 error(s)", output)
        self.assertIn("ready: 1.2", output)


class SeparatorTest(PlanCheckTest):
    EM_DASH_REQUIREMENTS = "# Export — Requirements\n\n## Non-goals — out of scope\n\n- Import\n\n" + REQUIREMENTS
    EM_DASH_LEDGER = (
        "## Phase started — phase 1 — branch feat/x\n"
        "## 1.1 — done — abc1234\n"
        "## Ruling — legacy bare IDs — phase 1\n"
        "## Handoff — part 1.1 done — branch feat/x — abc1234 — next: part 1.2, task 1/2.1\n"
        "## Ship started — phase 1\n"
    )

    def test_hyphen_separators_give_the_em_dash_result(self):
        plan = phase_text([leaf("1.1", done=True), leaf("2.1", done=True, serves="R1.S2")], parts=[("a", 1), ("b", 1)])
        em_dash_files = {"plan.md": plan, "requirements.md": self.EM_DASH_REQUIREMENTS, "progress.md": self.EM_DASH_LEDGER}
        hyphen_files = {name: text.replace("—", "-") for name, text in em_dash_files.items()}
        self.assertNotIn("—", "".join(hyphen_files.values()))

        em_dash_status = self.run_script("status", self.plan(em_dash_files))
        em_dash_lint = self.run_script("lint", self.plan(em_dash_files))
        expected_status = (
            "phase 1  plan.md  ship started  2/2  part 1.1 1/1  part 1.2 1/1\n"
            "current: phase 1  plan.md\n"
            "state: ship-resume\n"
            "branch: feat/x\n"
        )
        self.assertEqual(em_dash_status, (0, expected_status))
        self.assertEqual(em_dash_lint, (0, "clean\n"))

        self.assertEqual(self.run_script("status", self.plan(hyphen_files)), em_dash_status)
        self.assertEqual(self.run_script("lint", self.plan(hyphen_files)), em_dash_lint)

    def assert_hyphen_ledger_gives_status(self, plan, em_dash_ledger, expected_status):
        hyphen_ledger = em_dash_ledger.replace("—", "-")
        for ledger in (em_dash_ledger, hyphen_ledger):
            with self.subTest(ledger=ledger):
                self.assertEqual(self.status_output({"plan.md": plan, "progress.md": ledger}), expected_status)

    def test_hyphen_bare_done_line_still_asks_for_a_ruling(self):
        plan = phase_text([leaf("1.1", done=True), leaf("1.2")])
        expected_status = (
            "phase 1  plan.md  open  1/2\n"
            "current: phase 1  plan.md\n"
            "state: run-part\n"
            "branch: feat/x\n"
            "part: whole phase  1/2  ends after 1.2, then ship\n"
            "ready: 1.2\n"
            "batch: 1.2\n"
            "attention:\n"
            "  - append `## Ruling - legacy bare IDs - phase 1`\n"
        )
        self.assert_hyphen_ledger_gives_status(plan, "## Phase started — phase 1 — branch feat/x\n## 1.1 — done — abc1234\n", expected_status)

    def test_hyphen_shipped_line_still_ends_the_plan(self):
        plan = phase_text([leaf("1.1", done=True)])
        ledger = "## Phase started — phase 1 — branch feat/x\n## Shipped — phase 1 — pushed — abc1234\n"
        self.assert_hyphen_ledger_gives_status(plan, ledger, "phase 1  plan.md  shipped  1/1\nstate: done\n")


if __name__ == "__main__":
    unittest.main()
