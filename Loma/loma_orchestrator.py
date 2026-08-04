"""
╔══════════════════════════════════════════════════════════════════════════════╗
║          LOMA MASTER ORCHESTRATOR — Full Autonomous Self-Training           ║
║  Runs all improvement pipelines in sequence → trains → merges → deploys    ║
╚══════════════════════════════════════════════════════════════════════════════╝

This is the single command to rule them all.

What it does each cycle:
  1. auto_trainer.py     — web-crawl all domains, harvest new training data
  2. image_self_improver — benchmark image quality, evolve image-gen.html
  3. music_self_improver — benchmark audio quality, evolve music-gen.html
  4. train_capabilities  — fine-tune Llama on expanded dataset
  5. Status report       — scores, deltas, what improved

Run:
    python loma_orchestrator.py                # one full cycle
    python loma_orchestrator.py --cycles 5     # 5 cycles, auto-sleep between
    python loma_orchestrator.py --skip-train   # crawl + analyze, no GPU training
    python loma_orchestrator.py --fast         # skip image/music bench (faster)
"""

import os
import sys
import json
import time
import argparse
import subprocess
from pathlib import Path
from datetime import datetime

DATASET_PATH = Path("my_rlhf_dataset.json")
LOG_PATH     = Path("orchestrator_log.json")

PIPELINE_STEPS = [
    {
        "name":   "Web Crawler (all domains)",
        "script": "auto_trainer.py",
        "args":   ["--loop", "1"],
        "required": True,
    },
    {
        "name":   "Image Quality Benchmark",
        "script": "image_self_improver.py",
        "args":   ["--loops", "1"],
        "required": False,
        "skip_flag": "fast",
    },
    {
        "name":   "Music Quality Benchmark",
        "script": "music_self_improver.py",
        "args":   ["--loops", "1"],
        "required": False,
        "skip_flag": "fast",
    },
    {
        "name":   "Model Fine-Tuning",
        "script": "train_capabilities.py",
        "args":   [],
        "required": False,
        "skip_flag": "skip_train",
    },
]


def run_step(step: dict, cycle: int, flags: dict) -> dict:
    """Run a pipeline step, return result."""
    name   = step["name"]
    script = step["script"]

    # Check skip flags
    if step.get("skip_flag") and flags.get(step["skip_flag"]):
        return {"step": name, "status": "skipped", "duration": 0}

    if not Path(script).exists():
        status = "missing" if step["required"] else "skipped_missing"
        print(f"  ⚠️  [{name}] {script} not found — {status}")
        return {"step": name, "status": status, "duration": 0}

    print(f"\n{'─' * 60}")
    print(f"  ▶  [{cycle}] {name}")
    print(f"{'─' * 60}")

    start = time.time()
    try:
        result = subprocess.run(
            [sys.executable, script] + step["args"],
            capture_output=False,
            timeout=3600,  # 1 hour max per step
        )
        duration = time.time() - start
        status   = "success" if result.returncode == 0 else "failed"
        print(f"  {'✅' if status == 'success' else '❌'}  {name} — {duration:.0f}s")
        return {"step": name, "status": status, "duration": duration, "returncode": result.returncode}
    except subprocess.TimeoutExpired:
        return {"step": name, "status": "timeout", "duration": 3600}
    except Exception as e:
        return {"step": name, "status": "error", "error": str(e), "duration": 0}


def dataset_stats() -> dict:
    """Quick stats on current dataset."""
    if not DATASET_PATH.exists():
        return {"total": 0, "by_domain": {}}

    with open(DATASET_PATH) as f:
        data = json.load(f)

    by_domain: dict = {}
    for p in data:
        d = p.get("domain", "general")
        by_domain[d] = by_domain.get(d, 0) + 1

    avg_score = 0.0
    scored = [p for p in data if "score" in p]
    if scored:
        avg_score = sum(p["score"] for p in scored) / len(scored)

    return {"total": len(data), "by_domain": by_domain, "avg_score": avg_score}


def load_log() -> list:
    if LOG_PATH.exists():
        with open(LOG_PATH) as f:
            return json.load(f)
    return []


def save_log(log: list):
    with open(LOG_PATH, "w") as f:
        json.dump(log, f, indent=2)


