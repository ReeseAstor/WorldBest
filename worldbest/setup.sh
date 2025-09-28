#!/bin/bash

# WorldBest Platform Setup Script
# This script helps set up the development environment for WorldBest

set -e

echo "🚀 Setting up WorldBest Development Environment"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running on supported OS
check_os() {
    print_status "Checking operating system..."
    
    case "$OSTYPE" in
        linux*)   OS="linux" ;;
        darwin*)  OS="macos" ;;
        msys*)    OS="windows" ;;
        cygwin*)  OS="windows" ;;
        *)        print_error "Unsupported OS: $OSTYPE" && exit 1 ;;
    esac
    
    print_success "OS detected: $OS"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    local missing_deps=()
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        missing_deps+=("Node.js (>=18.0.0)")
    else
        NODE_VERSION=$(node --version | sed 's/v//')
        if [ "$(printf '%s\n' "18.0.0" "$NODE_VERSION" | sort -V | head -n1)" != "18.0.0" ]; then
            missing_deps+=("Node.js (>=18.0.0, current: $NODE_VERSION)")
        fi
    fi
    
    # Check pnpm
    if ! command -v pnpm &> /dev/null; then
        missing_deps+=("pnpm (>=8.0.0)")
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        missing_deps+=("Docker")
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        missing_deps+=("Docker Compose")
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        print_error "Missing dependencies:"
        for dep in "${missing_deps[@]}"; do
            echo "  - $dep"
        done
        echo ""
        echo "Please install the missing dependencies and run this script again."
        echo ""
        echo "Installation guides:"
        echo "  - Node.js: https://nodejs.org/"
        echo "  - pnpm: https://pnpm.io/installation"
        echo "  - Docker: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    print_success "All dependencies are installed"
}

# Setup environment file
setup_env() {
    print_status "Setting up environment configuration..."
    
    if [ ! -f .env ]; then
        cp .env.example .env
        print_success "Created .env file from .env.example"
        print_warning "Please review and update the .env file with your configuration"
    else
        print_warning ".env file already exists, skipping creation"
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    if [ -f pnpm-lock.yaml ]; then
        pnpm install --frozen-lockfile
    else
        pnpm install
    fi
    
    print_success "Dependencies installed"
}

# Setup database
setup_database() {
    print_status "Setting up database..."
    
    # Check if Docker is running
    if ! docker info &> /dev/null; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    
    # Start database services
    print_status "Starting database services with Docker Compose..."
    docker-compose up -d postgres mongodb redis rabbitmq minio
    
    # Wait for services to be ready
    print_status "Waiting for services to be ready..."
    sleep 10
    
    # Run database migrations
    print_status "Running database migrations..."
    pnpm --filter @worldbest/database migrate || {
        print_warning "Database migration failed. This might be expected on first run."
    }
    
    print_success "Database setup completed"
}

# Build packages
build_packages() {
    print_status "Building shared packages..."
    
    # Build shared types
    pnpm --filter @worldbest/shared-types build
    
    # Build UI components
    pnpm --filter @worldbest/ui-components build
    
    # Build database package
    pnpm --filter @worldbest/database build
    
    print_success "Packages built successfully"
}

# Generate development certificates (for HTTPS)
generate_certs() {
    print_status "Generating development certificates..."
    
    if [ ! -d "certs" ]; then
        mkdir -p certs
        
        # Generate self-signed certificate for development
        openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost" &> /dev/null || {
            print_warning "Failed to generate certificates. HTTPS may not work in development."
            return
        }
        
        print_success "Development certificates generated"
    else
        print_warning "Certificates directory already exists, skipping generation"
    fi
}

# Setup development data
setup_dev_data() {
    print_status "Setting up development data..."
    
    # Seed database with sample data
    pnpm --filter @worldbest/database seed || {
        print_warning "Database seeding failed or skipped"
    }
    
    print_success "Development data setup completed"
}

# Display next steps
show_next_steps() {
    echo ""
    echo "🎉 Setup completed successfully!"
    echo "==============================="
    echo ""
    echo "Next steps:"
    echo "1. Review and update the .env file with your API keys and configuration"
    echo "2. Start the development servers:"
    echo "   ${BLUE}pnpm dev${NC}"
    echo ""
    echo "3. Access the application:"
    echo "   - Web Frontend: ${BLUE}http://localhost:3000${NC}"
    echo "   - API Gateway: ${BLUE}http://localhost/api${NC}"
    echo "   - Admin Dashboard: ${BLUE}http://localhost:3000/admin${NC}"
    echo ""
    echo "4. Access development tools:"
    echo "   - Grafana: ${BLUE}http://localhost:3030${NC} (admin/admin)"
    echo "   - Prometheus: ${BLUE}http://localhost:9090${NC}"
    echo "   - RabbitMQ Management: ${BLUE}http://localhost:15672${NC} (worldbest/worldbest123)"
    echo "   - MinIO Console: ${BLUE}http://localhost:9001${NC} (worldbest/worldbest123)"
    echo ""
    echo "5. For production deployment, see the README.md file"
    echo ""
    echo "Need help? Check the documentation or open an issue on GitHub."
}

# Main setup function
main() {
    echo "Starting WorldBest setup process..."
    echo ""
    
    check_os
    check_dependencies
    setup_env
    install_dependencies
    setup_database
    build_packages
    generate_certs
    setup_dev_data
    show_next_steps
}

# Handle script interruption
trap 'print_error "Setup interrupted"; exit 1' INT TERM

# Run main function
main "$@"