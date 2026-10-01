# SGR parameters. Palette slots only, so the terminal theme decides the actual colours.
def ACCENT: "36";
def BRANCH: "32";
def DIRTY: "33";
def PATH: "37";
def PLAIN: "39";
def TRACK: "90";
def WARNING: "33";
def DANGER: "31";

def ICON_CLOCK: "\uf017";
def ICON_FOLDER: "\uf07c";
def ICON_BRANCH: "\ue0a0";
def SEPARATOR_RIGHT: "\ue0b1";
def SEPARATOR_LEFT: "\ue0b3";
def RULE_FILLED: "━";
def RULE_TRACK: "─";

# Claude Code 2.1.286 pads the row by 2 cells per side and truncates anything wider.
def ROW_PADDING: 4;
def MIN_GAUGE_WIDTH: 12;
def MIN_SESSION_NAME_WIDTH: 8;
def CONTEXT_WARNING_PERCENT: 70;
def CONTEXT_DANGER_PERCENT: 90;

def span($style; $text): {style: $style, text: $text};
def gap: [span(PLAIN; " ")];
def separator($glyph): [span(TRACK; " \($glyph) ")];
def width: map(.text | length) | add // 0;
def paint: (map("\u001b[0;\(.style)m\(.text)") | join("")) + "\u001b[0m";

def joined($glyph):
  map(select(length > 0) | separator($glyph) + .) | add // [] | .[1:];

def repeated($count): . as $text | [range($count) | $text] | join("");
def truncated($max): if length <= $max then . else .[0:$max - 1] + "…" end;

def duration:
  (. / 60000 | floor) as $minutes
  | if $minutes < 60 then "\($minutes)m" else "\($minutes / 60 | floor)h\($minutes % 60)m" end;

def usd:
  (. * 100 | round) as $cents
  | "$\($cents / 100 | floor).\($cents % 100 | tostring | if length < 2 then "0" + . else . end)";

def token_capacity:
  if . >= 1000000 then "\(. / 100000 | round / 10)M" else "\(. / 1000 | round)k" end;

def tilde_path:
  $ENV.HOME as $home
  | if . == $home then "~"
    elif startswith($home + "/") then "~" + .[($home | length):]
    else . end;

def basename: split("/") | last // "";

def git_state:
  ($git_status | split("\n")) as $lines
  | ($lines | map(select(startswith("# branch.head ")) | ltrimstr("# branch.head ")) | first) as $head
  | ($lines | map(select(startswith("# branch.oid ")) | ltrimstr("# branch.oid ")) | first) as $oid
  | {
      branch: (if $head == "(detached)" then $oid[0:7] else $head end),
      staged: ($lines | map(select(test("^[12] [^.]"))) | length),
      unstaged: ($lines | map(select(test("^(u|[12] .[^.])"))) | length),
      untracked: ($lines | map(select(startswith("? "))) | length)
    };

def dirty_counts:
  [["+", .staged], ["*", .unstaged], ["?", .untracked]]
  | map(select(.[1] > 0) | " \(.[0])\(.[1])")
  | join("");

def git_segment:
  if $git_status == "" then []
  else git_state | [span(BRANCH; "\(ICON_BRANCH) \(.branch)"), span(DIRTY; dirty_counts)]
  end;

def model_segment:
  [
    span(ACCENT; .model.display_name // "Claude"),
    span(PLAIN; .effort.level | if . then " " + . else "" end)
  ];

def left_segments($path):
  [
    [span(ACCENT; "\(ICON_CLOCK) \(.cost.total_duration_ms // 0 | duration)")],
    model_segment,
    [span(PATH; "\(ICON_FOLDER) \($path)")],
    git_segment,
    [span(PLAIN; .cost.total_cost_usd // 0 | usd)]
  ]
  | joined(SEPARATOR_RIGHT);

def session_name_segment($room):
  (.session_name // "") as $name
  | if $name == "" or $room < MIN_SESSION_NAME_WIDTH then []
    else [span(ACCENT; $name | truncated($room))]
    end;

def right_segments($session_name_room):
  [
    (.context_window.context_window_size | if . then [span(PLAIN; token_capacity)] else [] end),
    session_name_segment($session_name_room)
  ]
  | joined(SEPARATOR_LEFT);

def context_style:
  if . >= CONTEXT_DANGER_PERCENT then DANGER
  elif . >= CONTEXT_WARNING_PERCENT then WARNING
  else ACCENT
  end;

def context_gauge($width):
  (.context_window.used_percentage // 0 | round) as $percent
  | "\($percent)%" as $label
  | ([$width - ($label | length), 0] | max) as $rule_width
  | ($rule_width * ([$percent, 100] | min) / 100 | round) as $filled
  | [
      span($percent | context_style; RULE_FILLED | repeated($filled)),
      span($percent | context_style; $label),
      span(TRACK; RULE_TRACK | repeated($rule_width - $filled))
    ];

def status_line($columns):
  (.workspace.current_dir // .cwd // "") as $dir
  | ($columns - MIN_GAUGE_WIDTH - (gap + gap + right_segments(0) | width)) as $left_budget
  | ((left_segments($dir | tilde_path) | select(width <= $left_budget))
      // left_segments($dir | basename)) as $left
  | right_segments($left_budget - ($left | width) - (separator(SEPARATOR_LEFT) | width)) as $right
  | ($columns - ($left + gap + gap + $right | width)) as $gauge_width
  | $left + gap + context_gauge($gauge_width) + gap + $right
  | paint;

status_line(($ENV.COLUMNS | tonumber? // 80) - ROW_PADDING)
