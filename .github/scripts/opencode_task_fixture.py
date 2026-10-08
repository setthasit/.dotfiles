import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import re
import subprocess
import threading
import uuid


def task_call(role, marker, **extra):
    return {"name": "task", "arguments": {"description": "Check native task dispatch",
            "subagent_type": role, "prompt": f"fixture:{marker}", **extra}}


def skill_call(name):
    return {"name": "skill", "arguments": {"name": name}}


def request_marker(request):
    markers = [part["text"] for item in request["input"] if item.get("role") == "user"
               for part in item.get("content", []) if part.get("text", "").startswith("fixture:")]
    return markers[-1].splitlines()[0] if markers else "fixture:internal"


def task_session_id(output):
    child = re.search(r'<task id="([^"]+)"', output)
    assert child, "task result did not carry a resumable session ID"
    return child[1]


class TaskFixture:
    def __init__(self):
        self.requests = []
        self.errors = []
        self.turns = {}
        self.lock = threading.Lock()
        self.leaves = threading.Barrier(3, timeout=15)

    def reply(self, request, session):
        if not request.get("tools"):
            return "fixture title"
        with self.lock:
            turn = self.turns.get(session, 0)
            self.turns[session] = turn + 1
            self.requests.append((session, request))
        marker = request_marker(request)
        outputs = [item["output"] for item in request["input"] if item.get("type") == "function_call_output"]
        replies = {
            "fixture:lead": [
                [task_call("planner", "planner")],
                [task_call("coordinator", "coordinator")],
            ],
            "fixture:planner": [
                [skill_call("implementation-plan-creator")],
                [task_call("scout", "planner-scout")],
                "PLANNER_REPORT",
            ],
            "fixture:coordinator": [
                [skill_call("implement-plan-execution"), skill_call("clean-code")],
                [task_call("task", "leaf-a"), task_call("sonic", "leaf-b"),
                 task_call("reviewer", "leaf-c")],
                "QUESTION: fixture decision, all three leaves reported",
            ],
            "fixture:mention-lead": [
                [{"name": "task", "arguments": {"description": "Check agent mention denial",
                  "subagent_type": "planner", "prompt": "fixture:mention-planner\n@task"}}],
                "MENTION_CHECK_DONE",
            ],
            "fixture:reference-lead": [
                [{"name": "task", "arguments": {"description": "Check file reference denial",
                  "subagent_type": "planner", "prompt": "fixture:reference-planner\n@ordinary.txt"}}],
                "REFERENCE_CHECK_DONE",
            ],
            "fixture:resume-denials": [[task_call("planner", "planner")]],
            "fixture:ask-lead": [[task_call("planner", "forbidden-child")], "ASK_DENIED"],
        }
        if marker.startswith("fixture:leaf-"):
            self.leaves.wait()
            return marker + " REPORT"
        if marker == "fixture:planner-scout":
            return "SCOUT_REPORT"
        if marker == "fixture:planner" and turn == 1:
            assert 'skill_content name="implementation-plan-creator"' in outputs[-1], outputs[-1]
        if marker == "fixture:planner" and turn == 2:
            assert "SCOUT_REPORT" in outputs[-1], outputs[-1]
        if marker == "fixture:coordinator" and turn == 1:
            for skill in ("implement-plan-execution", "clean-code"):
                assert f'skill_content name="{skill}"' in "".join(outputs), skill
        if marker == "fixture:coordinator" and turn == 2:
            for leaf in ("leaf-a", "leaf-b", "leaf-c"):
                assert f"fixture:{leaf} REPORT" in "".join(outputs), leaf
        if marker == "fixture:resume":
            assert "QUESTION: fixture decision" in json.dumps(request["input"]), "resume lost child history"
            return "RESUMED_REPORT"
        if marker in {"fixture:mention-lead", "fixture:reference-lead"} and turn == 1:
            assert "Task prompt references denied" in outputs[-1], outputs[-1]
        if marker == "fixture:ask-lead" and turn == 1:
            assert "Task authorization denied" in outputs[-1], outputs[-1]
        if marker == "fixture:resume-denials":
            if turn == 1:
                return [task_call("coordinator", "forbidden-child", task_id=task_session_id(outputs[-1]))]
            if turn == 2:
                assert "Task resume denied" in outputs[-1], outputs[-1]
                return [task_call("planner", "forbidden-child", task_id=session)]
            if turn == 3:
                assert "Task resume denied" in outputs[-1], outputs[-1]
                return [task_call("planner", "forbidden-child", task_id="ses_missing_fixture")]
            if turn == 4:
                assert "Task resume denied" in outputs[-1], outputs[-1]
                return "RESUME_DENIALS_PASS"
        if marker == "fixture:lead" and turn == 1:
            if "Subagent depth limit reached (0)" in json.dumps(request["input"]):
                return "DEPTH_BLOCKED"
            assert outputs, "planner result missing"
            assert "PLANNER_REPORT" in outputs[-1], outputs[-1]
        if marker == "fixture:lead" and turn == 2:
            assert "QUESTION: fixture decision" in outputs[-1], outputs[-1]
            return [task_call("coordinator", "resume", task_id=task_session_id(outputs[-1]))]
        if marker == "fixture:lead" and turn == 3:
            assert "RESUMED_REPORT" in json.dumps(request["input"]), "resume result missing"
            return "TASK_WORKFLOW_PASS"
        return replies.get(marker, ["fixture internal report"])[turn]

    def verify(self):
        assert not self.errors, self.errors
        by_marker = {}
        for session, request in self.requests:
            by_marker.setdefault(request_marker(request), []).append((session, request))
        for marker, model, effort in (
            ("planner", "gpt-6-astra", "xhigh"),
            ("coordinator", "gpt-6-astra", "high"),
            ("resume", "gpt-6-astra", "high"),
            ("leaf-a", "gpt-6.1-sol", "high"),
            ("leaf-b", "gpt-6-luna", "high"),
            ("leaf-c", "gpt-6.1-sol", "high"),
            ("planner-scout", "gpt-6-luna", "high"),
        ):
            assert f"fixture:{marker}" in by_marker, list(by_marker)
            for _, request in by_marker[f"fixture:{marker}"]:
                assert request["model"] == model, (marker, request["model"])
                assert request.get("reasoning", {}).get("effort") == effort, (marker, request.get("reasoning"))
                tools = {tool["name"] for tool in request.get("tools", [])}
                assert ("task" in tools) is (marker in {"planner", "coordinator", "resume"}), (marker, tools)
        assert by_marker["fixture:coordinator"][0][0] == by_marker["fixture:resume"][0][0]


