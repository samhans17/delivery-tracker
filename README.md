# Delivery Tracker System

A lightweight, cost-effective delivery tracking system for managing logistics entries with automatic rate calculation.

## Features

- **Admin Dashboard** with monthly statistics and revenue tracking
- **Delivery Entry Management** - Track car number, route, product, and quantity
- **Automatic Rate Calculation** - Based on product price per ton
- **Route Management** - Define and manage delivery routes
- **Product Management** - Set products and their rates per ton
- **Monthly Reports** - View statistics and product breakdown
- **Secure Authentication** - Admin login system
- **SQLite Database** - No external database needed
- **Lightweight** - Runs on minimal resources (512MB RAM)

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: SQLite (file-based, no server needed)
- **Frontend**: Vanilla JavaScript (no build step)
- **Authentication**: Express-session + bcrypt
- **Deployment**: AWS Lightsail/EC2

## Quick Start

### Prerequisites
- Node.js 16+ installed

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start the server**
   ```bash
   npm start
   ```

3. **Access the application**
   - Open browser: `http://localhost:3000`
   - Default login:
     - Username: `admin`
     - Password: `Bashir@1234`

## Usage Guide

### 1. First Time Setup

After logging in, configure your system:

#### Add Products
1. Go to **Products** tab
2. Click "Add Product"
3. Enter product name (e.g., "Cement")
4. Enter price per ton (e.g., "5000")
5. Save

#### Add Routes
1. Go to **Routes** tab
2. Click "Add Route"
3. Enter route name (e.g., "Karachi to Lahore")
4. Add description (optional)
5. Save

### 2. Daily Operations

#### Creating an Entry
1. Go to **Entries** tab
2. Click "Add Entry"
3. Fill in:
   - Car Number (e.g., "ABC-123")
   - Entry Date
   - Select Route
   - Select Product
   - Enter Quantity in tons
4. **Rate is calculated automatically**
5. Save

#### Viewing Dashboard
1. Go to **Dashboard** tab
2. Select month and year
3. View:
   - Total entries
   - Total tons delivered
   - Total revenue
   - Average rate per entry
   - Product-wise breakdown

### 3. Managing Data

#### Edit an Entry/Route/Product
- Click "Edit" button next to the item
- Make changes
- Save

#### Delete an Entry/Route/Product
- Click "Delete" button
- Confirm deletion
- **Note**: You cannot delete routes/products that have associated entries

## Project Structure

```
ahmad-software/
├── server.js              # Main Express server
├── database.js            # SQLite database setup
├── delivery.db            # SQLite database file (created automatically)
├── package.json           # Dependencies
├── public/                # Frontend files
│   ├── index.html        # Main UI
│   ├── style.css         # Styling
│   └── app.js            # Frontend logic
├── README.md             # This file
└── AWS-DEPLOYMENT.md     # AWS deployment guide
```

## API Endpoints

### Authentication
- `POST /api/login` - Login
- `POST /api/logout` - Logout
- `GET /api/auth/check` - Check auth status

### Routes
- `GET /api/routes` - Get all routes
- `POST /api/routes` - Create route
- `PUT /api/routes/:id` - Update route
- `DELETE /api/routes/:id` - Delete route

### Products
- `GET /api/products` - Get all products
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Entries
- `GET /api/entries` - Get all entries (with filters)
- `POST /api/entries` - Create entry
- `PUT /api/entries/:id` - Update entry
- `DELETE /api/entries/:id` - Delete entry

### Statistics
- `GET /api/stats/monthly` - Get monthly statistics

## Database Schema

### users
- id, username, password_hash, created_at

### routes
- id, name, description, created_at

### products
- id, name, price_per_ton, created_at

### entries
- id, car_number, route_id, product_id, quantity_tons, calculated_rate, entry_date, created_at

## Rate Calculation

Rate is automatically calculated as:
```
calculated_rate = quantity_tons × product.price_per_ton
```

Example:
- Product: Cement @ Rs 5,000/ton
- Quantity: 10.5 tons
- **Calculated Rate: Rs 52,500**

## Deployment

See [AWS-DEPLOYMENT.md](./AWS-DEPLOYMENT.md) for detailed deployment instructions.

**Quick Deploy to AWS Lightsail**: $3.50/month

## Security Notes

1. **Change default password** after first login
2. **Update session secret** in `server.js` (line 14)
3. **Use HTTPS** in production
4. **Regular backups** of `delivery.db`
5. **Restrict SSH access** when deployed

## Backup

The database is stored in `delivery.db`. To backup:

```bash
# Manual backup
cp delivery.db delivery-backup-$(date +%Y%m%d).db

# Automated daily backup (add to crontab)
0 2 * * * cp /path/to/delivery.db /path/to/backups/delivery-$(date +\%Y\%m\%d).db
```

## Troubleshooting

### Application won't start
```bash
# Check if port 3000 is already in use
lsof -i :3000

# Kill process using port
kill -9 <PID>

# Restart application
npm start
```

### Login not working
- Check console for errors
- Verify database file exists: `ls -la delivery.db`
- Default credentials: admin / Bashir@1234

### Database errors
```bash
# Check database file permissions
chmod 644 delivery.db

# Reinitialize database (WARNING: deletes all data)
rm delivery.db
npm start
```

## Cost Analysis

### Development/Local
- **Cost**: $0 (runs on your machine)

### Production (AWS Lightsail)
- **Server**: $3.50/month
- **Storage**: Included
- **Bandwidth**: 1TB included
- **Total**: **$3.50/month**

### Scaling
- Current setup handles: ~1000 entries/day
- Database size: ~1MB per 1000 entries
- For higher loads, consider AWS RDS

## Future Enhancements (Optional)

- [ ] Export data to Excel/PDF
- [ ] Email reports
- [ ] Multi-user support with roles
- [ ] Mobile app
- [ ] Real-time notifications
- [ ] Advanced analytics charts

## License

Proprietary - Built for client use

## Support

For questions or issues:
1. Check logs: `pm2 logs` (if using PM2)
2. Check database: `delivery.db`
3. Review API responses in browser console
# delivery-tracker
