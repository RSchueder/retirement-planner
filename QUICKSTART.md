# Quick Start Guide - Retirement Planner

## Option 1: Using Docker (Recommended)

### Prerequisites
- Docker installed on your machine ([Get Docker](https://docs.docker.com/get-docker/))

### macOS/Linux
```bash
# Navigate to the project directory
cd retirement-planner

# Set up your default values (optional)
cp .env.example .env
# Edit .env with your personal defaults

# Run the start script
./start.sh
```

### Manual Docker Commands
If you prefer to run commands manually:

```bash
# Build the image
docker build -t retirement-planner .

# Run the container
docker run -p 3000:3000 -v $(pwd):/app -v /app/node_modules retirement-planner
```

On Windows (PowerShell):
```powershell
docker run -p 3000:3000 -v ${PWD}:/app -v /app/node_modules retirement-planner
```

Then open your browser to: **http://localhost:3000**

---

## Option 2: Without Docker

### Prerequisites
- Node.js 18 or higher ([Download Node.js](https://nodejs.org/))

### Steps
```bash
# Navigate to the project directory
cd retirement-planner

# Set up your default values (optional)
cp .env.example .env
# Edit .env with your personal defaults

# Install dependencies
npm install

# Start the development server
npm run dev
```

Then open your browser to: **http://localhost:3000**

---

## Stopping the Application

### Docker
Press `Ctrl+C` in the terminal to stop the container

### npm
Press `Ctrl+C` in the terminal to stop the dev server

---

## Troubleshooting

### Port already in use
If port 3000 is already in use, you can change it in two ways:

**Docker:** Modify the port mapping
```bash
docker run -p 8080:3000 -v $(pwd):/app -v /app/node_modules retirement-planner
```
Then access at http://localhost:8080

**npm:** Modify `vite.config.js` and change the port number

### Docker build fails
- Make sure Docker Desktop is running
- Check that you have internet connection (needed to download dependencies)
- Try running `docker system prune` to clean up old containers

### Browser shows blank page
- Wait a few seconds for Vite to compile
- Check the terminal for any error messages
- Try refreshing the browser (Cmd+R or Ctrl+R)