def response_events(reply):
    identifier = uuid.uuid4().hex
    output = []
    events = []
    if isinstance(reply, str):
        item = {"id": f"msg_{identifier}", "type": "message", "role": "assistant", "status": "completed",
                "content": [{"type": "output_text", "text": reply, "annotations": []}]}
        output.append(item)
        events += [
            {"type": "response.output_item.added", "output_index": 0, "item": {**item, "content": []}},
            {"type": "response.content_part.added", "item_id": item["id"], "output_index": 0,
             "content_index": 0, "part": {"type": "output_text", "text": "", "annotations": []}},
            {"type": "response.output_text.delta", "item_id": item["id"], "output_index": 0,
             "content_index": 0, "delta": reply},
        ]
    else:
        for index, call in enumerate(reply):
            item = {"id": f"fc_{identifier}_{index}", "call_id": f"call_{identifier}_{index}", "type": "function_call",
                    "name": call["name"], "arguments": json.dumps(call["arguments"]), "status": "completed"}
            output.append(item)
            events += [
                {"type": "response.output_item.added", "output_index": index, "item": {**item, "arguments": ""}},
                {"type": "response.function_call_arguments.delta", "item_id": item["id"],
                 "output_index": index, "delta": item["arguments"]},
            ]
    for index, item in enumerate(output):
        events.append({"type": "response.output_item.done", "output_index": index, "item": item})
    events.append({"type": "response.completed", "response": {
        "id": f"resp_{identifier}", "object": "response", "created_at": 0, "model": "fixture",
        "status": "completed", "output": output,
        "usage": {"input_tokens": 1, "output_tokens": 1, "total_tokens": 2,
                  "input_tokens_details": {"cached_tokens": 0}, "output_tokens_details": {"reasoning_tokens": 0}},
    }})
    return events


