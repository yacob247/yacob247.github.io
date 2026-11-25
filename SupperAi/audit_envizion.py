
import re
import json
import html
from pathlib import Path
from collections import defaultdict

# ============================================================
# ENVIZION COMPLETE SOURCE-CODE OPERATION AUDITOR
# Run from the root of your Envizion website.
# Uses Python standard library only.
# ============================================================

ROOT = Path(__file__).resolve().parent

OUTPUT_REGISTRY = ROOT / "ENVIZION_FULL_OPERATION_REGISTRY.json"
OUTPUT_MARKDOWN = ROOT / "ENVIZION_FULL_OPERATION_REGISTRY.md"
OUTPUT_FUNCTIONS = ROOT / "ENVIZION_FUNCTION_INVENTORY.json"
OUTPUT_UNRESOLVED = ROOT / "ENVIZION_UNRESOLVED_HANDLERS.json"

EXTENSIONS = {
    ".html", ".htm", ".js", ".mjs", ".cjs",
    ".jsx", ".ts", ".tsx"
}

EXCLUDED_DIRS = {
    "node_modules", ".git", ".next", "dist",
    "build", ".cache", "coverage", "__pycache__"
}

SKIP_FILES = {
    "audit_envizion.py"
}

# ------------------------------------------------------------
# FILE DISCOVERY
# ------------------------------------------------------------

def discover_files():
    files = []

    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue

        if path.suffix.lower() not in EXTENSIONS:
            continue

        if path.name in SKIP_FILES:
            continue

        if any(part in EXCLUDED_DIRS for part in path.parts):
            continue

        files.append(path)

    return sorted(files)


# ------------------------------------------------------------
# JAVASCRIPT LEXICAL UTILITIES
# Finds matching braces while ignoring strings and comments.
# ------------------------------------------------------------

def find_matching_brace(source, opening):
    depth = 0
    quote = None
    escaped = False
    line_comment = False
    block_comment = False
    i = opening

    while i < len(source):
        char = source[i]
        nxt = source[i + 1] if i + 1 < len(source) else ""

        if line_comment:
            if char == "\n":
                line_comment = False
            i += 1
            continue

        if block_comment:
            if char == "*" and nxt == "/":
                block_comment = False
                i += 2
                continue
            i += 1
            continue

        if quote:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                quote = None
            elif quote == "`" and char == "$" and nxt == "{":
                # Template interpolation is not fully parsed here.
                pass
            i += 1
            continue

        if char == "/" and nxt == "/":
            line_comment = True
            i += 2
            continue

        if char == "/" and nxt == "*":
            block_comment = True
            i += 2
            continue

        if char in ("'", '"', "`"):
            quote = char
            i += 1
            continue

        if char == "{":
            depth += 1

        elif char == "}":
            depth -= 1
            if depth == 0:
                return i

        i += 1

    return None


def extract_body(source, brace_position):
    if brace_position < 0 or brace_position >= len(source):
        return None

    closing = find_matching_brace(source, brace_position)

    if closing is None:
        return None

    return source[brace_position + 1:closing]


def line_number(source, position):
    return source.count("\n", 0, position) + 1


# ------------------------------------------------------------
# FUNCTION DISCOVERY
# ------------------------------------------------------------

def discover_functions(source, file_path):
    found = []

    patterns = [
        # function name(args) {}
        (
            "function_declaration",
            re.compile(
                r"\b(?:async\s+)?function\s+"
                r"([A-Za-z_$][\w$]*)\s*"
                r"\(([^)]*)\)\s*\{"
            )
        ),

        # const name = (...) => {}
        # let name = async (...) => {}
        (
            "arrow_function",
            re.compile(
                r"\b(?:const|let|var)\s+"
                r"([A-Za-z_$][\w$]*)\s*=\s*"
                r"(?:async\s*)?"
                r"\(([^)]*)\)\s*=>\s*\{"
            )
        ),

        # const name = arg => {}
        (
            "arrow_function_single_parameter",
            re.compile(
                r"\b(?:const|let|var)\s+"
                r"([A-Za-z_$][\w$]*)\s*=\s*"
                r"(?:async\s*)?"
                r"([A-Za-z_$][\w$]*)\s*=>\s*\{"
            )
        ),

        # object.method = function(args) {}
        (
            "assigned_function",
            re.compile(
                r"\b([A-Za-z_$][\w$]*)\s*=\s*"
                r"(?:async\s*)?function\s*"
                r"\(([^)]*)\)\s*\{"
            )
        ),

        # methodName(args) {}
        (
            "method_definition",
            re.compile(
                r"(?m)^[ \t]*(?:async\s+)?"
                r"([A-Za-z_$][\w$]*)\s*"
                r"\(([^)]*)\)\s*\{"
            )
        )
    ]

    for kind, pattern in patterns:
        for match in pattern.finditer(source):
            name = match.group(1)

            if kind == "arrow_function_single_parameter":
                parameters = match.group(2)
            else:
                parameters = match.group(2)

            opening = match.end() - 1

            body = extract_body(source, opening)

            if body is None:
                continue

            found.append({
                "name": name,
                "kind": kind,
                "parameters": parameters.strip(),
                "parameter_names": extract_parameter_names(parameters),
                "body": body,
                "file": str(file_path.relative_to(ROOT)),
                "line": line_number(source, match.start()),
                "position": match.start()
            })

    # Remove duplicate detections of the same function.
    unique = {}

    for item in found:
        key = (
            item["name"],
            item["file"],
            item["position"]
        )
        unique[key] = item

    return list(unique.values())


