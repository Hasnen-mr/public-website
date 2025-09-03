# Agency Facebook Ad Management via Meta Embedded Signup API

This guide shows how to run ads on a client's Facebook page using your agency's ad account through Meta's Embedded Signup API.

## Overview

The process involves:
1. Setting up your Business Manager and Meta App
2. Implementing Embedded Signup for client onboarding
3. Obtaining proper access tokens and permissions
4. Assigning client pages to your agency ad account
5. Creating and managing ads on behalf of clients

## Prerequisites

- Verified Meta Business Manager account
- Meta Developer account
- Business-type app in Meta Developer portal
- App Review approval for required permissions

## Step 1: Business Manager & App Setup

### Required Permissions
- `pages_manage_ads` - To manage ads on client pages
- `pages_read_engagement` - To read page engagement data
- `ads_management` - To manage ad campaigns
- `business_management` - To manage business assets

### App Configuration
```javascript
// App configuration in Meta Developer Console
{
  "app_type": "business",
  "category": "Marketing",
  "permissions": [
    "pages_manage_ads",
    "pages_read_engagement", 
    "ads_management",
    "business_management"
  ]
}
```

## Step 2: Embedded Signup Implementation

### Frontend Integration

```html
<!DOCTYPE html>
<html>
<head>
    <title>Agency Client Onboarding</title>
    <script async defer crossorigin="anonymous" 
            src="https://connect.facebook.net/en_US/sdk.js"></script>
</head>
<body>
    <div id="fb-root"></div>
    
    <button onclick="startEmbeddedSignup()">Connect Your Facebook Page</button>
    
    <script>
        window.fbAsyncInit = function() {
            FB.init({
                appId: 'YOUR_APP_ID',
                cookie: true,
                xfbml: true,
                version: 'v18.0'
            });
        };

        function startEmbeddedSignup() {
            FB.login(function(response) {
                if (response.authResponse) {
                    // Handle successful login
                    handleSignupSuccess(response);
                } else {
                    console.log('User cancelled login or did not fully authorize.');
                }
            }, {
                scope: 'pages_manage_ads,pages_read_engagement,ads_management',
                config_id: 'YOUR_CONFIG_ID' // From Business Manager
            });
        }

        function handleSignupSuccess(response) {
            // Send the access token to your backend
            fetch('/api/process-signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    accessToken: response.authResponse.accessToken,
                    userID: response.authResponse.userID
                })
            });
        }
    </script>
</body>
</html>
```

### Backend Processing (Node.js Example)

```javascript
const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// Process embedded signup
app.post('/api/process-signup', async (req, res) => {
    try {
        const { accessToken, userID } = req.body;
        
        // Exchange for long-lived token
        const longLivedToken = await exchangeForLongLivedToken(accessToken);
        
        // Get user's pages
        const pages = await getUserPages(longLivedToken);
        
        // Create business integration system user
        const systemUser = await createSystemUser(pages);
        
        // Assign pages to your ad account
        await assignPagesToAdAccount(pages, systemUser.access_token);
        
        res.json({ success: true, pages: pages });
    } catch (error) {
        console.error('Signup processing error:', error);
        res.status(500).json({ error: error.message });
    }
});

async function exchangeForLongLivedToken(shortLivedToken) {
    const response = await axios.get('https://graph.facebook.com/oauth/access_token', {
        params: {
            grant_type: 'fb_exchange_token',
            client_id: process.env.FB_APP_ID,
            client_secret: process.env.FB_APP_SECRET,
            fb_exchange_token: shortLivedToken
        }
    });
    
    return response.data.access_token;
}

async function getUserPages(accessToken) {
    const response = await axios.get('https://graph.facebook.com/me/accounts', {
        params: {
            access_token: accessToken,
            fields: 'id,name,access_token,category,tasks'
        }
    });
    
    return response.data.data;
}

async function createSystemUser(pages) {
    // Create system user for business integration
    const response = await axios.post(
        `https://graph.facebook.com/${process.env.BUSINESS_ID}/system_users`,
        {
            name: 'Agency Integration User',
            role: 'ADMIN'
        },
        {
            params: {
                access_token: process.env.BUSINESS_ACCESS_TOKEN
            }
        }
    );
    
    const systemUserId = response.data.id;
    
    // Generate access token for system user
    const tokenResponse = await axios.post(
        `https://graph.facebook.com/${systemUserId}/access_tokens`,
        {
            scope: 'ads_management,pages_manage_ads,business_management'
        },
        {
            params: {
                access_token: process.env.BUSINESS_ACCESS_TOKEN
            }
        }
    );
    
    return {
        id: systemUserId,
        access_token: tokenResponse.data.access_token
    };
}

