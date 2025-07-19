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
   RCONPassword=YourSecurePassword
   ```

2. **Default RCON Port**
   - The default RCON port for Ark Ascended is typically `32330`
   - Make sure this port is open in your firewall

3. **RCON Password**
   - Use a strong, secure password
   - This password will be used to connect from the web app

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

### Common Ark Commands

Here are some useful RCON commands for Ark Ascended:

- `listplayers` - List all connected players
- `saveworld` - Save the current world
- `broadcast <message>` - Send a message to all players
- `kickplayer <steamid>` - Kick a player by Steam ID
- `banplayer <steamid>` - Ban a player by Steam ID
- `shutdown` - Shutdown the server
- `restart` - Restart the server
- `setcheatplayer true` - Enable cheat mode for admin
- `god` - Toggle god mode
- `fly` - Toggle fly mode

## Development

### Running in Development Mode

```bash
npm run dev
```

This will start the server with nodemon for automatic restarts when files change.

### Project Structure

```
ArkRconAdmin-New/
├── server.js          # Main server file
├── package.json       # Dependencies and scripts
├── public/            # Frontend files
│   ├── index.html     # Main HTML page
│   ├── styles.css     # CSS styles
│   └── script.js      # Frontend JavaScript
└── README.md          # This file
```

### API Endpoints

- `GET /api/servers` - Get all servers
- `POST /api/servers` - Add a new server
- `DELETE /api/servers/:id` - Remove a server
- `POST /api/servers/:id/connect` - Connect to a server
- `POST /api/servers/:id/disconnect` - Disconnect from a server
- `POST /api/servers/:id/command` - Send a command to a server

## Security Considerations

- **RCON Password**: Use strong, unique passwords for each server
- **Network Security**: Ensure RCON port is only accessible from trusted networks
- **Firewall**: Configure your firewall to only allow RCON connections from authorized IPs
- **HTTPS**: For production use, consider adding HTTPS support

## Troubleshooting

### Connection Issues

1. **Check RCON Settings**: Verify RCON is enabled and the port/password are correct
2. **Firewall**: Ensure the RCON port is open in your firewall
3. **Network**: Check if the server IP is accessible from your network
4. **Server Status**: Make sure your Ark server is running

### Common Errors

- **"Connection refused"**: Server is not running or RCON is disabled
- **"Authentication failed"**: Incorrect RCON password
- **"Timeout"**: Network issues or server is overloaded

## Contributing

Feel free to submit issues, feature requests, or pull requests to improve this application.

## License

This project is licensed under the MIT License.

## Support

If you encounter any issues or have questions, please check the troubleshooting section above or create an issue in the project repository. 