def extract_parameter_names(parameters):
    result = []

    for parameter in parameters.split(","):
        parameter = parameter.strip()

        if not parameter:
            continue

        parameter = parameter.split("=")[0].strip()
        parameter = parameter.replace("...", "")

        match = re.search(r"[A-Za-z_$][\w$]*", parameter)

        if match:
            result.append(match.group(0))

    return result


# ------------------------------------------------------------
# CALL GRAPH
# ------------------------------------------------------------

JS_KEYWORDS = {
    "if", "for", "while", "switch", "catch", "function",
    "return", "typeof", "new", "delete", "void",
    "super", "this", "throw", "with"
}


def discover_calls(body):
    calls = re.findall(
        r"(?<![\w$])([A-Za-z_$][\w$]*)\s*\(",
        body
    )

    return sorted(set(
        call for call in calls
        if call not in JS_KEYWORDS
    ))


# ------------------------------------------------------------
# DATA ORIGIN / RESULT / INTERACTION ANALYSIS
# These are evidence-based indicators, not assumed guarantees.
# ------------------------------------------------------------

def inspect_function(function):
    body = function["body"]

    data_patterns = {
        "DOM": r"document\.|getElementById|querySelector",
        "LOCAL_STORAGE": r"localStorage\.",
        "SESSION_STORAGE": r"sessionStorage\.",
        "INDEXEDDB": r"indexedDB|IDBDatabase",
        "FILE_INPUT": r"FileReader|\.files\b|input\.files",
        "NETWORK": r"\bfetch\s*\(|XMLHttpRequest",
        "API_OR_SERVER": r"\.rpc\s*\(|\.from\s*\(|axios\.",
        "URL_PARAMETERS": r"URLSearchParams|location\.search",
        "GLOBAL_STATE": r"\bwindow\.|globalThis\.",
        "EDITOR_STATE": r"editor\.|monaco\.|CodeMirror"
    }

    data_origin = [
        name for name, pattern in data_patterns.items()
        if re.search(pattern, body)
    ]

    interaction_patterns = {
        "FILE_PICKER": r"\.click\s*\(\s*\)|showOpenFilePicker",
        "USER_PROMPT": r"\bprompt\s*\(",
        "CONFIRMATION": r"\bconfirm\s*\(",
        "USER_ALERT": r"\balert\s*\(",
        "CLIPBOARD": r"navigator\.clipboard",
        "FULLSCREEN": r"requestFullscreen|exitFullscreen",
        "DRAG_DROP": r"dataTransfer|dragenter|drop"
    }

    interactions = [
        name for name, pattern in interaction_patterns.items()
        if re.search(pattern, body)
    ]

    result_patterns = {
        "RETURN_VALUE": r"\breturn\b",
        "FILE_DOWNLOAD": r"Blob|createObjectURL|\.download\s*=",
        "NETWORK_RESPONSE": r"\bfetch\s*\(|response\.json|response\.text",
        "DOM_UPDATE": r"innerHTML|textContent|appendChild",
        "STORAGE_WRITE": r"localStorage\.setItem|indexedDB|\.put\s*\(",
        "CONSOLE_OUTPUT": r"console\.(log|error|warn)",
        "FILE_EXPORT": r"exportCSV|writeFile|saveAs"
    }

    results = [
        name for name, pattern in result_patterns.items()
        if re.search(pattern, body)
    ]

    return {
        "data_origin_indicators": data_origin,
        "user_interaction_indicators": interactions,
        "result_indicators": results,
        "calls": discover_calls(body)
    }


# ------------------------------------------------------------
# HTML HANDLER DISCOVERY
# ------------------------------------------------------------

