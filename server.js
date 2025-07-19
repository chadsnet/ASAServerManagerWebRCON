const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const net = require('net');
const path = require('path');
const fs = require('fs-extra');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Store connected servers
const servers = new Map();
const DATA_FILE = path.join(__dirname, 'data', 'servers.json');

// Ensure data directory exists
fs.ensureDirSync(path.dirname(DATA_FILE));

// Load servers from file
function loadServersFromFile() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readJsonSync(DATA_FILE);
      servers.clear();
      data.forEach(server => {
        servers.set(server.id, server);
      });
      console.log(`Loaded ${servers.size} servers from file`);
    }
  } catch (error) {
    console.error('Error loading servers from file:', error);
  }
}

// Save servers to file
function saveServersToFile() {
  try {
    const serverList = Array.from(servers.values());
    fs.writeJsonSync(DATA_FILE, serverList, { spaces: 2 });
    console.log(`Saved ${serverList.length} servers to file`);
  } catch (error) {
    console.error('Error saving servers to file:', error);
  }
}

// Create backup of servers data
function createBackup() {
  try {
    const backupFile = path.join(__dirname, 'data', `servers_backup_${Date.now()}.json`);
    const serverList = Array.from(servers.values());
    fs.writeJsonSync(backupFile, serverList, { spaces: 2 });
    console.log(`Backup created: ${backupFile}`);
    return backupFile;
  } catch (error) {
    console.error('Error creating backup:', error);
    return null;
  }
}

// Restore servers from backup
function restoreFromBackup(backupFile) {
  try {
    if (fs.existsSync(backupFile)) {
      const data = fs.readJsonSync(backupFile);
      servers.clear();
      data.forEach(server => {
        servers.set(server.id, server);
      });
      saveServersToFile();
      console.log(`Restored ${servers.size} servers from backup`);
      return true;
    }
  } catch (error) {
    console.error('Error restoring from backup:', error);
  }
  return false;
}

// Load servers on startup
loadServersFromFile();

