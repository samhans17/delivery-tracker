# Complete Deployment Guide for transport.nvdenterprise.com

This guide will walk you through deploying the Delivery Tracker to your subdomain.

## Prerequisites

- Access to your server (SSH)
- Domain DNS access (to add subdomain)
- Server with Ubuntu/Debian
- Root or sudo access

## Step 1: DNS Configuration

Add an A record for your subdomain:

```
Type: A
Name: transport
Value: YOUR_SERVER_IP_ADDRESS
TTL: 300 (or Auto)
```

**Verify DNS propagation:**
```bash
nslookup transport.nvdenterprise.com
# or
dig transport.nvdenterprise.com
```

Wait 5-10 minutes for DNS to propagate.

## Step 2: Server Setup

### 2.1 Install Node.js
```bash
# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### 2.2 Install Nginx
```bash
sudo apt-get install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

### 2.3 Install Certbot (for SSL)
```bash
sudo apt-get install -y certbot python3-certbot-nginx
```

## Step 3: Upload Your Application

### Option A: Using SCP (from your local machine)
```bash
# From your local machine (where ahmad-software folder is)
scp -r /path/to/ahmad-software ubuntu@YOUR_SERVER_IP:~/
```

### Option B: Using Git (recommended)
```bash
# On the server
cd ~
git clone YOUR_GIT_REPO_URL ahmad-software
cd ahmad-software
```

### Option C: Manual upload
- Use FileZilla or WinSCP
- Upload the entire `ahmad-software` folder to `/home/ubuntu/`

## Step 4: Install Application Dependencies

```bash
# SSH into your server
ssh ubuntu@YOUR_SERVER_IP

# Navigate to application directory
cd ~/ahmad-software

# Install dependencies
npm install --production

# Verify installation
ls -la node_modules
```

## Step 5: Configure Nginx

```bash
# Copy nginx configuration
sudo cp ~/ahmad-software/nginx.conf /etc/nginx/sites-available/transport.nvdenterprise.com

# Create symbolic link to enable the site
sudo ln -s /etc/nginx/sites-available/transport.nvdenterprise.com /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx
```

## Step 6: Get SSL Certificate

```bash
# Request SSL certificate from Let's Encrypt
sudo certbot --nginx -d transport.nvdenterprise.com

# Follow the prompts:
# - Enter your email address
# - Agree to terms of service
# - Choose whether to redirect HTTP to HTTPS (select Yes)

# Certbot will automatically configure SSL in your Nginx config
```

**Note:** If certbot fails because the certificate paths don't exist yet, first comment out the SSL certificate lines in the Nginx config:

```bash
# Edit the nginx config
sudo nano /etc/nginx/sites-available/transport.nvdenterprise.com

# Comment out these two lines (add # at the start):
# ssl_certificate /etc/letsencrypt/live/transport.nvdenterprise.com/fullchain.pem;
# ssl_certificate_key /etc/letsencrypt/live/transport.nvdenterprise.com/privkey.pem;

# Test and reload
sudo nginx -t
sudo systemctl reload nginx

# Now run certbot
sudo certbot --nginx -d transport.nvdenterprise.com

# Certbot will uncomment and configure the SSL lines automatically
```

## Step 7: Setup Systemd Service

```bash
# Copy service file
sudo cp ~/ahmad-software/delivery-tracker.service /etc/systemd/system/

# If your username is different from 'ubuntu', edit the service file:
sudo nano /etc/systemd/system/delivery-tracker.service
# Change User=ubuntu to User=YOUR_USERNAME
# Change WorkingDirectory=/home/ubuntu/ahmad-software to your path

# Reload systemd
sudo systemctl daemon-reload

# Start the service
sudo systemctl start delivery-tracker

# Check status
sudo systemctl status delivery-tracker

# If everything is working, enable auto-start on boot
sudo systemctl enable delivery-tracker
```

## Step 8: Verify Deployment

### 8.1 Check Application Logs
```bash
# View application logs
sudo journalctl -u delivery-tracker -f

# You should see:
# ✓ Default admin user created (username: admin, password: Bashir@1234)
# ✓ Delivery Tracker server running on http://localhost:3000
```

### 8.2 Test Local Connection
```bash
# On the server, test if app is responding
curl http://localhost:3000

# Should return HTML content
```

### 8.3 Test Domain Access
```bash
# From your local machine or browser
curl https://transport.nvdenterprise.com

# Or open in browser:
# https://transport.nvdenterprise.com
```

### 8.4 Test Login
- Open browser: https://transport.nvdenterprise.com
- Username: `admin`
- Password: `Bashir@1234`

## Step 9: Firewall Configuration (if using UFW)