def discover_html_handlers(source, file_path):
    handlers = []

    # onclick="functionName(...)"
    event_pattern = re.compile(
        r"\bon[a-z]+\s*=\s*"
        r"(['\"])(.*?)\1",
        re.IGNORECASE | re.DOTALL
    )

    for match in event_pattern.finditer(source):
        expression = html.unescape(match.group(2)).strip()

        handlers.append({
            "event_type": "inline_html_event",
            "expression": expression,
            "file": str(file_path.relative_to(ROOT)),
            "line": line_number(source, match.start())
        })

    # addEventListener("click", functionName)
    listener_pattern = re.compile(
        r"""addEventListener\s*\(\s*
        (['"])([^'"]+)\1\s*,\s*
        ([A-Za-z_$][\w$]*)""",
        re.VERBOSE
    )

    for match in listener_pattern.finditer(source):
        handlers.append({
            "event_type": "addEventListener",
            "event": match.group(2),
            "expression": match.group(3),
            "file": str(file_path.relative_to(ROOT)),
            "line": line_number(source, match.start())
        })

    return handlers


def get_referenced_function_names(expression):
    # Capture function calls, not button labels or text.
    return re.findall(
        r"(?<![\w$])([A-Za-z_$][\w$]*)\s*\(",
        expression
    )


# ------------------------------------------------------------
# HTML SCRIPT SOURCE EXTRACTION
# ------------------------------------------------------------

def extract_inline_scripts(source):
    scripts = []

    pattern = re.compile(
        r"<script\b([^>]*)>(.*?)</script\s*>",
        re.IGNORECASE | re.DOTALL
    )

    for match in pattern.finditer(source):
        attributes = match.group(1)
        content = match.group(2)

        if re.search(r"\bsrc\s*=", attributes, re.IGNORECASE):
            continue

        scripts.append(content)

    return scripts


def discover_external_scripts(source, html_file):
    scripts = []

    pattern = re.compile(
        r"""<script\b[^>]*\bsrc\s*=\s*
        (['"])(.*?)\1""",
        re.IGNORECASE | re.VERBOSE
    )

    for match in pattern.finditer(source):
        raw = html.unescape(match.group(2)).split("?")[0]

        if raw.startswith(("http://", "https://", "//", "data:")):
            continue

        candidate = (html_file.parent / raw).resolve()

        try:
            candidate.relative_to(ROOT.resolve())
        except ValueError:
            continue

        if candidate.is_file():
            scripts.append(candidate)

    return scripts


# ------------------------------------------------------------
# MAIN SCAN
# ------------------------------------------------------------

files = discover_files()

file_sources = {}
all_functions = []
all_handlers = []
scanned_paths = set()

for file_path in files:
    try:
        source = file_path.read_text(
            encoding="utf-8",
            errors="replace"
        )
    except Exception as error:
        print("Could not read:", file_path, error)
        continue

    file_sources[file_path] = source
    scanned_paths.add(file_path)

    all_handlers.extend(
        discover_html_handlers(source, file_path)
    )

    all_functions.extend(
        discover_functions(source, file_path)
    )

    # Include inline scripts in HTML.
    if file_path.suffix.lower() in {".html", ".htm"}:
        for script in extract_inline_scripts(source):
            all_functions.extend(
                discover_functions(script, file_path)
            )

        # Follow local external script references.
        for external in discover_external_scripts(source, file_path):
            if external in scanned_paths:
                continue

            try:
                external_source = external.read_text(
                    encoding="utf-8",
                    errors="replace"
                )
            except Exception:
                continue

            scanned_paths.add(external)
            file_sources[external] = external_source

            all_functions.extend(
                discover_functions(external_source, external)
            )


# ------------------------------------------------------------
# INDEX FUNCTIONS BY NAME
# ------------------------------------------------------------

functions_by_name = defaultdict(list)

for function in all_functions:
    functions_by_name[function["name"]].append(function)

function_inventory = []

for function in all_functions:
    analysis = inspect_function(function)

    function_inventory.append({
        "name": function["name"],
        "kind": function["kind"],
        "file": function["file"],
        "line": function["line"],
        "parameters": function["parameters"],
        "parameter_names": function["parameter_names"],
        "calls": analysis["calls"],
        "data_origin_indicators": analysis["data_origin_indicators"],
        "user_interaction_indicators": analysis[
            "user_interaction_indicators"
        ],
        "result_indicators": analysis["result_indicators"],
        "source_body": function["body"]
    })


# ------------------------------------------------------------
# BUILD OPERATION REGISTRY FROM REAL HANDLERS
# ------------------------------------------------------------

registry = []
unresolved = []