// Custom RCON Client for Ark servers
class ArkRconClient {
  constructor(host, port, password) {
    this.host = host;
    this.port = port;
    this.password = password;
    this.socket = null;
    this.requestId = 0;
    this.pendingRequests = new Map();
    this.authenticated = false;
    this.connected = false;
    this.keepAliveInterval = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.socket = new net.Socket();
      
      this.socket.setTimeout(30000); // 30 second timeout
      
      this.socket.on('connect', () => {
        console.log(`Connected to ${this.host}:${this.port}`);
        this.connected = true;
        this.authenticate(resolve, reject);
      });
      
      this.socket.on('data', (data) => {
        // Reset timeout whenever we receive data
        this.socket.setTimeout(30000);
        this.handleResponse(data);
      });
      
      this.socket.on('error', (error) => {
        console.error('Socket error:', error.message);
        reject(error);
      });
      
      this.socket.on('timeout', () => {
        console.error('Connection timeout');
        this.socket.destroy();
        reject(new Error('Connection timeout'));
      });
      
      this.socket.on('close', () => {
        console.log('Connection closed');
        this.connected = false;
        this.authenticated = false;
        // Reject any pending requests
        for (const [requestId, pending] of this.pendingRequests) {
          pending.reject(new Error('Connection closed'));
        }
        this.pendingRequests.clear();
        // Broadcast status update when connection is lost
        broadcastServerStatus();
      });
      
      this.socket.connect(this.port, this.host);
    });
  }

  authenticate(resolve, reject) {
    const requestId = ++this.requestId;
    const packet = this.createPacket(requestId, 3, this.password); // 3 = SERVERDATA_AUTH
    
    console.log(`Sending authentication packet with ID: ${requestId}`);
    this.pendingRequests.set(requestId, { resolve, reject, type: 'auth' });
    this.socket.write(packet);
  }

  async sendCommand(command) {
    return new Promise((resolve, reject) => {
      if (!this.socket || this.socket.destroyed || !this.connected || !this.authenticated) {
        reject(new Error('Not connected or not authenticated'));
        return;
      }
      
      const requestId = ++this.requestId;
      const packet = this.createPacket(requestId, 2, command); // 2 = SERVERDATA_EXECCOMMAND
      
      console.log(`Sending command packet with ID: ${requestId}, Command: "${command}"`);
      this.pendingRequests.set(requestId, { resolve, reject, type: 'command' });
      
      // Add timeout for command response
      const timeout = setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Command timeout'));
        }
      }, 15000); // 15 second timeout
      
      // Store timeout with the request
      this.pendingRequests.get(requestId).timeout = timeout;
      
      this.socket.write(packet);
    });
  }

  createPacket(requestId, type, payload) {
    const buffer = Buffer.from(payload, 'utf8');
    const packet = Buffer.alloc(14 + buffer.length);
    
    // Packet size (4 bytes)
    packet.writeUInt32LE(10 + buffer.length, 0);
    // Request ID (4 bytes)
    packet.writeUInt32LE(requestId, 4);
    // Type (4 bytes)
    packet.writeUInt32LE(type, 8);
    // Payload
    buffer.copy(packet, 12);
    // Null terminators
    packet.writeUInt8(0, 12 + buffer.length);
    packet.writeUInt8(0, 13 + buffer.length);
    
    return packet;
  }

  handleResponse(data) {
    let offset = 0;
    
    while (offset < data.length) {
      if (offset + 4 > data.length) break;
      
      const packetSize = data.readUInt32LE(offset);
      if (offset + packetSize + 4 > data.length) break;
      
      const requestId = data.readUInt32LE(offset + 4);
      const type = data.readUInt32LE(offset + 8);
      const payload = data.toString('utf8', offset + 12, offset + 4 + packetSize - 2);
      
      console.log(`Received packet: ID=${requestId}, Type=${type}, Payload="${payload}"`);
      
      const pending = this.pendingRequests.get(requestId);
      if (pending) {
        // Clear timeout if it exists
        if (pending.timeout) {
          clearTimeout(pending.timeout);
        }
        this.pendingRequests.delete(requestId);
        
        if (type === 2) { // SERVERDATA_AUTH_RESPONSE
          if (requestId === -1) {
            this.authenticated = false;
            pending.reject(new Error('Authentication failed'));
                  } else {
          this.authenticated = true;
          console.log('Authentication successful');
          this.startKeepAlive();
          pending.resolve('Authenticated successfully');
        }
        } else if (type === 0) { // SERVERDATA_RESPONSE_VALUE
          if (pending) {
            console.log(`Command response received: "${payload}"`);
            pending.resolve(payload);
          } else {
            // This is likely a keep-alive response
            console.log(`Keep-alive response: "${payload}"`);
          }
        }
      }
      
      offset += 4 + packetSize;
    }
  }

  startKeepAlive() {
    // Send a keep-alive ping every 20 seconds
    this.keepAliveInterval = setInterval(() => {
      if (this.connected && this.authenticated) {
        console.log('Sending keep-alive ping...');
        try {
          const requestId = ++this.requestId;
          const packet = this.createPacket(requestId, 2, 'ping'); // Use ping command
          // Don't add to pending requests for keep-alive
          this.socket.write(packet);
          // Reset the socket timeout after sending keep-alive
          this.socket.setTimeout(30000);
        } catch (error) {
          console.error('Keep-alive failed:', error.message);
          this.disconnect();
        }
      }
    }, 20000); // 20 seconds
  }

  stopKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  disconnect() {
    this.stopKeepAlive();
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.connected = false;
    this.authenticated = false;
    this.pendingRequests.clear();
  }
}

// RCON connection manager
class RconManager {
  constructor() {
    this.connections = new Map();
  }

  async connect(serverId, host, port, password) {
    try {
      const rcon = new ArkRconClient(host, parseInt(port), password);
      await rcon.connect();
      this.connections.set(serverId, rcon);
      
      console.log(`Connected to server ${serverId} at ${host}:${port}`);
      broadcastServerStatus(); // Broadcast status update
      return { success: true, message: 'Connected successfully' };
    } catch (error) {
      console.error(`Failed to connect to server ${serverId}:`, error.message);
      return { success: false, message: error.message };
    }
  }

