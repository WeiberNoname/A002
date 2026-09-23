#!/usr/bin/env python3
"""
Desktop 3D Display & MascotCaption Rebuild Script
=================================================
Automates the rebuild, verification, and packaging pipeline
following canonical instructions from README.md & AGENTS.md.

Standard Workflow:
  1. Stop any currently running DesktopPet.exe processes to avoid file locking.
  2. (Optional) Run dependency check / npm install.
  3. Run the automated 16-suite unit test runner (node tests/run_tests.mjs).
  4. Package standalone Windows x64 binary via electron-packager.
  5. Deploy steam_appid.txt to DesktopPet-win32-x64/.
  6. Verify all packaged build artifacts.
  7. (Optional) Cold-boot assets wipe or launch application.

Usage:
  python rebuild.py                 # Full test, build, and package pipeline
  python rebuild.py --skip-tests    # Fast rebuild skipping unit tests
  python rebuild.py --launch        # Rebuild and launch executable
  python rebuild.py --install-deps  # Run npm install before rebuilding
  python rebuild.py --clean-assets  # Clean assets/ folder for cold-boot testing
"""

import os
import sys
import shutil
import argparse
import subprocess
from pathlib import Path

# Ensure UTF-8 output on Windows consoles
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Working directory is the project root (where this script resides)
PROJECT_ROOT = Path(__file__).resolve().parent
OUTPUT_DIR = PROJECT_ROOT / "DesktopPet-win32-x64"
EXECUTABLE_PATH = OUTPUT_DIR / "DesktopPet.exe"
STEAM_APP_ID = PROJECT_ROOT / "steam_appid.txt"
PACKAGER_BIN = PROJECT_ROOT / "node_modules" / "electron-packager" / "bin" / "electron-packager.js"
TEST_RUNNER = PROJECT_ROOT / "tests" / "run_tests.mjs"
ASSETS_DIR = PROJECT_ROOT / "assets"

# Enable VT100 colors on Windows console if available
if sys.platform == "win32":
    os.system("")