def print_status_report(cycle: int, step_results: list, stats_before: dict, stats_after: dict):
    delta = stats_after["total"] - stats_before["total"]
    print(f"\n{'╔' + '═' * 60 + '╗'}")
    print(f"║{'  📊  CYCLE ' + str(cycle) + ' STATUS REPORT'.center(60)}║")
    print(f"{'╠' + '═' * 60 + '╣'}")
    print(f"║{'  Dataset: ' + str(stats_after['total']) + ' pairs (+' + str(delta) + ' this cycle)'.ljust(59)}║")

    for domain, count in stats_after.get("by_domain", {}).items():
        prev = stats_before.get("by_domain", {}).get(domain, 0)
        inc  = count - prev
        print(f"║{'    ' + domain + ': ' + str(count) + ' (+' + str(inc) + ')'.ljust(50)}║")

    avg = stats_after.get("avg_score", 0)
    print(f"║{'  Avg pair quality: ' + f'{avg:.3f}'.ljust(40)}║")
    print(f"{'╠' + '═' * 60 + '╣'}")

    for r in step_results:
        icon = {"success": "✅", "skipped": "⏭️", "failed": "❌",
                "timeout": "⏱️", "missing": "❓", "skipped_missing": "⚪"}.get(r["status"], "❔")
        dur  = f" ({r['duration']:.0f}s)" if r["duration"] > 0 else ""
        print(f"║  {icon}  {r['step'][:40].ljust(43)}{r['status'].upper()[:8].ljust(8)}{dur.ljust(8)}║")

    print(f"{'╚' + '═' * 60 + '╝'}")


def run_cycle(cycle: int, flags: dict):
    """Run one full orchestration cycle."""
    print(f"\n{'═' * 64}")
    print(f"  🧬  LOMA ORCHESTRATOR — CYCLE {cycle} — {datetime.now().strftime('%H:%M:%S')}")
    print(f"{'═' * 64}")

    stats_before = dataset_stats()
    step_results = []

    for step in PIPELINE_STEPS:
        result = run_step(step, cycle, flags)
        step_results.append(result)
        if result["status"] == "failed" and step["required"]:
            print(f"\n❌  Required step '{step['name']}' failed. Stopping cycle.")
            break

    stats_after = dataset_stats()
    print_status_report(cycle, step_results, stats_before, stats_after)

    # Log
    log = load_log()
    log.append({
        "cycle":        cycle,
        "timestamp":    datetime.now().isoformat(),
        "steps":        step_results,
        "stats_before": stats_before,
        "stats_after":  stats_after,
    })
    save_log(log)
    return step_results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="LOMA Master Orchestrator")
    parser.add_argument("--cycles",     type=int, default=1,   help="Number of full cycles")
    parser.add_argument("--gap",        type=int, default=120, help="Seconds between cycles")
    parser.add_argument("--skip-train", action="store_true",   help="Skip model fine-tuning")
    parser.add_argument("--fast",       action="store_true",   help="Skip image/music benchmarks")
    args = parser.parse_args()

    flags = {
        "skip_train": args.skip_train,
        "fast":       args.fast,
    }

    log         = load_log()
    start_cycle = len(log) + 1

    print(f"╔{'═' * 62}╗")
    print(f"║{'  🚀  LOMA AUTONOMOUS SELF-TRAINING SYSTEM'.center(62)}║")
    print(f"║{'  ' + str(args.cycles) + ' cycle(s) | ' + ('skip-train ' if args.skip_train else '') + ('fast' if args.fast else 'full')}.center(62)'.center(62)}║")
    print(f"╚{'═' * 62}╝")

    for i in range(args.cycles):
        if i > 0:
            print(f"\n⏱️   Sleeping {args.gap}s before cycle {start_cycle + i}…")
            time.sleep(args.gap)
        run_cycle(start_cycle + i, flags)

    print(f"\n🏁  All {args.cycles} cycle(s) complete.")
    final_stats = dataset_stats()
    print(f"    Dataset: {final_stats['total']} pairs")
    print(f"    Avg quality: {final_stats.get('avg_score', 0):.3f}")
    print(f"\nNext steps:")
    print("  python merge_lora.py")
    print("  python convert_to_mlc.py")