  async disconnect(serverId) {
    const rcon = this.connections.get(serverId);
    if (rcon) {
      try {
        rcon.disconnect();
        this.connections.delete(serverId);
        console.log(`Disconnected from server ${serverId}`);
        broadcastServerStatus(); // Broadcast status update
        return { success: true, message: 'Disconnected successfully' };
      } catch (error) {
        console.error(`Error disconnecting from server ${serverId}:`, error.message);
        return { success: false, message: error.message };
      }
    }
    return { success: false, message: 'Server not connected' };
  }

  async sendCommand(serverId, command) {
    const rcon = this.connections.get(serverId);
    if (!rcon) {
      return { success: false, message: 'Server not connected' };
    }

    try {
      // Check if connection is still valid
      if (!rcon.connected || !rcon.authenticated) {
        console.log(`Connection lost for server ${serverId}`);
        // Remove the old connection
        this.connections.delete(serverId);
        return { success: false, message: 'Connection lost. Please reconnect to the server.' };
      }

      const response = await rcon.sendCommand(command);
      return { success: true, response: response || 'Command executed successfully' };
    } catch (error) {
      console.error(`Error sending command to server ${serverId}:`, error.message);
      
      // Only remove connection for specific error types
      if (error.message.includes('Not connected') || 
          error.message.includes('Connection closed') ||
          error.message.includes('Command timeout')) {
        console.log(`Removing broken connection for server ${serverId}`);
        this.connections.delete(serverId);
        broadcastServerStatus(); // Broadcast status update
        return { success: false, message: 'Connection lost. Please reconnect to the server.' };
      }
      
      return { success: false, message: error.message };
    }
  }

  isConnected(serverId) {
    const rcon = this.connections.get(serverId);
    if (!rcon) {
      return false;
    }
    
    // Check if the connection is actually still valid
    if (!rcon.connected || !rcon.authenticated || !rcon.socket || rcon.socket.destroyed) {
      // Remove the broken connection
      this.connections.delete(serverId);
      broadcastServerStatus();
      return false;
    }
    
    return true;
  }

  // Force cleanup of all broken connections
  cleanupBrokenConnections() {
    const serverIds = Array.from(this.connections.keys());
    let cleanedUp = false;
    
    serverIds.forEach(serverId => {
      if (!this.isConnected(serverId)) {
        cleanedUp = true;
      }
    });
    
    if (cleanedUp) {
      broadcastServerStatus();
    }
  }
}

const rconManager = new RconManager();

// Periodic connection health check
setInterval(() => {
  const serverList = Array.from(servers.values());
  let statusChanged = false;
  
  serverList.forEach(server => {
    const wasConnected = rconManager.isConnected(server.id);
    // This will trigger the improved isConnected check
    const isConnected = rconManager.isConnected(server.id);
    
    if (wasConnected !== isConnected) {
      statusChanged = true;
      console.log(`Server ${server.name} connection status changed: ${wasConnected} -> ${isConnected}`);
    }
  });
  
  if (statusChanged) {
    broadcastServerStatus();
  }
}, 5000); // Check every 5 seconds

// API Routes
app.get('/api/servers', (req, res) => {
  const serverList = Array.from(servers.values()).map(server => ({
    id: server.id,
    name: server.name,
    host: server.host,
    port: server.port,
    connected: rconManager.isConnected(server.id)
  }));
  res.json(serverList);
});

