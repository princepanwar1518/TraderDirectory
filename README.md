# Trader Directory

A modern mobile-first directory application built with React Native (Expo), FastAPI, MongoDB, and Docker.

## Overview

Trader Directory helps users discover, browse, and connect with traders through an intuitive mobile interface. The application provides a fast and responsive experience on both iOS and Android devices.

## Features

* Mobile-first user experience
* Fast and responsive interface
* Trader discovery and browsing
* Search and filtering functionality
* MongoDB database integration
* REST API powered by FastAPI
* Cross-platform support using Expo
* Docker-based database setup

## Tech Stack

### Frontend

* React Native
* Expo
* TypeScript

### Backend

* FastAPI
* Python
* Uvicorn

### Database

* MongoDB
* Docker

## Project Structure

```text
full_project/
├── frontend/
├── backend/
├── memory/
└── README.md
```

## Getting Started

### Prerequisites

* Node.js
* Python 3.11+
* Docker Desktop
* MongoDB Container

### Start MongoDB

```bash
docker start mongodb
```

### Start Backend

```bash
cd backend
.\venv\Scripts\activate
python -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

### Start Frontend

```bash
cd frontend
npm install
npx expo start
```

## Mobile Testing

For testing on a physical device:

1. Connect the phone and PC to the same Wi-Fi network.
2. Update the frontend environment configuration with the local backend IP.
3. Launch the Expo application.
4. Scan the QR code using Expo Go.

## Future Enhancements

* User authentication
* Trader profiles
* Ratings and reviews
* Advanced search filters
* Favorites and bookmarks
* Notifications
* Cloud deployment
* App Store and Play Store release

## Author

Prince Panwar

GitHub: https://github.com/princepanwar1518

## License

This project is intended for educational and portfolio purposes.
