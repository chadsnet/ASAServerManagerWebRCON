# Ark RCON Admin

A modern web application for managing Ark Ascended dedicated servers using RCON (Remote Console) protocol. This application provides an intuitive interface to connect to multiple Ark servers, send commands, and monitor responses in real-time.

## Features

- **Multi-Server Management**: Add, remove, and manage multiple Ark servers
- **RCON Connection**: Connect to servers using RCON protocol
- **Command Console**: Send commands and view responses in a real-time console
- **Modern UI**: Beautiful, responsive interface with dark theme
- **Real-time Updates**: Live status updates and command responses
- **Cross-Platform**: Works on Windows, macOS, and Linux

## Prerequisites

- Node.js (version 14 or higher)
- npm (comes with Node.js)
- Ark Ascended dedicated server with RCON enabled

## Installation

1. **Clone or download the project**
   ```bash
   git clone <repository-url>
   cd ArkRconAdmin-New
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the application**
   ```bash
   npm start
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

## Configuration

### Ark Server RCON Setup

To use this application, your Ark Ascended server must have RCON enabled:

1. **Enable RCON in your server configuration**
   - Open your server's `GameUserSettings.ini` file
   - Add or modify the following settings:
   ```ini
   [ServerSettings]
   RCONEnabled=True
   RCONPort=32330
   ```

2. **Default RCON Port**
   - The default RCON port for Ark Ascended is typically `32330`
   - Make sure this port is open in your firewall

3. **RCON Password**
   - Password is just the server admin password

## Usage

### Adding a Server

1. Click the **"Add Server"** button
2. Fill in the server details:
   - **Server Name**: A friendly name for your server
   - **Host/IP**: Your server's IP address or hostname
   - **RCON Port**: The RCON port (default: 32330)
   - **RCON Password**: The password you set in your server config
3. Click **"Add Server"**

### Connecting to a Server

1. Find your server in the server list
2. Click the **"Connect"** button
3. The server card will show a green indicator when connected

### Sending Commands

1. Select a connected server from the dropdown in the Command Console
2. Type your RCON command in the input field
3. Press Enter or click **"Send"**
4. View the response in the console output