async function assignPagesToAdAccount(pages, systemAccessToken) {
    const adAccountId = process.env.AGENCY_AD_ACCOUNT_ID;
    
    for (const page of pages) {
        try {
            // Assign page to ad account
            await axios.post(
                `https://graph.facebook.com/${adAccountId}/assigned_users`,
                {
                    user: page.id,
                    tasks: ['ADVERTISE']
                },
                {
                    params: {
                        access_token: systemAccessToken
                    }
                }
            );
            
            console.log(`Page ${page.name} assigned to ad account`);
        } catch (error) {
            console.error(`Failed to assign page ${page.name}:`, error.response.data);
        }
    }
}
```

## Step 3: Ad Creation and Management

```javascript
// Create ad campaign for client page
async function createAdCampaign(clientPageId, campaignData) {
    const adAccountId = process.env.AGENCY_AD_ACCOUNT_ID;
    const accessToken = process.env.SYSTEM_USER_ACCESS_TOKEN;
    
    try {
        // Create campaign
        const campaignResponse = await axios.post(
            `https://graph.facebook.com/act_${adAccountId}/campaigns`,
            {
                name: campaignData.name,
                objective: campaignData.objective,
                status: 'PAUSED',
                buying_type: 'AUCTION'
            },
            {
                params: { access_token: accessToken }
            }
        );
        
        const campaignId = campaignResponse.data.id;
        
        // Create ad set
        const adSetResponse = await axios.post(
            `https://graph.facebook.com/act_${adAccountId}/adsets`,
            {
                name: `${campaignData.name} - Ad Set`,
                campaign_id: campaignId,
                daily_budget: campaignData.dailyBudget * 100, // in cents
                billing_event: 'IMPRESSIONS',
                optimization_goal: 'REACH',
                targeting: {
                    geo_locations: {
                        countries: campaignData.countries || ['US']
                    },
                    age_min: 18,
                    age_max: 65
                },
                status: 'PAUSED'
            },
            {
                params: { access_token: accessToken }
            }
        );
        
        const adSetId = adSetResponse.data.id;
        
        // Create ad creative
        const creativeResponse = await axios.post(
            `https://graph.facebook.com/act_${adAccountId}/adcreatives`,
            {
                name: `${campaignData.name} - Creative`,
                object_story_spec: {
                    page_id: clientPageId,
                    link_data: {
                        message: campaignData.message,
                        link: campaignData.link,
                        name: campaignData.headline,
                        description: campaignData.description
                    }
                }
            },
            {
                params: { access_token: accessToken }
            }
        );
        
        const creativeId = creativeResponse.data.id;
        
        // Create ad
        const adResponse = await axios.post(
            `https://graph.facebook.com/act_${adAccountId}/ads`,
            {
                name: `${campaignData.name} - Ad`,
                adset_id: adSetId,
                creative: { creative_id: creativeId },
                status: 'PAUSED'
            },
            {
                params: { access_token: accessToken }
            }
        );
        
        return {
            campaign_id: campaignId,
            adset_id: adSetId,
            creative_id: creativeId,
            ad_id: adResponse.data.id
        };
        
    } catch (error) {
        console.error('Ad creation error:', error.response?.data || error.message);
        throw error;
    }
}

// Usage example
const campaignData = {
    name: 'Client Holiday Campaign',
    objective: 'LINK_CLICKS',
    dailyBudget: 50, // $50 daily budget
    countries: ['US', 'CA'],
    message: 'Check out our holiday specials!',
    link: 'https://client-website.com/holiday-sale',
    headline: 'Holiday Sale - Up to 50% Off',
    description: 'Limited time offer on all products.'
};

createAdCampaign('CLIENT_PAGE_ID', campaignData)
    .then(result => console.log('Campaign created:', result))
    .catch(error => console.error('Campaign creation failed:', error));
```

## Step 4: Environment Configuration

Create a `.env` file:

```env
# Meta App Configuration
FB_APP_ID=your_app_id
FB_APP_SECRET=your_app_secret

# Business Manager
BUSINESS_ID=your_business_manager_id
BUSINESS_ACCESS_TOKEN=your_business_access_token

# Agency Ad Account
AGENCY_AD_ACCOUNT_ID=your_ad_account_id
SYSTEM_USER_ACCESS_TOKEN=system_user_access_token

# Server Configuration
PORT=3000
```

## Step 5: Package Dependencies

```json
{
  "name": "meta-agency-ads",
  "version": "1.0.0",
  "description": "Agency Facebook ad management via Embedded Signup",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "axios": "^1.6.0",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

## Important Notes

### Compliance & Best Practices

1. **App Review**: Ensure your app passes Meta's review process for required permissions
2. **Data Privacy**: Handle client data according to Meta's policies and GDPR/CCPA requirements
3. **Rate Limits**: Implement proper rate limiting to avoid API throttling
4. **Error Handling**: Robust error handling for API failures and edge cases
5. **Token Management**: Securely store and refresh access tokens

### Common Issues & Solutions

1. **Permission Denied**: Ensure all required permissions are approved and granted
2. **Page Assignment Failed**: Verify the client page has proper admin roles
3. **Ad Creation Errors**: Check targeting parameters and creative specifications
4. **Token Expiration**: Implement token refresh mechanisms

### Testing

Use Meta's Graph API Explorer and Test Users for development and testing before going live with client accounts.

## Security Considerations

- Never expose app secrets in frontend code
- Use HTTPS for all API communications
- Implement proper authentication and authorization
- Regularly rotate access tokens and app secrets
- Monitor API usage and implement logging