# Deploying to a VPS (math.bluehawana.com)

This project has been optimized for deployment on a Linux VPS (e.g., Ubuntu).
It uses **Next.js Standalone Output** for efficient resource usage without installing heavy dependencies on the server.

## 1. Prerequisites (On the VPS)
- **Node.js** (v18 or higher)
- **Git**
- **Nginx** (web server / reverse proxy)
- **PM2** (process manager)

```bash
# Install Node.js (example for Ubuntu)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 and Git
sudo npm install -g pm2
sudo apt-get install git nginx
```

## 2. On Your Local Machine (Build & Prepare)
Run the provided script to build the standalone package:
```bash
./prepare-vps.sh
```
This will create a `.next/standalone` folder containing everything needed to run the app.

## 3. Upload to VPS
Use `rsync` or `scp` to copy the standalone folder to your VPS.
Example:
```bash
rsync -avz .next/standalone/ user@math.bluehawana.com:/var/www/math-grader
```
Also upload your `.env` file (containing API keys):
```bash
scp .env user@math.bluehawana.com:/var/www/math-grader/.env
```

## 4. Run the Application (On the VPS)
1. Navigate to the folder:
   ```bash
   cd /var/www/math-grader
   ```
2. Start the server with PM2:
   ```bash
   pm2 start server.js --name "math-grader"
   ```
   (The app runs on port **3000** by default).

## 5. Configure Nginx (Reverse Proxy)
Create an Nginx configuration file at `/etc/nginx/sites-available/math.bluehawana.com`:
```nginx
server {
    listen 80;
    server_name math.bluehawana.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Enable the site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/math.bluehawana.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 6. Secure with HTTPS (Optional)
Use Certbot to get a free SSL certificate:
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d math.bluehawana.com
```

Your app is now live at `https://math.bluehawana.com`!

## Troubleshooting
- Check logs: `pm2 logs math-grader`
- Restart app: `pm2 restart math-grader`