```bash
# Allow Nginx
sudo ufw allow 'Nginx Full'

# Allow SSH (if not already allowed)
sudo ufw allow ssh

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

## Step 10: Setup Automatic Database Backups

```bash
# Create backup directory
mkdir -p ~/backups

# Add cron job for daily backups
crontab -e

# Add this line (backs up at 2 AM daily):
0 2 * * * cp ~/ahmad-software/delivery.db ~/backups/delivery-$(date +\%Y\%m\%d).db

# Keep only last 30 days of backups (optional, add this line too):
0 3 * * * find ~/backups -name "delivery-*.db" -mtime +30 -delete
```

## Step 11: Auto-renewal of SSL Certificate

Certbot automatically sets up auto-renewal. Verify it:

```bash
# Test renewal process
sudo certbot renew --dry-run

# If successful, auto-renewal is configured
# Certificates will auto-renew before expiry
```

## Common Management Commands

### Application Management
```bash
# Start application
sudo systemctl start delivery-tracker

# Stop application
sudo systemctl stop delivery-tracker

# Restart application
sudo systemctl restart delivery-tracker

# View status
sudo systemctl status delivery-tracker

# View logs (live)
sudo journalctl -u delivery-tracker -f

# View logs (last 100 lines)
sudo journalctl -u delivery-tracker -n 100
```

### Nginx Management
```bash
# Test configuration
sudo nginx -t

# Reload (without downtime)
sudo systemctl reload nginx

# Restart
sudo systemctl restart nginx

# View error logs
sudo tail -f /var/log/nginx/transport.nvdenterprise.com.error.log

# View access logs
sudo tail -f /var/log/nginx/transport.nvdenterprise.com.access.log
```

## Updating the Application

When you need to update the application code:

```bash
# SSH into server
ssh ubuntu@YOUR_SERVER_IP

# Navigate to app directory
cd ~/ahmad-software

# Backup current database
cp delivery.db delivery.db.backup

# Pull new code (if using git)
git pull

# Or upload new files via SCP

# Install any new dependencies
npm install --production

# Restart the application
sudo systemctl restart delivery-tracker

# Check logs
sudo journalctl -u delivery-tracker -f
```

## Troubleshooting

### Issue: Can't access the site

**Check DNS:**
```bash
nslookup transport.nvdenterprise.com
```

**Check Nginx:**
```bash
sudo systemctl status nginx
sudo nginx -t
```

**Check Application:**
```bash
sudo systemctl status delivery-tracker
sudo journalctl -u delivery-tracker -n 50
```

**Check if port 3000 is listening:**
```bash
sudo netstat -tlnp | grep 3000
```

### Issue: 502 Bad Gateway

This means Nginx is running but can't connect to the Node.js app.

```bash
# Check if app is running
sudo systemctl status delivery-tracker

# Check app logs
sudo journalctl -u delivery-tracker -n 50

# Restart app
sudo systemctl restart delivery-tracker
```

### Issue: Database errors

```bash
# Check database file exists
ls -la ~/ahmad-software/delivery.db

# Check permissions
chmod 644 ~/ahmad-software/delivery.db

# Restore from backup
cp ~/backups/delivery-YYYYMMDD.db ~/ahmad-software/delivery.db
sudo systemctl restart delivery-tracker
```

### Issue: SSL certificate errors

```bash
# Check certificate status
sudo certbot certificates

# Renew certificates manually
sudo certbot renew

# If renewal fails, check DNS and try again
```

## Security Checklist

- [ ] SSL certificate installed and working
- [ ] Firewall configured (only necessary ports open)
- [ ] Admin password is strong (Bashir@1234)
- [ ] Regular backups configured
- [ ] SSH key-based authentication enabled
- [ ] System packages up to date
- [ ] Application logs monitored

## Performance Monitoring

### Check resource usage:
```bash
# CPU and Memory
top

# Disk usage
df -h

# Application-specific
ps aux | grep node
```

### Monitor logs for errors:
```bash
# Application errors
sudo journalctl -u delivery-tracker -p err -f

# Nginx errors
sudo tail -f /var/log/nginx/transport.nvdenterprise.com.error.log
```

## Accessing the Application

**Production URL:** https://transport.nvdenterprise.com

**Login Credentials:**
- Username: `admin`
- Password: `Bashir@1234`

## Support

If you encounter issues:
1. Check application logs: `sudo journalctl -u delivery-tracker -f`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/*.log`
3. Verify DNS: `nslookup transport.nvdenterprise.com`
4. Test local connection: `curl http://localhost:3000`

---

**Your application is now live at:** https://transport.nvdenterprise.com
