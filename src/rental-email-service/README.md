# Rental Email Service

Simple branding-free email service for Rental World. Accepts HTML content and sends via configured SMTP.

## Setup

1. Push this folder to a new GitHub repo
2. Create Render Web Service, connect GitHub repo
3. Add environment variables in Render:
   - `SMTP_HOST` (e.g., smtp.gmail.com)
   - `SMTP_PORT` (usually 587)
   - `SMTP_USER` (sender email)
   - `SMTP_PASS` (app password or SMTP token)
   - `PORT` (3000)

4. Deploy. Get the URL (e.g., `https://rental-email-service.onrender.com`)

## Usage

POST to `/send` with JSON:
```json
{
  "to": "customer@example.com",
  "subject": "Your Rental Invoice",
  "html": "<table>...</table>",
  "fromName": "Rental World LLC"
}
```

Response:
```json
{
  "success": true,
  "messageId": "...",
  "message": "Email sent successfully"
}
``