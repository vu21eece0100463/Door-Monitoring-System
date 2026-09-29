# IoT-Based Door Monitoring & Alert System

A real-time IoT-based Door Monitoring and Alert System built using the **Milesight WS301 Magnetic Contact Switch**, **Node-RED**, **MQTT/HiveMQ**, **Node.js**, **Express.js**, **Supabase**, and **React**.

The system monitors the door status in real time, stores door events, displays the information through a web dashboard, and provides a repeating voice warning when the door remains open for a configured period.

---

## 📌 Project Overview

This project connects a physical **Milesight WS301 Magnetic Contact Switch** to a complete IoT monitoring system.

When the door is opened:

1. The Milesight WS301 detects the door status.
2. The sensor data is received through the LoRaWAN/IoT flow.
3. Node-RED processes the sensor data.
4. The processed data is published using MQTT.
5. HiveMQ acts as the MQTT broker.
6. A Node.js/Express backend subscribes to the MQTT topic.
7. Door data is stored in Supabase.
8. The React frontend receives the latest data.
9. The dashboard displays the door status in real time.
10. If the door remains open for 20 seconds, a warning is displayed.
11. A voice message says **"Please close the door."**
12. The voice warning repeats with a 5-second gap until the door is closed.

---

# 🏗️ System Architecture

