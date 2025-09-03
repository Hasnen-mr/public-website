# Meta Agency Ad Management via Embedded Signup API

This project demonstrates how to run Facebook ads on a client's page using your agency's ad account through Meta's Embedded Signup API.

## 🚀 Quick Start

### Prerequisites

1. **Meta Business Manager Account** - Verified business manager
2. **Meta Developer App** - Business-type app with required permissions
3. **Agency Ad Account** - Active ad account in your Business Manager
4. **App Review** - Approved permissions for production use

### Installation

1. Clone and install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your actual Meta app credentials
```

3. Start the development server:
```bash
npm run dev
```

4. Open http://localhost:3000 in your browser

## 📋 Setup Guide

### 1. Meta Developer App Setup

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create a new **Business** type app
3. Add these products:
   - Facebook Login
   - Marketing API
4. Configure App Review for these permissions:
   - `pages_manage_ads`
   - `pages_read_engagement`
   - `ads_management`
   - `business_management`

### 2. Business Manager Configuration

1. Go to [Meta Business Manager](https://business.facebook.com/)
2. Add your app to your Business Manager
3. Create or assign an ad account to your business
4. Generate a Business Access Token with required permissions

### 3. Environment Configuration

Update your `.env` file with:

```env
FB_APP_ID=your_facebook_app_id
FB_APP_SECRET=your_facebook_app_secret
BUSINESS_ID=your_business_manager_id
BUSINESS_ACCESS_TOKEN=your_business_access_token
AGENCY_AD_ACCOUNT_ID=your_ad_account_id
```

### 4. Update Frontend Configuration

In `public/index.html`, update the Facebook SDK initialization:

```javascript
FB.init({
    appId: 'YOUR_ACTUAL_APP_ID', // Replace with your App ID
    cookie: true,
    xfbml: true,
    version: 'v18.0'
});
```

## 🔧 How It Works

### Client Onboarding Flow

1. **Client Authorization**: Client clicks "Connect Facebook Page"
2. **Facebook Login**: Client logs in and grants permissions
3. **Token Exchange**: Short-lived token exchanged for long-lived token
4. **Page Discovery**: System retrieves client's Facebook pages
5. **Asset Assignment**: Pages assigned to your agency ad account

### Ad Campaign Creation

1. **Page Selection**: Choose from connected client pages
2. **Campaign Setup**: Configure campaign parameters
3. **Creative Creation**: Set up ad creative and targeting
4. **Campaign Launch**: Create campaign in PAUSED state for review

## 🎯 API Endpoints

### POST /api/process-signup
Processes client signup and onboarding.

**Request:**
```json
{
  "accessToken": "client_access_token",
  "userID": "client_user_id"
}
```

**Response:**
```json
{
  "success": true,
  "pages": [
    {
      "id": "page_id",
      "name": "Page Name",
      "category": "Business"
    }
  ]
}
```

### POST /api/create-campaign
Creates ad campaign for client page.

**Request:**
```json
{
  "clientPageId": "page_id",
  "campaignName": "Campaign Name",
  "objective": "LINK_CLICKS",
  "dailyBudget": 50,
  "creative": {
    "message": "Ad message",
    "link": "https://client-site.com",
    "headline": "Ad headline"
  }
}
```

**Response:**
```json
{
  "success": true,
  "campaign": {
    "campaign_id": "campaign_id",
    "adset_id": "adset_id",
    "creative_id": "creative_id",
    "ad_id": "ad_id"
  }
}
```

### GET /api/clients
Returns list of connected clients and their pages.

## 🔐 Security & Compliance

### Required Permissions

- `pages_manage_ads` - Manage ads on client pages
- `pages_read_engagement` - Read page engagement data
- `ads_management` - Create and manage ad campaigns
- `business_management` - Manage business assets

### Best Practices

1. **Token Security**: Store access tokens securely
2. **Rate Limiting**: Implement API rate limiting
3. **Error Handling**: Robust error handling for API failures
4. **Data Privacy**: Comply with GDPR/CCPA requirements
5. **Audit Logging**: Log all API interactions

### App Review Requirements

For production use, your app must pass Meta's App Review:

1. Provide detailed use case description
2. Submit video demonstration
3. Explain data usage and privacy practices
4. Show compliance with Meta policies

## 🚨 Common Issues & Solutions

### Permission Denied Errors
- Ensure all required permissions are approved
- Verify client has admin access to their pages
- Check Business Manager role assignments

### Token Expiration
- Implement token refresh mechanisms
- Use long-lived tokens where possible
- Handle token expiration gracefully

### Ad Creation Failures
- Validate targeting parameters
- Check creative specifications
- Ensure sufficient ad account balance

### Rate Limiting
- Implement exponential backoff
- Batch API requests where possible
- Monitor API usage quotas

## 📊 Testing

### Development Testing

1. Use Meta's Graph API Explorer for testing
2. Create test pages and ad accounts
3. Use test users for development

### Production Readiness

1. Complete App Review process
2. Test with real client accounts
3. Monitor error rates and performance
4. Implement comprehensive logging

## 🔄 Deployment

### Environment Variables for Production

```env
NODE_ENV=production
FB_APP_ID=production_app_id
FB_APP_SECRET=production_app_secret
BUSINESS_ID=production_business_id
BUSINESS_ACCESS_TOKEN=production_access_token
AGENCY_AD_ACCOUNT_ID=production_ad_account_id
```

### Deployment Checklist

- [ ] Environment variables configured
- [ ] HTTPS enabled
- [ ] Error monitoring setup
- [ ] Database configured (if needed)
- [ ] Rate limiting implemented
- [ ] Security headers configured

## 📚 Resources

- [Meta Marketing API Documentation](https://developers.facebook.com/docs/marketing-api/)
- [Embedded Signup Documentation](https://developers.facebook.com/docs/whatsapp/embedded-signup/)
- [Business Manager API](https://developers.facebook.com/docs/marketing-api/business-asset-management/)
- [App Review Guidelines](https://developers.facebook.com/docs/app-review/)

## 🤝 Support

For issues and questions:

1. Check Meta Developer Community
2. Review API documentation
3. Test in Graph API Explorer
4. Contact Meta Developer Support

## 📄 License

MIT License - see LICENSE file for details.