app.post('/api/servers', (req, res) => {
  const { name, host, port, password } = req.body;
  
  if (!name || !host || !port || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const serverId = Date.now().toString();
  const server = {
    id: serverId,
    name,
    host,
    port: parseInt(port),
    password
  };

  servers.set(serverId, server);
  saveServersToFile(); // Save to file
  res.json({ success: true, server });
});

app.delete('/api/servers/:id', async (req, res) => {
  const serverId = req.params.id;
  
  // Disconnect if connected
  await rconManager.disconnect(serverId);
  
  // Remove from servers list
  const removed = servers.delete(serverId);
  
  if (removed) {
    saveServersToFile(); // Save to file
    res.json({ success: true, message: 'Server removed successfully' });
  } else {
    res.status(404).json({ error: 'Server not found' });
  }
});

// Update server information
app.put('/api/servers/:id', (req, res) => {
  const serverId = req.params.id;
  const { name, host, port, password } = req.body;
  
  const server = servers.get(serverId);
  if (!server) {
    return res.status(404).json({ error: 'Server not found' });
  }
  
  // Update server information
  if (name) server.name = name;
  if (host) server.host = host;
  if (port) server.port = parseInt(port);
  if (password) server.password = password;
  
  saveServersToFile(); // Save to file
  res.json({ success: true, server });
});

app.post('/api/servers/:id/connect', async (req, res) => {
  const serverId = req.params.id;
  const server = servers.get(serverId);
  
  if (!server) {
    return res.status(404).json({ error: 'Server not found' });
  }

  // If already connected, disconnect first
  if (rconManager.isConnected(serverId)) {
    console.log(`Server ${server.name} is already connected, disconnecting first...`);
    await rconManager.disconnect(serverId);
  }

  console.log(`Attempting to connect to server: ${server.name} at ${server.host}:${server.port}`);
  
  try {
    const result = await rconManager.connect(serverId, server.host, server.port, server.password);
    console.log(`Connection result for ${server.name}:`, result);
    res.json(result);
  } catch (error) {
    console.error(`Unexpected error connecting to server ${serverId}:`, error);
    res.json({ success: false, message: 'Unexpected error during connection' });
  }
});

app.post('/api/servers/:id/disconnect', async (req, res) => {
  const serverId = req.params.id;
  
  // Check if the server is actually connected
  if (!rconManager.isConnected(serverId)) {
    // If not connected, just remove any broken connection and return success
    const rcon = rconManager.connections.get(serverId);
    if (rcon) {
      rcon.disconnect();
      rconManager.connections.delete(serverId);
      broadcastServerStatus();
    }
    res.json({ success: true, message: 'Server was already disconnected' });
    return;
  }
  
  const result = await rconManager.disconnect(serverId);
  res.json(result);
});

app.post('/api/servers/:id/command', async (req, res) => {
  const serverId = req.params.id;
  const { command } = req.body;
  
  if (!command) {
    return res.status(400).json({ error: 'Command is required' });
  }

  const result = await rconManager.sendCommand(serverId, command);
  res.json(result);
});

// Force refresh server status
app.post('/api/servers/refresh-status', (req, res) => {
  rconManager.cleanupBrokenConnections();
  res.json({ success: true, message: 'Server status refreshed' });
});

// Send command to all connected servers
app.post('/api/servers/command-all', async (req, res) => {
  const { command } = req.body;
  
  if (!command) {
    return res.status(400).json({ error: 'Command is required' });
  }

  const connectedServers = Array.from(servers.values()).filter(server => 
    rconManager.isConnected(server.id)
  );

  if (connectedServers.length === 0) {
    return res.json({ 
      success: false, 
      message: 'No servers are currently connected' 
    });
  }

  const results = [];
  
  for (const server of connectedServers) {
    try {
      const result = await rconManager.sendCommand(server.id, command);
      results.push({
        serverName: server.name,
        success: result.success,
        response: result.response,
        message: result.message
      });
    } catch (error) {
      results.push({
        serverName: server.name,
        success: false,
        response: null,
        message: error.message
      });
    }
  }

  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;

  res.json({
    success: true,
    message: `Command sent to ${successCount}/${totalCount} servers`,
    results: results
  });
});

// Create backup
app.post('/api/servers/backup', (req, res) => {
  const backupFile = createBackup();
  if (backupFile) {
    res.json({ success: true, message: 'Backup created successfully', backupFile });
  } else {
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

// Restore from backup
app.post('/api/servers/restore', (req, res) => {
  const { backupFile } = req.body;
  if (!backupFile) {
    return res.status(400).json({ error: 'Backup file path is required' });
  }
  
  const success = restoreFromBackup(backupFile);
  if (success) {
    broadcastServerStatus(); // Update UI
    res.json({ success: true, message: 'Restored from backup successfully' });
  } else {
    res.status(500).json({ error: 'Failed to restore from backup' });
  }
});

// Socket.IO events
io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Function to broadcast server status updates to all connected clients
function broadcastServerStatus() {
  const serverList = Array.from(servers.values()).map(server => ({
    id: server.id,
    name: server.name,
    host: server.host,
    port: server.port,
    connected: rconManager.isConnected(server.id)
  }));
  
  io.emit('serverStatusUpdate', serverList);
}

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
  console.log(`Loaded ${servers.size} saved servers`);
}); 