# Terminal styling
class Colors:
    HEADER = "\033[95m"
    BLUE = "\033[94m"
    CYAN = "\033[96m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    BOLD = "\033[1m"
    RESET = "\033[0m"


def log_step(title: str):
    print(f"\n{Colors.BOLD}{Colors.CYAN}> {title}{Colors.RESET}")


def log_success(msg: str):
    print(f"{Colors.BOLD}{Colors.GREEN}[OK] {msg}{Colors.RESET}")


def log_warning(msg: str):
    print(f"{Colors.BOLD}{Colors.YELLOW}[WARN] {msg}{Colors.RESET}")


def log_error(msg: str):
    print(f"{Colors.BOLD}{Colors.RED}[ERROR] {msg}{Colors.RESET}")


def run_command(cmd, cwd=PROJECT_ROOT, check=True, capture_output=False, shell=False):
    """Run a system command with error handling."""
    if isinstance(cmd, list):
        display_cmd = " ".join(str(x) for x in cmd)
    else:
        display_cmd = str(cmd)
    
    print(f"{Colors.BLUE}$ {display_cmd}{Colors.RESET}")
    result = subprocess.run(
        cmd,
        cwd=cwd,
        check=check,
        shell=shell,
        text=True,
        capture_output=capture_output
    )
    return result


def is_wsl() -> bool:
    """Detect if running inside Windows Subsystem for Linux (WSL)."""
    if sys.platform != "linux":
        return False
    try:
        proc_ver = Path("/proc/version")
        if proc_ver.exists():
            content = proc_ver.read_text().lower()
            if "microsoft" in content or "wsl" in content:
                return True
    except Exception:
        pass
    return shutil.which("cmd.exe") is not None


def stop_running_instances():
    """Kill any running DesktopPet instances to avoid file lock issues during rebuild."""
    log_step("Terminating any running DesktopPet instances...")
    if sys.platform == "win32":
        try:
            cmd = ["taskkill", "/F", "/IM", "DesktopPet.exe", "/T"]
            res = subprocess.run(cmd, capture_output=True, text=True)
            if res.returncode == 0:
                log_success("Terminated active DesktopPet.exe process(es).")
            else:
                print("  No running DesktopPet.exe processes detected.")
        except Exception:
            ps_cmd = 'Get-Process | Where-Object { $_.Path -like "*DesktopPet*" } | Stop-Process -Force -ErrorAction SilentlyContinue'
            subprocess.run(["powershell", "-NoProfile", "-Command", ps_cmd], capture_output=True)
            print("  Process cleanup completed via PowerShell.")
    elif is_wsl() and shutil.which("cmd.exe"):
        # Running from WSL: call Windows taskkill via cmd.exe
        subprocess.run(["cmd.exe", "/c", "taskkill /F /IM DesktopPet.exe /T"], capture_output=True)
        print("  Checked/terminated DesktopPet.exe via Windows host.")
    else:
        try:
            subprocess.run(["pkill", "-f", "DesktopPet"], capture_output=True)
        except Exception:
            pass


def check_and_install_dependencies(force_install=False):
    """Ensure node_modules and electron-packager exist, or run npm install."""
    log_step("Checking development dependencies...")
    node_modules = PROJECT_ROOT / "node_modules"
    
    if force_install or not node_modules.exists() or not PACKAGER_BIN.exists():
        print("  Running 'npm install' to ensure all build dependencies are present...")
        run_command(["npm", "install"], shell=(sys.platform == "win32"))
        log_success("Dependencies installed successfully.")
    else:
        log_success("All node dependencies and electron-packager are present.")


def ensure_ollama_daemon():
    """Verify local Ollama LLM service is running and model llama3.2 is available."""
    log_step("Verifying Local Neural LLM Service (Ollama @ 127.0.0.1:11434)...")
    import urllib.request
    import json

    ollama_ready = False
    try:
        req = urllib.request.Request("http://127.0.0.1:11434/api/tags")
        with urllib.request.urlopen(req, timeout=1.5) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                models = [m.get("name", "") for m in data.get("models", [])]
                log_success(f"Local Ollama is online. Installed models: {', '.join(models) if models else 'None'}")
                if any("llama3.2" in m for m in models):
                    log_success("Primary text LLM model 'llama3.2' is active and ready.")
                else:
                    log_warning("Model 'llama3.2' not found. Run 'ollama run llama3.2' to download.")
                ollama_ready = True
    except Exception:
        ollama_ready = False

    if not ollama_ready:
        print("  Local Ollama daemon is offline. Attempting to start background service...")
        ollama_bin = shutil.which("ollama") or shutil.which("ollama.exe")
        if not ollama_bin and sys.platform == "win32":
            local_app = os.environ.get("LOCALAPPDATA", "")
            candidate = Path(local_app) / "Programs" / "Ollama" / "ollama.exe"
            if candidate.exists():
                ollama_bin = str(candidate)

        if ollama_bin:
            try:
                env = os.environ.copy()
                env["OLLAMA_HOST"] = "127.0.0.1:11434"
                env["OLLAMA_ORIGINS"] = "*"
                if sys.platform == "win32":
                    subprocess.Popen(
                        [ollama_bin, "serve"],
                        env=env,
                        creationflags=subprocess.DETACHED_PROCESS | getattr(subprocess, "CREATE_NO_WINDOW", 0x08000000)
                    )
                else:
                    subprocess.Popen([ollama_bin, "serve"], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                log_success("Auto-started Ollama background daemon on 127.0.0.1:11434.")
            except Exception as e:
                log_warning(f"Could not auto-start Ollama: {e}")
        elif is_wsl() and shutil.which("cmd.exe"):
            try:
                subprocess.Popen(["cmd.exe", "/c", "start /b ollama serve"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                log_success("Auto-started Ollama daemon on Windows host via WSL bridge.")
            except Exception:
                log_warning("To enable local LLM in WSL, start Ollama on Windows or run 'ollama serve'.")
        else:
            log_warning("Ollama executable not detected. Local LLM will use built-in offline rule engine fallback.")


def run_unit_tests():
    """Run automated 18-suite unit tests (README.md section 3)."""
    log_step("Running Automated Unit Tests (18 Suites)...")
    if not TEST_RUNNER.exists():
        log_warning(f"Test runner not found at {TEST_RUNNER}. Skipping tests.")
        return True

    try:
        run_command(["node", str(TEST_RUNNER)])
        log_success("All unit test suites passed cleanly (100% SUCCESS).")
        return True
    except subprocess.CalledProcessError as err:
        log_error(f"Unit tests failed with exit code {err.returncode}!")
        return False


def build_package(platform="win32"):
    """Package standalone executable using electron-packager per README.md."""
    log_step(f"Packaging standalone binary for platform '{platform}'...")
    
    if not PACKAGER_BIN.exists():
        raise FileNotFoundError(
            f"electron-packager executable not found at {PACKAGER_BIN}. "
            "Please run 'npm install' first."
        )

    # When packaging for Windows from WSL, running Linux node causes rcedit-x64.exe
    # to receive Linux /tmp paths which Windows NT cannot resolve.
    # We seamlessly bridge to the Windows host via cmd.exe.
    if platform == "win32" and is_wsl() and shutil.which("cmd.exe"):
        print("  WSL environment detected! Using Windows host bridge to package win32 binary cleanly...")
        win_cmd = (
            'node ./node_modules/electron-packager/bin/electron-packager.js . DesktopPet '
            '--platform=win32 --arch=x64 --ignore="DesktopPet-win32-x64|build_tmp|tests|\\.git" --overwrite'
        )
        try:
            run_command(["cmd.exe", "/c", win_cmd])
            log_success("electron-packager completed successfully via Windows host bridge.")
            return
        except subprocess.CalledProcessError as e:
            log_warning(f"Windows host bridge packager attempt returned {e.returncode}. Falling back to standard runner...")

    # Canonical packaging with lock-resilient staging
    output_folder_name = f"DesktopPet-{platform}-x64"
    target_dir = PROJECT_ROOT / output_folder_name
    tmp_out = PROJECT_ROOT / "build_tmp"

    packager_args = [
        "node",
        str(PACKAGER_BIN),
        ".",
        "DesktopPet",
        f"--platform={platform}",
        "--arch=x64",
        "--out=build_tmp",
        f"--ignore={output_folder_name}|build_tmp|tests|\\.git",
        "--overwrite"
    ]

    run_command(packager_args)
    log_success("electron-packager completed successfully.")

    # Synchronize from build_tmp stage into canonical output directory
    packaged_source = tmp_out / output_folder_name
    if packaged_source.exists():
        target_dir.mkdir(parents=True, exist_ok=True)
        for item in packaged_source.rglob("*"):
            rel = item.relative_to(packaged_source)
            dest = target_dir / rel
            if item.is_dir():
                dest.mkdir(parents=True, exist_ok=True)
            else:
                dest.parent.mkdir(parents=True, exist_ok=True)
                try:
                    shutil.copy2(item, dest)
                except Exception:
                    pass
        log_success(f"Synchronized packaged artifacts into {output_folder_name}/.")
        try:
            shutil.rmtree(tmp_out, ignore_errors=True)
        except Exception:
            pass


def deploy_steam_appid(platform="win32"):
    """Copy steam_appid.txt to the output directory per README.md instructions."""
    log_step("Deploying Steam Overlay configuration (steam_appid.txt)...")
    if not STEAM_APP_ID.exists():
        log_warning(f"{STEAM_APP_ID} not found. Creating default steam_appid.txt (480)...")
        STEAM_APP_ID.write_text("480\n", encoding="utf-8")

    dest_dir = PROJECT_ROOT / f"DesktopPet-{platform}-x64"
    dest = dest_dir / "steam_appid.txt"
    if dest_dir.exists():
        shutil.copy2(STEAM_APP_ID, dest)
        log_success(f"Copied {STEAM_APP_ID.name} -> {dest.relative_to(PROJECT_ROOT)}")


def clean_assets_directory():
    """Cold-boot testing: clean assets/ folder as per AGENTS.md clean state testing."""
    log_step("Performing Cold-Boot Assets Wipe (assets/)...")
    if ASSETS_DIR.exists():
        try:
            shutil.rmtree(ASSETS_DIR)
            log_success("assets/ folder removed for cold-boot testing.")
        except Exception as e:
            log_warning(f"Failed to remove assets/ folder: {e}")
    else:
        print("  assets/ folder does not exist; already clean.")


def verify_build(platform="win32"):
    """Verify generated executable and directory structure."""
    log_step("Verifying packaged build artifacts...")
    output_dir = PROJECT_ROOT / f"DesktopPet-{platform}-x64"
    exe_name = "DesktopPet.exe" if platform == "win32" else "DesktopPet"
    executable_path = output_dir / exe_name

    if not output_dir.exists():
        log_error(f"Output directory does not exist: {output_dir}")
        return False

    if not executable_path.exists():
        log_error(f"Main executable does not exist: {executable_path}")
        return False

    steam_txt = output_dir / "steam_appid.txt"
    if not steam_txt.exists():
        log_warning(f"Missing steam_appid.txt in {output_dir}")

    app_resources = output_dir / "resources" / "app"
    if not app_resources.exists():
        log_error(f"Missing packaged application resources at {app_resources}")
        return False

    exe_size_mb = executable_path.stat().st_size / (1024 * 1024)
    log_success(f"Verified: {executable_path.name} ({exe_size_mb:.2f} MB)")
    if steam_txt.exists():
        log_success(f"Verified: {steam_txt.name}")
    log_success(f"Verified: {app_resources.relative_to(output_dir)}/")
    return True


def launch_executable(platform="win32"):
    """Launch the rebuilt standalone application."""
    log_step("Launching standalone application...")
    output_dir = PROJECT_ROOT / f"DesktopPet-{platform}-x64"
    exe_name = "DesktopPet.exe" if platform == "win32" else "DesktopPet"
    executable_path = output_dir / exe_name

    if not executable_path.exists():
        log_error(f"Cannot launch: {executable_path} does not exist.")
        return False

    print(f"{Colors.GREEN}Starting {executable_path}...{Colors.RESET}")
    if sys.platform == "win32":
        subprocess.Popen([str(executable_path)], cwd=str(output_dir), creationflags=subprocess.DETACHED_PROCESS)
    elif is_wsl() and shutil.which("cmd.exe") and platform == "win32":
        subprocess.Popen(["cmd.exe", "/c", f"start {exe_name}"], cwd=str(output_dir))
    else:
        subprocess.Popen([str(executable_path)], cwd=str(output_dir))
    log_success(f"{exe_name} launched successfully.")
    return True


def main():
    parser = argparse.ArgumentParser(
        description="Desktop 3D Display & MascotCaption Canonical Rebuild Pipeline"
    )
    parser.add_argument(
        "--platform",
        choices=["win32", "linux"],
        default="win32",
        help="Target platform to package (default: win32)."
    )
    parser.add_argument(
        "--skip-tests",
        action="store_true",
        help="Skip running the 18 automated unit test suites."
    )
    parser.add_argument(
        "--install-deps",
        action="store_true",
        help="Run 'npm install' before rebuilding."
    )
    parser.add_argument(
        "--clean-assets",
        action="store_true",
        help="Clean the assets/ directory to test cold-boot asset regeneration."
    )
    parser.add_argument(
        "--launch", "-l",
        action="store_true",
        help="Launch application immediately upon successful build."
    )

    args = parser.parse_args()

    print(f"\n{Colors.BOLD}{Colors.HEADER}========================================================")
    print(f"  Desktop 3D Display & Companion - Rebuild Pipeline ({args.platform})")
    print("========================================================\n" + Colors.RESET)

    # Step 1: Terminate running instances
    stop_running_instances()

    # Step 2: Check / install dependencies
    check_and_install_dependencies(force_install=args.install_deps)

    # Step 3: Ensure Ollama LLM service is running
    ensure_ollama_daemon()

    # Step 4: Run unit tests if not skipped
    if not args.skip_tests:
        test_passed = run_unit_tests()
        if not test_passed:
            log_error("Aborting build due to unit test failures.")
            sys.exit(1)
    else:
        log_warning("Unit tests skipped (--skip-tests).")

    # Step 4: Package standalone binary
    try:
        build_package(platform=args.platform)
    except Exception as e:
        log_error(f"Packaging failed: {e}")
        sys.exit(1)

    # Step 5: Copy steam_appid.txt
    deploy_steam_appid(platform=args.platform)

    # Step 6: Verify build artifacts
    if not verify_build(platform=args.platform):
        log_error("Build verification failed.")
        sys.exit(1)

    # Step 7: Clean assets if requested
    if args.clean_assets:
        clean_assets_directory()

    out_folder = f"DesktopPet-{args.platform}-x64"
    print(f"\n{Colors.BOLD}{Colors.GREEN}========================================================")
    print(f"  REBUILD COMPLETE! Output ready at: {out_folder}/")
    print(f"========================================================\n{Colors.RESET}")

    # Step 8: Launch if requested
    if args.launch:
        launch_executable(platform=args.platform)


if __name__ == "__main__":
    main()
