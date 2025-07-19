// Global variables
let servers = [];
let selectedServerId = null;

// DOM elements
const serversGrid = document.getElementById('serversGrid');
const selectedServerSelect = document.getElementById('selectedServer');
const commandInput = document.getElementById('commandInput');
const sendCommandBtn = document.getElementById('sendCommand');
const sendToAllBtn = document.getElementById('sendToAll');
const consoleOutput = document.getElementById('consoleOutput');
const addServerModal = document.getElementById('addServerModal');
const confirmModal = document.getElementById('confirmModal');
const addServerForm = document.getElementById('addServerForm');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadServers();
    setupEventListeners();
    setupSocketIO();
    addConsoleMessage('System', 'Application loaded successfully', 'success');
});

// Socket.IO setup
function setupSocketIO() {
    const socket = io();
    
    socket.on('serverStatusUpdate', function(serverList) {
        console.log('Received server status update:', serverList);
        servers = serverList;
        renderServers();
        updateServerSelect();
        updateCommandInputState();
    });
}

// Event listeners setup
function setupEventListeners() {
    // Add server form submission
    addServerForm.addEventListener('submit', handleAddServer);
    
    // Command input
    commandInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            if (selectedServerId) {
                sendCommand();
            } else {
                sendToAllConnected();
            }
        }
    });
    
    // Send command button
    sendCommandBtn.addEventListener('click', sendCommand);
    
    // Send to all connected button
    sendToAllBtn.addEventListener('click', sendToAllConnected);
    
    // Server selection change
    selectedServerSelect.addEventListener('change', function() {
        selectedServerId = this.value;
        updateCommandInputState();
    });
    
    // Modal close events
    window.addEventListener('click', function(e) {
        if (e.target === addServerModal) {
            closeAddServerModal();
        }
        if (e.target === confirmModal) {
            closeConfirmModal();
        }
    });
}

// API Functions
async function loadServers() {
    try {
        const response = await fetch('/api/servers');
        const data = await response.json();
        servers = data;
        renderServers();
        updateServerSelect();
    } catch (error) {
        console.error('Error loading servers:', error);
        addConsoleMessage('Error', 'Failed to load servers', 'error');
    }
}

async function addServer(serverData) {
    try {
        const response = await fetch('/api/servers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(serverData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            addConsoleMessage('Success', `Server "${serverData.name}" added successfully`, 'success');
            await loadServers();
            closeAddServerModal();
            addServerForm.reset();
        } else {
            addConsoleMessage('Error', result.error || 'Failed to add server', 'error');
        }
    } catch (error) {
        console.error('Error adding server:', error);
        addConsoleMessage('Error', 'Failed to add server', 'error');
    }
}