for handler in all_handlers:
    expression = handler["expression"]

    names = get_referenced_function_names(expression)

    if not names:
        continue

    for name in names:
        candidates = functions_by_name.get(name, [])

        if not candidates:
            unresolved.append({
                **handler,
                "function": name,
                "status": "FUNCTION_NOT_FOUND"
            })
            continue

        for function in candidates:
            analysis = inspect_function(function)

            registry.append({
                "operation": name,
                "trigger": handler["expression"],
                "event_type": handler["event_type"],
                "page": handler["file"],
                "implementation_file": function["file"],
                "implementation_line": function["line"],
                "function_kind": function["kind"],
                "parameters": function["parameters"],
                "parameter_names": function["parameter_names"],
                "calls": analysis["calls"],
                "data_origin": analysis["data_origin_indicators"],
                "user_interaction": analysis[
                    "user_interaction_indicators"
                ],
                "result": analysis["result_indicators"],
                "source_body": function["body"],
                "status": "SOURCE_FOUND",
                "ai_callable": "REQUIRES_REVIEW"
            })


# ------------------------------------------------------------
# FIND FUNCTIONS NOT CONNECTED TO DISCOVERED BUTTONS
# ------------------------------------------------------------

triggered_names = {
    item["operation"] for item in registry
}

untriggered_functions = [
    item for item in function_inventory
    if item["name"] not in triggered_names
]


# ------------------------------------------------------------
# WRITE JSON OUTPUTS
# ------------------------------------------------------------

def write_json(path, data):
    path.write_text(
        json.dumps(data, indent=2, ensure_ascii=False),
        encoding="utf-8"
    )


write_json(OUTPUT_REGISTRY, registry)
write_json(OUTPUT_FUNCTIONS, function_inventory)
write_json(OUTPUT_UNRESOLVED, unresolved)

write_json(
    ROOT / "ENVIZION_UNTRIGGERED_FUNCTIONS.json",
    untriggered_functions
)


# ------------------------------------------------------------
# MARKDOWN REPORT
# ------------------------------------------------------------

lines = [
    "# ENVIZION COMPLETE OPERATION AUDIT",
    "",
    f"- Project root: `{ROOT}`",
    f"- Source files discovered: {len(files)}",
    f"- Functions discovered: {len(function_inventory)}",
    f"- Button/event handler records: {len(all_handlers)}",
    f"- Resolved operation records: {len(registry)}",
    f"- Unresolved handler records: {len(unresolved)}",
    f"- Untriggered functions: {len(untriggered_functions)}",
    "",
    "> IMPORTANT: Detection is static source analysis. A discovered",
    "> function is not automatically safe or suitable for AI execution.",
    "",
    "## Resolved operations",
    ""
]

for item in registry:
    lines.extend([
        f"### `{item['operation']}`",
        f"- Page: `{item['page']}`",
        f"- Implementation: `{item['implementation_file']}`",
        f"- Line: {item['implementation_line']}",
        f"- Parameters: `{item['parameters']}`",
        f"- Data sources: {', '.join(item['data_origin']) or 'Not detected'}",
        f"- User interaction: {', '.join(item['user_interaction']) or 'Not detected'}",
        f"- Result indicators: {', '.join(item['result']) or 'Not detected'}",
        f"- Calls: {', '.join(item['calls']) or 'None detected'}",
        f"- AI callable: {item['ai_callable']}",
        ""
    ])

lines.extend([
    "## Unresolved handlers",
    ""
])

for item in unresolved:
    lines.append(
        f"- `{item['function']}` in `{item['file']}` "
        f"(line {item['line']}) — {item['status']}"
    )

lines.extend([
    "",
    "## Functions without discovered button triggers",
    ""
])

for item in untriggered_functions:
    lines.append(
        f"- `{item['name']}` — `{item['file']}` "
        f"(line {item['line']})"
    )

OUTPUT_MARKDOWN.write_text(
    "\n".join(lines),
    encoding="utf-8"
)


# ------------------------------------------------------------
# FINAL SUMMARY
# ------------------------------------------------------------

print("\n========================================")
print("ENVIZION AUDIT COMPLETE")
print("========================================")
print("Files scanned:", len(files))
print("Functions discovered:", len(function_inventory))
print("Handlers discovered:", len(all_handlers))
print("Resolved operations:", len(registry))
print("Unresolved handlers:", len(unresolved))
print("Untriggered functions:", len(untriggered_functions))
print("\nGenerated files:")

for path in [
    OUTPUT_REGISTRY,
    OUTPUT_MARKDOWN,
    OUTPUT_FUNCTIONS,
    OUTPUT_UNRESOLVED,
    ROOT / "ENVIZION_UNTRIGGERED_FUNCTIONS.json"
]:
    print("-", path.name)

print("\nNo website source files were modified.")