```text
                    ┌──────────────────────────┐
                    │     Milesight WS301      │
                    │  Magnetic Contact Switch │
                    └────────────┬─────────────┘
                                 │
                                 │ LoRaWAN / IoT
                                 ▼
                    ┌──────────────────────────┐
                    │        Node-RED          │
                    │   Data Processing Flow   │
                    └────────────┬─────────────┘
                                 │
                                 │ MQTT
                                 ▼
                    ┌──────────────────────────┐
                    │         HiveMQ           │
                    │       MQTT Broker        │
                    └────────────┬─────────────┘
                                 │
                                 │ MQTT Subscribe
                                 ▼
                    ┌──────────────────────────┐
                    │     Node.js Backend      │
                    │        Express.js        │
                    └────────────┬─────────────┘
                                 │
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │         Supabase         │
                    │     Database + Realtime  │
                    └────────────┬─────────────┘
                                 │
                                 │ Realtime
                                 ▼
                    ┌──────────────────────────┐
                    │      React Frontend      │
                    │    Monitoring Dashboard  │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │      Door War
                    ning        │


🔧 Technology Stack
Hardware
Milesight WS301 Magnetic Contact Switch
IoT & Communication
LoRaWAN
Node-RED
MQTT
HiveMQ
Backend
Node.js
Express.js
MQTT.js
Database & Cloud
Supabase
Cloud-hosted audio
Frontend
React
Vite
JavaScript
CSS
🚪 Hardware
Milesight WS301

The Milesight WS301 Magnetic Contact Switch is used to detect whether the door is open or closed.

The sensor provides information such as:

Door/magnet status
Battery level
Tamper status

Example open-door message:

{
  "battery": 100,
  "magnet_status": "open",
  "tamper_status": "installed"
}

Example closed-door message:

{
  "battery": 100,
  "magnet_status": "close",
  "tamper_status": "installed"
}
📡 MQTT Communication

HiveMQ is used as the MQTT broker.

The MQTT topic used by this project is:

milesight/ws301/door1

Example MQTT payload:

{
  "device_id": "WS301-868M",
  "magnet_status": "open",
  "battery": 100,
  "tamper_status": "installed"
}
🔄 Node-RED

Node-RED is used to process the data received from the Milesight device and publish the required JSON data to HiveMQ.

Basic flow:

Milesight / LoRa Input
        ↓
Data Processing
        ↓
MQTT Out
        ↓
HiveMQ

MQTT topic:

milesight/ws301/door1
🖥️ Backend

The backend is developed using:

Node.js
Express.js
MQTT.js
Supabase

The backend performs the following functions:

Connects to HiveMQ
Subscribes to the MQTT topic
Receives sensor messages
Processes door status
Records door events
Updates the current door state
Stores data in Supabase
Provides REST API endpoints
Provides warning configuration to the frontend
🌐 Backend API

The backend runs on:

http://localhost:3001
Current Door Status
GET /api/door

Example:

http://localhost:3001/api/door
Door History
GET /api/door/history

Example:

http://localhost:3001/api/door/history
Health Check
GET /api/health

Example:

http://localhost:3001/api/health
Warning Configuration
GET /api/config

Example:

http://localhost:3001/api/config

Example response:

{
  "warningSeconds": 20,
  "warningAudioUrl": "https://your-audio-url/please-close-the-door.mp3"
}
🗄️ Supabase Database

Supabase is used to store the current door state and door event history.

Door State

The current door state contains information such as:

device_id
status
opened_at
last_opened_at
last_closed_at
last_duration_seconds
battery
tamper_status
updated_at
Door Events

Door history contains information such as:

id
device_id
status
event_time
opened_at
closed_at
duration_seconds
battery
tamper_status

This allows the system to maintain a history of door activity.

📊 React Dashboard

The frontend is built using React and Vite.

The dashboard displays:

🚪 Current door status
🔋 Battery percentage
🛠️ Tamper status
🕐 Last opened time
🕐 Last closed time
⏱️ Current open duration
📋 Door event history
⚠️ Door-open warning
🔊 Voice notification
📡 Real-time status updates
🚨 Door Warning System

The system monitors how long the door remains open.

The default warning threshold is:

20 seconds

When the door remains open for 20 seconds or longer, the dashboard displays:

⚠️ Door Open Too Long

Please close the door

The system also plays the configured voice warning.

🔊 Repeating Voice Alert

The voice warning continues until the door is closed.

Current configuration:

Warning after: 20 seconds
Repeat gap: 5 seconds

The behavior is:

Door opens
     ↓
Wait 20 seconds
     ↓
🔊 Please close the door
     ↓
Audio finishes
     ↓
Wait 5 seconds
     ↓
🔊 Please close the door
     ↓
Audio finishes
     ↓
Wait 5 seconds
     ↓
🔊 Please close the door
     ↓
        ...
     ↓
Door closes
     ↓
🔇 Warning stops

The repeat interval can be changed in:

frontend/src/App.jsx

Current value:

const WARNING_REPEAT_GAP_SECONDS = 5;

For example, to use a 10-second gap:

const WARNING_REPEAT_GAP_SECONDS = 10;
🔊 Audio Configuration

The voice warning uses a cloud-hosted audio file.

Example:

WARNING_AUDIO_URL=https://your-audio-host/please-close-the-door.mp3

The audio URL should be directly accessible by the browser.

Before using it in the application, open the audio URL in a browser and verify that the audio plays correctly.

📁 Project Structure
door-monitoring-app/
│
├── README.md
│
├── backend/
│   │
│   ├── node_modules/
│   ├── .env
│   ├── package.json
│   ├── package-lock.json
│   └── server.js
│
└── frontend/
    │
    ├── node_modules/
    ├── public/
    │
    ├── src/
    │   │
    │   ├── assets/
    │   ├── App.jsx
    │   ├── App.css
    │   ├── index.css
    │   ├── main.jsx
    │   ├── style.css
    │   └── supabase.js
    │
    ├── .env
    ├── package.json
    ├── package-lock.json
    ├── index.html
    └── vite.config.js
⚙️ Installation & Setup
1. Clone the Repository
git clone YOUR_GITHUB_REPOSITORY_URL

Go into the project directory:

cd door-monitoring-app
2. Backend Setup

Go to the backend directory:

cd backend

Install dependencies:

npm install
3. Backend Environment Variables

Create:

backend/.env

Add:

PORT=3001

SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SECRET_KEY=YOUR_SUPABASE_SECRET_KEY

MQTT_URL=mqtts://YOUR_HIVEMQ_HOST:8883
MQTT_USERNAME=YOUR_HIVEMQ_USERNAME
MQTT_PASSWORD=YOUR_HIVEMQ_PASSWORD

MQTT_TOPIC=milesight/ws301/door1

DEFAULT_DEVICE_ID=WS301-868M

DOOR_WARNING_SECONDS=20

WARNING_AUDIO_URL=https://YOUR-AUDIO-URL/please-close-the-door.mp3

Replace the placeholder values with your actual configuration.

4. Start the Backend

From the backend directory:

node server.js

Expected output:

Backend running on: http://localhost:3001
Connected to HiveMQ
Subscribed to: milesight/ws301/door1
5. Frontend Setup

Open another terminal.

Go to the frontend directory:

cd frontend

Install dependencies:

npm install
6. Frontend Environment Variables

Create:

frontend/.env

Add:

VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co

VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY

VITE_DEVICE_ID=WS301-868M

VITE_BACKEND_URL=http://localhost:3001
7. Start the Frontend

Run:

npm run dev

Vite will normally provide:

http://localhost:5173

Open the URL in your browser.

🧪 Testing
Test 1 — Door Open

Open the door.

The dashboard should display:

🚪 DOOR OPEN

The open duration should start increasing.

Test 2 — Door Closed

Close the door.

The dashboard should display:

🔒 DOOR CLOSED

The warning should stop.

Test 3 — 20-Second Warning

Open the door and keep it open for at least 20 seconds.

The dashboard should display:

⚠️ Door Open Too Long

Please close the door
Test 4 — Repeating Voice Warning

After 20 seconds, the system plays:

🔊 Please close the door

After the audio finishes, the system waits 5 seconds.

Then it plays:

🔊 Please close the door

The process continues while the door remains open.

Test 5 — Close the Door

Close the door.

The warning audio should stop and the dashboard should return to:

🔒 DOOR CLOSED
🔐 Security

Do not commit sensitive credentials to GitHub.

Add the following to .gitignore:

node_modules/
.env
.env.local
.env.*.local
dist/

Never expose:

MQTT_PASSWORD
SUPABASE_SECRET_KEY
API keys
Access tokens
Private credentials

The Supabase secret/service key must only be used on the backend.

Do not place the Supabase secret key in the React frontend.

📷 Recommended Project Documentation

For project documentation or a portfolio, the following screenshots/photos can be included:

1. Milesight WS301

Photo of the physical Milesight WS301 Magnetic Contact Switch installed on the door.

2. Node-RED Flow

Screenshot showing:

LoRa Input
   ↓
Data Processing
   ↓
MQTT Out
3. HiveMQ MQTT

Screenshot showing the MQTT topic and message flow.

Example topic:

milesight/ws301/door1
4. Backend

Screenshot showing the Node.js backend connected to HiveMQ and receiving messages.

5. React Dashboard

Screenshot showing:

Door status
Battery
Tamper status
Door history
Open duration
6. Warning Screen

Screenshot showing:

⚠️ Door Open Too Long

Please close the door
7. System Architecture

Include the complete architecture:

Milesight WS301
       ↓
Node-RED
       ↓
HiveMQ MQTT
       ↓
Node.js
       ↓
Supabase
       ↓
React
       ↓
Voice Alert
🎯 Project Objective

The objective of this project is to develop a complete real-time IoT monitoring solution using a physical door sensor and modern software technologies.

The system demonstrates the complete flow:

Physical Sensor
       ↓
IoT Communication
       ↓
Node-RED
       ↓
MQTT
       ↓
HiveMQ
       ↓
Node.js Backend
       ↓
Supabase
       ↓
React Dashboard
       ↓
Real-Time Monitoring
       ↓
Automated Voice Alert
💡 Key Features
Real-time door monitoring
Milesight WS301 integration
Door open/close detection
Battery monitoring
Tamper status monitoring
MQTT communication
HiveMQ MQTT broker
Node-RED data processing
Node.js backend
Express REST API
Supabase database
Supabase real-time updates
React dashboard
Door event history
Door-open duration tracking
20-second warning threshold
Repeating voice alert
5-second repeat interval
Warning stops automatically when the door closes
Cloud-hosted audio
🚀 Future Improvements

Possible future improvements include:

Multiple door/sensor support
Multiple Milesight devices
User authentication
Admin dashboard
Configurable warning time from the UI
Configurable voice-repeat interval from the UI
Email notifications
SMS notifications
WhatsApp notifications
Mobile-responsive improvements
Door activity analytics
Daily/weekly reports
Low-battery alerts
Device health monitoring
Cloud deployment
Raspberry Pi deployment
Docker deployment
Multiple alert levels
Role-based access control
🧠 Skills Demonstrated

This project provides practical experience with:

IoT device integration
Milesight WS301
LoRaWAN
Node-RED
MQTT
HiveMQ
Node.js
Express.js
REST APIs
React.js
Vite
JavaScript
HTML
CSS
Supabase
Real-time database updates
Cloud-hosted audio
Event logging
Real-time monitoring
Alert automation
📌 Project Summary
IoT-Based Door Monitoring & Alert System

A real-time door monitoring solution using the Milesight WS301 Magnetic Contact Switch with Node-RED, MQTT/HiveMQ, Node.js, Supabase, and React.

The system detects door open/close events, stores event history, provides a real-time monitoring dashboard, and generates a repeating voice warning when the door remains open beyond the configured threshold.

🔄 Complete Data Flow
┌─────────────────────┐
│   Milesight WS301   │
│ Magnetic Door Sensor│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│      Node-RED       │
│ Data Processing     │
└──────────┬──────────┘
           │
           │ MQTT
           ▼
┌─────────────────────┐
│       HiveMQ        │
│    MQTT Broker      │
└──────────┬──────────┘
           │
           │ MQTT Subscribe
           ▼
┌─────────────────────┐
│    Node.js /        │
│    Express Backend  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│      Supabase       │
│ Database + Realtime │
└──────────┬──────────┘
           │
           │ Realtime
           ▼
┌─────────────────────┐
│    React + Vite     │
│ Monitoring Dashboard│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Warning System    │
│                     │
│ 20 sec threshold    │
│ 5 sec repeat gap    │
│ Voice notification  │
└─────────────────────┘
👨‍💻 Author

Your Name

Project

IoT-Based Door Monitoring & Alert System

Hardware

Milesight WS301 Magnetic Contact Switch

Status

Working Prototype / Development Version

⭐ Final Technology Flow
Milesight WS301
       ↓
LoRaWAN
       ↓
Node-RED
       ↓
MQTT
       ↓
HiveMQ
       ↓
Node.js + Express
       ↓
Supabase
       ↓
React + Vite
       ↓
Real-Time Dashboard
       ↓
20-Second Door Warning
       ↓
Voice Alert
       ↓
5-Second Repeat Gap
       ↓
Stop When Door Closes
