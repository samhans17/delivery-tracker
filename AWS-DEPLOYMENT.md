# AWS Deployment Guide - Delivery Tracker

This guide covers deploying your delivery tracking application to AWS in the most cost-effective way.

## Option 1: AWS Lightsail (Recommended - Cheapest)

**Cost**: $3.50/month for the smallest instance

### Steps:

1. **Create a Lightsail Instance**
   - Go to AWS Lightsail console
   - Create instance → Linux/Unix → OS Only → Ubuntu 22.04 LTS
   - Choose the $3.50/month plan (512 MB RAM, 1 vCPU)
   - Create instance

2. **Connect to Your Instance**
   ```bash
   # Download the SSH key from Lightsail console
   chmod 400 lightsail-key.pem
   ssh -i lightsail-key.pem ubuntu@YOUR-INSTANCE-IP
   ```

3. **Install Node.js**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   sudo apt-get install -y build-essential
   ```

4. **Upload Your Application**
   ```bash
   # On your local machine
   scp -i lightsail-key.pem -r /path/to/ahmad-software ubuntu@YOUR-INSTANCE-IP:~/
   ```

5. **Install Dependencies**
   ```bash
   cd ~/ahmad-software
   npm install
   ```

6. **Install PM2 (Process Manager)**
   ```bash
   sudo npm install -g pm2
   pm2 start server.js --name delivery-tracker
   pm2 startup
   pm2 save
   ```

7. **Configure Firewall**
   - In Lightsail console, go to Networking tab
   - Add firewall rule: Application = Custom, Protocol = TCP, Port = 3000

8. **Access Your Application**
   - Open browser: `http://YOUR-INSTANCE-IP:3000`
   - Login: username = `admin`, password = `Bashir@1234`

## Option 2: AWS EC2 Free Tier

**Cost**: Free for 12 months (then ~$8/month)

### Steps:

1. **Launch EC2 Instance**
   - Go to EC2 console
   - Launch Instance → Ubuntu 22.04 LTS
   - Instance type: t2.micro (free tier eligible)
   - Create new key pair (download .pem file)
   - Configure Security Group:
     - SSH (22) - Your IP
     - Custom TCP (3000) - Anywhere
   - Launch instance

2. **Follow steps 2-6 from Lightsail guide above**

## Option 3: AWS Lambda + API Gateway (Most Scalable)

**Cost**: Free tier includes 1M requests/month

This requires restructuring the app for serverless. Contact me if you need this option.

## Post-Deployment Checklist

### 1. Secure Your Admin Account
   - Login with admin/Bashir@1234
   - The default password has been set for your client
   - You can create additional admin users if needed

### 2. Set Environment Variables
   ```bash
   # On your server
   export PORT=3000
   export NODE_ENV=production
   ```

### 3. Enable HTTPS (Optional but Recommended)
   ```bash
   # Install Nginx
   sudo apt-get install nginx

   # Install Certbot for free SSL
   sudo apt-get install certbot python3-certbot-nginx

   # Get SSL certificate (replace your-domain.com)
   sudo certbot --nginx -d your-domain.com
   ```

### 4. Backup Strategy
   ```bash
   # Backup database daily
   crontab -e

   # Add this line (runs daily at 2 AM)
   0 2 * * * cp ~/ahmad-software/delivery.db ~/backups/delivery-$(date +\%Y\%m\%d).db
   ```

### 5. Monitor Application
   ```bash
   # Check application status
   pm2 status

   # View logs
   pm2 logs delivery-tracker

   # Restart application
   pm2 restart delivery-tracker
   ```

## Updating the Application

```bash
# SSH into your server
cd ~/ahmad-software

# Pull latest changes (if using git)
git pull

# Or upload new files via SCP
# scp -i key.pem -r local-files/* ubuntu@IP:~/ahmad-software/

# Restart application
pm2 restart delivery-tracker
```

## Cost Comparison

| Option | Monthly Cost | Best For |
|--------|-------------|----------|
| Lightsail | $3.50 | Single client, predictable usage |
| EC2 t2.micro | Free (1 year) then $8 | Testing, development |
| Lambda | Pay per use (~$0-5) | Scalable production |

## Troubleshooting

### Application won't start
```bash
# Check logs
pm2 logs delivery-tracker

# Restart
pm2 restart delivery-tracker

# Check if port is in use
sudo lsof -i :3000
```

### Database issues
```bash
# Check database file exists
ls -la ~/ahmad-software/delivery.db

# Check permissions
chmod 644 ~/ahmad-software/delivery.db
```

### Can't connect from browser
- Verify firewall rules in AWS console
- Check if application is running: `pm2 status`
- Try accessing from server: `curl localhost:3000`

## Security Recommendations

1. **Admin password set** to Bashir@1234 (keep it secure)
2. **Use strong session secret** (edit server.js line 14)
3. **Restrict SSH access** to your IP only
4. **Enable HTTPS** for production
5. **Regular backups** of delivery.db
6. **Update system packages** regularly:
   ```bash
   sudo apt-get update
   sudo apt-get upgrade
   ```

## Support

For issues or questions, check:
- Application logs: `pm2 logs delivery-tracker`
- Server logs: `sudo journalctl -u pm2-ubuntu`
- Database location: `~/ahmad-software/delivery.db`
