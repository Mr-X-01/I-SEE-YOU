# I-See-You 📸📍

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A web application that captures photos with geolocation data and can optionally send them to a Telegram bot. Built with Node.js, Express, and Python.

## 🌟 Features

- 📸 Capture photos using device camera
- 📍 Get precise geolocation data
- 📱 Mobile-friendly interface
- 🤖 Telegram bot integration for instant notifications
- 📊 Logging system for all captured photos
- 🌐 Simple web interface
- 🚀 Easy to set up and run

## 🛠️ Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)
- Python 3.6+
- Web browser with camera access
- (Optional) Telegram Bot Token for notifications

## 🚀 Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/i-see-you.git
   cd i-see-you
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. (Optional) Set up Telegram bot (if you want notifications):
   - Create a new bot using [@BotFather](https://t.me/botfather) on Telegram
   - Get your chat ID by sending a message to [@userinfobot](https://t.me/userinfobot)
   - Create a `.env` file in the project root with:
     ```
     TELEGRAM_BOT_TOKEN=your_telegram_bot_token
     TELEGRAM_CHAT_ID=your_telegram_chat_id
     ```

## 🏃‍♂️ Running the Application

### Option 1: Using Python Launcher (Recommended)

Basic usage:
```bash
python3 run.py
```

With Telegram bot configuration:
```bash
python3 run.py --bot-token YOUR_BOT_TOKEN --chat-id YOUR_CHAT_ID
```

This will:
1. Check for Node.js installation
2. Install required dependencies
3. Configure Telegram bot (if credentials provided)
4. Start the server
5. Open the application in your default web browser

### Option 2: Manual Start

1. Start the Node.js server:
   ```bash
   npm start
   # or for development with auto-restart:
   # npm run dev
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:8080
   ```

## 📸 How to Use

1. Open the application in your web browser
2. Allow camera and location access when prompted
3. Click the camera button to take a photo
4. The photo along with location data will be saved to the `photos` directory
5. (If configured) You'll receive a notification on Telegram

## 📁 Project Structure

```
i-see-you/
├── public/           # Frontend static files
├── photos/           # Directory for captured photos
├── logs/             # Application logs
├── node_modules/     # Node.js dependencies
├── .gitignore        # Git ignore file
├── package.json      # Node.js project configuration
├── package-lock.json # Dependency lock file
├── server.js         # Backend server code
└── run.py           # Python launcher script
```

## 🔧 Configuration

You can configure the application by setting environment variables:

- `PORT` - Port to run the server on (default: 8080)
- `TELEGRAM_BOT_TOKEN` - Your Telegram bot token (optional)
- `TELEGRAM_CHAT_ID` - Your Telegram chat ID (optional)

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact

For any questions or suggestions, please open an issue or contact the project maintainers.