def verify_task_runtime(run, env):
    fixture = TaskFixture()

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, format, *args):
            pass

        def do_POST(self):
            try:
                assert self.path == "/responses", self.path
                request = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
                reply = fixture.reply(request, self.headers["x-opencode-session-id"])
                events = response_events(reply)
            except Exception as error:
                fixture.errors.append(str(error))
                self.send_error(500, "fixture assertion failed")
                return
            body = "".join(f"data: {json.dumps(event)}\n\n" for event in events).encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    original = env["OPENCODE_CONFIG_CONTENT"]
    overrides = json.loads(original)
    overrides["provider"] = {"openai": {"options": {"apiKey": "disposable-placeholder",
                               "baseURL": f"http://127.0.0.1:{server.server_port}"}}}
    overrides["enabled_providers"] = ["openai"]
    overrides["snapshot"] = False
    try:
        env["OPENCODE_CONFIG_CONTENT"] = json.dumps(overrides)
        output = run(["opencode", "run", "--agent", "build", "--format", "json", "fixture:lead"])
        assert not fixture.errors, fixture.errors
        assert "TASK_WORKFLOW_PASS" in output, output
        fixture.verify()
        overrides["subagent_depth"] = 0
        env["OPENCODE_CONFIG_CONTENT"] = json.dumps(overrides)
        resolved = json.loads(run(["opencode", "debug", "config"]))
        assert resolved["subagent_depth"] == 0, resolved["subagent_depth"]
        output = run(["opencode", "run", "--agent", "build", "--format", "json", "fixture:lead"])
        assert not fixture.errors, fixture.errors
        assert "DEPTH_BLOCKED" in output, output
        overrides["subagent_depth"] = 2
        env["OPENCODE_CONFIG_CONTENT"] = json.dumps(overrides)
        for marker, expected in (("mention-lead", "MENTION_CHECK_DONE"),
                                 ("reference-lead", "REFERENCE_CHECK_DONE"),
                                 ("resume-denials", "RESUME_DENIALS_PASS")):
            output = run(["opencode", "run", "--agent", "build", "--format", "json", f"fixture:{marker}"])
            assert not fixture.errors, fixture.errors
            assert expected in output, output
        overrides["permission"] = {"task": {"planner": "ask"}}
        env["OPENCODE_CONFIG_CONTENT"] = json.dumps(overrides)
        output = run(["opencode", "run", "--agent", "build", "--format", "json", "fixture:ask-lead"])
        assert not fixture.errors, fixture.errors
        assert "ASK_DENIED" in output, output
        forbidden = {"fixture:mention-planner", "fixture:reference-planner", "fixture:forbidden-child"}
        started = {request_marker(request) for _, request in fixture.requests}
        assert not forbidden.intersection(started), "task policy started a forbidden child"
    except subprocess.CalledProcessError:
        assert not fixture.errors, fixture.errors
        raise
    finally:
        env["OPENCODE_CONFIG_CONTENT"] = original
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)
        assert not thread.is_alive(), "fixture server did not stop"
    print("PASS: native lead/planner/coordinator nesting, skill loads, three concurrent leaves, resume, model effort, and depth rejection")
    print("PASS: task policy rejects implicit references, invalid resumes, and unapproved ask rules")
