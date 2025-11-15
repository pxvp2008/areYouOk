#!/bin/bash

set -e

PROJECT_NAME="areyouok"
IMAGE_NAME="areyouok-app"
CONTAINER_NAME="areyouok-app"
DOCKERFILE="Dockerfile"
BUILD_CONTEXT="."
VERSION=${1:-latest}

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    local level=$1
    shift
    case $level in
        INFO) echo -e "${BLUE}[INFO]${NC} $*" ;;
        SUCCESS) echo -e "${GREEN}[SUCCESS]${NC} $*" ;;
        WARNING) echo -e "${YELLOW}[WARNING]${NC} $*" ;;
        ERROR) echo -e "${RED}[ERROR]${NC} $*" ;;
    esac
}

check_docker() {
    docker info >/dev/null 2>&1 || { log ERROR "Docker not running"; exit 1; }
}

check_requirements() {
    [ -f "$DOCKERFILE" ] || { log ERROR "Dockerfile not found"; exit 1; }
    [ -d "frontend" ] || { log ERROR "Frontend directory not found"; exit 1; }
    [ -d "backend" ] || { log ERROR "Backend directory not found"; exit 1; }
    [ -f "frontend/package.json" ] || { log ERROR "Frontend package.json not found"; exit 1; }
    [ -f "backend/package.json" ] || { log ERROR "Backend package.json not found"; exit 1; }
}

create_directories() {
    mkdir -p data logs backups
    chmod 755 data logs backups
}

stop_existing_container() {
    if docker ps -a --format '{{.Names}}' | grep -q "^$CONTAINER_NAME$"; then
        log WARNING "Removing existing container: $CONTAINER_NAME"
        docker stop "$CONTAINER_NAME" >/dev/null 2>&1 || true
        docker rm "$CONTAINER_NAME" >/dev/null 2>&1 || true
    fi
}

build_image() {
    local full_image_name="${IMAGE_NAME}:${VERSION}"
    log INFO "Building: $full_image_name"

    if docker build \
        --no-cache \
        --tag "$full_image_name" \
        --file "$DOCKERFILE" \
        "$BUILD_CONTEXT"; then

        log SUCCESS "Built: $full_image_name"
        [ "$VERSION" != "latest" ] && docker tag "$full_image_name" "${IMAGE_NAME}:latest"
    else
        log ERROR "Build failed"
        exit 1
    fi
}

run_container() {
    [ ! -d "data" ] && { log ERROR "Data directory missing"; exit 1; }

    log INFO "Starting container: $CONTAINER_NAME"
    local full_image_name="${IMAGE_NAME}:${VERSION}"

    if docker run -d \
        --name "$CONTAINER_NAME" \
        --restart unless-stopped \
        -p 3000:3000 \
        -v "$(pwd)/data:/app/data:rw" \
        -v "$(pwd)/logs:/app/logs:rw" \
        -e NODE_ENV=production \
        -e TZ=Asia/Shanghai \
        --health-interval=30s \
        --health-timeout=10s \
        --health-retries=3 \
        "$full_image_name"; then

        log SUCCESS "Container started"
    else
        log ERROR "Failed to start container"
        exit 1
    fi
}

show_status() {
    log INFO "Container status:"
    docker ps --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    echo "Frontend: http://localhost:3000"
    echo "API: http://localhost:3000/api/"
    echo "Health: http://localhost:3000/health"
}

show_logs() {
    log INFO "Showing logs (Ctrl+C to exit):"
    docker logs -f "$CONTAINER_NAME"
}

main() {
    log INFO "Building AreYouOk version: ${VERSION}"

    check_docker
    check_requirements
    create_directories
    build_image

    log SUCCESS "AreYouOk built successfully! Version: ${VERSION}"
    log INFO "Use '$0 start' to start container, '$0 logs' to view logs"
}

if [[ "$1" =~ ^(build|start|stop|logs|status|restart)$ ]]; then
    COMMAND="$1"
    VERSION="latest"
elif [[ $# -eq 0 ]]; then
    COMMAND="build"
    VERSION="latest"
else
    VERSION="$1"
    COMMAND="${2:-build}"
fi

case "$COMMAND" in
    "build")
        main
        ;;
    "start")
        log INFO "Starting container..."
        run_container
        show_status
        log SUCCESS "Container started successfully"
        ;;
    "stop")
        log INFO "Stopping container..."
        stop_existing_container
        log SUCCESS "Container stopped"
        ;;
    "logs")
        show_logs
        ;;
    "status")
        show_status
        ;;
    "restart")
        log INFO "Restarting container..."
        stop_existing_container
        run_container
        show_status
        log SUCCESS "Container restarted successfully"
        ;;
    *)
        echo "Usage: $0 [VERSION] {build|start|stop|logs|status|restart}"
        echo "  VERSION - Docker image version (default: latest)"
        echo "  build   - Build image only (default)"
        echo "  start   - Start container from built image"
        echo "  stop    - Stop and remove container"
        echo "  logs    - Show container logs"
        echo "  status  - Show container status"
        echo "  restart - Restart container"
        echo ""
        echo "Examples:"
        echo "  $0              # Build with version 'latest'"
        echo "  $0 1.0.0        # Build with version '1.0.0'"
        echo "  $0 v2.1 build   # Build with version 'v2.1'"
        echo "  $0 latest start # Start container with version 'latest'"
        echo "  $0 latest stop  # Stop container (any version)"
        exit 1
        ;;
esac