async function removeServer(serverId) {
    try {
        const response = await fetch(`/api/servers/${serverId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            addConsoleMessage('Success', 'Server removed successfully', 'success');
            await loadServers();
        } else {
            addConsoleMessage('Error', result.error || 'Failed to remove server', 'error');
        }
    } catch (error) {
        console.error('Error removing server:', error);
        addConsoleMessage('Error', 'Failed to remove server', 'error');
    }
}

async function connectToServer(serverId) {
    try {
        const response = await fetch(`/api/servers/${serverId}/connect`, {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            addConsoleMessage('Success', `Connected to server successfully`, 'success');
            // Don't need to reload servers since Socket.IO will update the UI
        } else {
            addConsoleMessage('Error', result.message || 'Failed to connect to server', 'error');
        }
    } catch (error) {
        console.error('Error connecting to server:', error);
        addConsoleMessage('Error', 'Failed to connect to server', 'error');
    }
}

async function disconnectFromServer(serverId) {
    try {
        const response = await fetch(`/api/servers/${serverId}/disconnect`, {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            addConsoleMessage('Success', result.message || 'Disconnected from server successfully', 'success');
            // Don't need to reload servers since Socket.IO will update the UI
        } else {
            addConsoleMessage('Error', result.message || 'Failed to disconnect from server', 'error');
        }
    } catch (error) {
        console.error('Error disconnecting from server:', error);
        addConsoleMessage('Error', 'Failed to disconnect from server', 'error');
    }
}

async function sendCommand() {
    if (!selectedServerId) {
        addConsoleMessage('Error', 'Please select a server first', 'error');
        return;
    }
    
    const command = commandInput.value.trim();
    if (!command) {
        addConsoleMessage('Error', 'Please enter a command', 'error');
        return;
    }
    
    try {
        addConsoleMessage('Command', `Sending command: ${command}`, 'info');
        
        const response = await fetch(`/api/servers/${selectedServerId}/command`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ command })
        });
        
        const result = await response.json();
        
        if (result.success) {
            addConsoleMessage('Response', result.response, 'success');
        } else {
            addConsoleMessage('Error', result.message || 'Command failed', 'error');
        }
        
        commandInput.value = '';
    } catch (error) {
        console.error('Error sending command:', error);
        addConsoleMessage('Error', 'Failed to send command', 'error');
    }
}

async function sendToAllConnected() {
    const command = commandInput.value.trim();
    if (!command) {
        addConsoleMessage('Error', 'Please enter a command', 'error');
        return;
    }
    
    try {
        addConsoleMessage('Command', `Sending command to all connected servers: ${command}`, 'info');
        
        const response = await fetch('/api/servers/command-all', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ command })
        });
        
        const result = await response.json();
        
        if (result.success) {
            addConsoleMessage('Success', result.message, 'success');
            
            // Display individual server results
            result.results.forEach(serverResult => {
                if (serverResult.success) {
                    addConsoleMessage(`[${serverResult.serverName}]`, serverResult.response, 'success');
                } else {
                    addConsoleMessage(`[${serverResult.serverName}]`, serverResult.message, 'error');
                }
            });
        } else {
            addConsoleMessage('Error', result.message || 'Failed to send command to all servers', 'error');
        }
        
        commandInput.value = '';
    } catch (error) {
        console.error('Error sending command to all servers:', error);
        addConsoleMessage('Error', 'Failed to send command to all servers', 'error');
    }
}

// UI Functions
function renderServers() {
    serversGrid.innerHTML = '';
    
    if (servers.length === 0) {
        serversGrid.innerHTML = `
            <div class="server-card" style="grid-column: 1 / -1; text-align: center; opacity: 0.7;">
                <p>No servers added yet. Click "Add Server" to get started.</p>
            </div>
        `;
        return;
    }
    
    servers.forEach(server => {
        const serverCard = document.createElement('div');
        serverCard.className = `server-card ${server.connected ? 'connected' : ''}`;
        serverCard.innerHTML = `
            <div class="server-header">
                <div class="server-name">${server.name}</div>
                <div class="server-status">
                    <div class="status-indicator ${server.connected ? 'connected' : ''}"></div>
                    ${server.connected ? 'Connected' : 'Disconnected'}
                </div>
            </div>
            <div class="server-info">
                <p><strong>Host:</strong> ${server.host}</p>
                <p><strong>Port:</strong> ${server.port}</p>
            </div>
            <div class="server-actions">
                ${server.connected ? 
                    `<button class="btn btn-danger" onclick="disconnectServer('${server.id}')">
                        <i class="fas fa-times"></i> Disconnect
                    </button>` :
                    `<button class="btn btn-success" onclick="connectServer('${server.id}')">
                        <i class="fas fa-plug"></i> Connect
                    </button>`
                }
                <button class="btn btn-secondary" onclick="removeServerConfirm('${server.id}', '${server.name}')">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>
        `;
        serversGrid.appendChild(serverCard);
    });
}

function updateServerSelect() {
    selectedServerSelect.innerHTML = '<option value="">Select a server...</option>';
    
    servers.forEach(server => {
        const option = document.createElement('option');
        option.value = server.id;
        option.textContent = `${server.name} (${server.host}:${server.port})`;
        if (!server.connected) {
            option.textContent += ' - Disconnected';
            option.disabled = true;
        }
        selectedServerSelect.appendChild(option);
    });
}

function updateCommandInputState() {
    const selectedServer = servers.find(s => s.id === selectedServerId);
    const isConnected = selectedServerId && selectedServer?.connected;
    const hasConnectedServers = servers.some(s => s.connected);
    
    // Update individual server command input
    commandInput.disabled = !isConnected && !hasConnectedServers;
    sendCommandBtn.disabled = !isConnected;
    
    // Update "Send to All" button
    sendToAllBtn.disabled = !hasConnectedServers;
    
    if (!selectedServerId) {
        if (hasConnectedServers) {
            commandInput.placeholder = 'Enter command to send to all connected servers...';
        } else {
            commandInput.placeholder = 'Select a server first...';
        }
    } else if (!isConnected) {
        commandInput.placeholder = 'Server disconnected. Please reconnect first...';
    } else {
        commandInput.placeholder = 'Enter RCON command...';
    }
}

function addConsoleMessage(sender, message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'console-message';
    
    const timestamp = new Date().toLocaleTimeString();
    const messageClass = type === 'error' ? 'error' : type === 'success' ? 'success' : '';
    
    messageDiv.innerHTML = `
        <span class="timestamp">[${timestamp}] ${sender}:</span>
        <span class="message ${messageClass}">${message}</span>
    `;
    
    consoleOutput.appendChild(messageDiv);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

// Modal Functions
function showAddServerModal() {
    addServerModal.style.display = 'block';
}

function closeAddServerModal() {
    addServerModal.style.display = 'none';
}

function showConfirmModal(message, onConfirm) {
    document.getElementById('confirmMessage').textContent = message;
    confirmModal.style.display = 'block';
    
    const confirmBtn = document.getElementById('confirmAction');
    confirmBtn.onclick = () => {
        onConfirm();
        closeConfirmModal();
    };
}

function closeConfirmModal() {
    confirmModal.style.display = 'none';
}

// Event Handlers
function handleAddServer(e) {
    e.preventDefault();
    
    const formData = new FormData(addServerForm);
    const serverData = {
        name: formData.get('serverName') || document.getElementById('serverName').value,
        host: formData.get('serverHost') || document.getElementById('serverHost').value,
        port: formData.get('serverPort') || document.getElementById('serverPort').value,
        password: formData.get('serverPassword') || document.getElementById('serverPassword').value
    };
    
    addServer(serverData);
}

function connectServer(serverId) {
    connectToServer(serverId);
}

function disconnectServer(serverId) {
    disconnectFromServer(serverId);
}

function removeServerConfirm(serverId, serverName) {
    showConfirmModal(
        `Are you sure you want to remove the server "${serverName}"? This action cannot be undone.`,
        () => removeServer(serverId)
    );
}

// Quick action function
async function quickAction(command) {
    const connectedServers = servers.filter(s => s.connected);
    
    if (connectedServers.length === 0) {
        addConsoleMessage('Error', 'No servers are currently connected', 'error');
        return;
    }
    
    // For shutdown command, show confirmation
    if (command === 'doexit') {
        const confirmed = confirm('Are you sure you want to shutdown all connected servers? This action cannot be undone.');
        if (!confirmed) {
            return;
        }
    }
    
    try {
        addConsoleMessage('Quick Action', `Executing: ${command}`, 'info');
        
        const response = await fetch('/api/servers/command-all', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ command })
        });
        
        const result = await response.json();
        
        if (result.success) {
            addConsoleMessage('Success', result.message, 'success');
            
            // Display individual server results
            result.results.forEach(serverResult => {
                if (serverResult.success) {
                    addConsoleMessage(`[${serverResult.serverName}]`, serverResult.response, 'success');
                } else {
                    addConsoleMessage(`[${serverResult.serverName}]`, serverResult.message, 'error');
                }
            });
        } else {
            addConsoleMessage('Error', result.message || 'Failed to execute quick action', 'error');
        }
    } catch (error) {
        console.error('Error executing quick action:', error);
        addConsoleMessage('Error', 'Failed to execute quick action', 'error');
    }
}

// Refresh server status
async function refreshServerStatus() {
    try {
        const response = await fetch('/api/servers/refresh-status', {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            addConsoleMessage('System', 'Server status refreshed', 'success');
        } else {
            addConsoleMessage('Error', 'Failed to refresh server status', 'error');
        }
    } catch (error) {
        console.error('Error refreshing server status:', error);
        addConsoleMessage('Error', 'Failed to refresh server status', 'error');
    }
}

// Global functions for onclick handlers
window.showAddServerModal = showAddServerModal;
window.closeAddServerModal = closeAddServerModal;
window.closeConfirmModal = closeConfirmModal;
window.connectServer = connectServer;
window.disconnectServer = disconnectServer;
window.removeServerConfirm = removeServerConfirm;
window.refreshServerStatus = refreshServerStatus;
window.quickAction = quickAction; 