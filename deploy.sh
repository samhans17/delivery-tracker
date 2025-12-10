#!/bin/bash

# Quick Deployment Script for Delivery Tracker
# Run this script on your server after uploading the files

set -e  # Exit on any error

echo "========================================="
echo "Delivery Tracker - Quick Setup Script"
echo "========================================="
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "❌ Please do not run as root. Run as normal user with sudo privileges."
    exit 1
fi

# Get current username and directory
CURRENT_USER=$(whoami)
CURRENT_DIR=$(pwd)

echo "✓ Running as: $CURRENT_USER"
echo "✓ Directory: $CURRENT_DIR"
echo ""

# Step 1: Install dependencies
echo "Step 1: Installing Node.js dependencies..."
npm install --production
echo "✓ Dependencies installed"
echo ""

# Step 2: Update service file with current user and directory
echo "Step 2: Configuring systemd service..."
sed -i "s|User=ubuntu|User=$CURRENT_USER|g" delivery-tracker.service
sed -i "s|/home/ubuntu/ahmad-software|$CURRENT_DIR|g" delivery-tracker.service
echo "✓ Service file configured"
echo ""

# Step 3: Install systemd service
echo "Step 3: Installing systemd service..."
sudo cp delivery-tracker.service /etc/systemd/system/
sudo systemctl daemon-reload
echo "✓ Service installed"
echo ""

# Step 4: Install Nginx configuration
echo "Step 4: Installing Nginx configuration..."
sudo cp nginx.conf /etc/nginx/sites-available/transport.nvdenterprise.com

# Check if symbolic link already exists
if [ -L /etc/nginx/sites-enabled/transport.nvdenterprise.com ]; then
    echo "  → Nginx site already enabled"
else
    sudo ln -s /etc/nginx/sites-available/transport.nvdenterprise.com /etc/nginx/sites-enabled/
    echo "  → Nginx site enabled"
fi

# Test Nginx configuration
echo "  → Testing Nginx configuration..."
sudo nginx -t

echo "✓ Nginx configured"
echo ""

# Step 5: Start the application
echo "Step 5: Starting application..."
sudo systemctl start delivery-tracker
sudo systemctl enable delivery-tracker
sleep 2

# Check if service is running
if sudo systemctl is-active --quiet delivery-tracker; then
    echo "✓ Application started successfully"
else
    echo "❌ Application failed to start. Check logs:"
    echo "   sudo journalctl -u delivery-tracker -n 50"
    exit 1
fi
echo ""

# Step 6: Reload Nginx
echo "Step 6: Reloading Nginx..."
sudo systemctl reload nginx
echo "✓ Nginx reloaded"
echo ""

# Step 7: Test local connection
echo "Step 7: Testing application..."
sleep 2
if curl -s http://localhost:3000 > /dev/null; then
    echo "✓ Application responding on port 3000"
else
    echo "❌ Application not responding on port 3000"
    exit 1
fi
echo ""

# Summary
echo "========================================="
echo "✓ Deployment Complete!"
echo "========================================="
echo ""
echo "Application Status:"
sudo systemctl status delivery-tracker --no-pager -l
echo ""
echo "Next Steps:"
echo "1. Configure DNS: Add A record for transport.nvdenterprise.com → YOUR_SERVER_IP"
echo "2. Wait for DNS propagation (5-10 minutes)"
echo "3. Get SSL certificate:"
echo "   sudo certbot --nginx -d transport.nvdenterprise.com"
echo "4. Access your app: https://transport.nvdenterprise.com"
echo "5. Login with: admin / Bashir@1234"
echo ""
echo "Useful Commands:"
echo "  View logs:    sudo journalctl -u delivery-tracker -f"
echo "  Restart app:  sudo systemctl restart delivery-tracker"
echo "  Stop app:     sudo systemctl stop delivery-tracker"
echo "  Check status: sudo systemctl status delivery-tracker"
echo ""
echo "========================================="
