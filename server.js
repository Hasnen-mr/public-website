const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// In-memory storage for demo (use database in production)
const clientData = new Map();

// Routes
app.post('/api/process-signup', async (req, res) => {
    try {
        const { accessToken, userID } = req.body;
        
        console.log('Processing signup for user:', userID);
        
        // Step 1: Exchange for long-lived token
        const longLivedToken = await exchangeForLongLivedToken(accessToken);
        
        // Step 2: Get user's pages
        const pages = await getUserPages(longLivedToken);
        
        // Step 3: Store client data
        clientData.set(userID, {
            accessToken: longLivedToken,
            pages: pages,
            createdAt: new Date()
        });
        
        // Step 4: Assign pages to your ad account (optional, can be done later)
        for (const page of pages) {
            await assignPageToAdAccount(page.id);
        }
        
        res.json({ 
            success: true, 
            pages: pages.map(p => ({
                id: p.id,
                name: p.name,
                category: p.category
            }))
        });
        
    } catch (error) {
        console.error('Signup processing error:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Failed to process signup',
            details: error.message 
        });
    }
});

app.post('/api/create-campaign', async (req, res) => {
    try {
        const { 
            clientPageId, 
            campaignName, 
            objective, 
            dailyBudget, 
            targeting,
            creative 
        } = req.body;
        
        // Validate required fields
        if (!clientPageId || !campaignName || !objective) {
            return res.status(400).json({ 
                error: 'Missing required fields: clientPageId, campaignName, objective' 
            });
        }
        
        const campaign = await createAdCampaign({
            pageId: clientPageId,
            name: campaignName,
            objective: objective,
            dailyBudget: dailyBudget || 50,
            targeting: targeting || {},
            creative: creative || {}
        });
        
        res.json({ success: true, campaign });
        
    } catch (error) {
        console.error('Campaign creation error:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Failed to create campaign',
            details: error.message 
        });
    }
});

app.get('/api/clients', (req, res) => {
    const clients = Array.from(clientData.entries()).map(([userId, data]) => ({
        userId,
        pages: data.pages.map(p => ({ id: p.id, name: p.name })),
        createdAt: data.createdAt
    }));
    
    res.json(clients);
});

// Helper Functions
async function exchangeForLongLivedToken(shortLivedToken) {
    try {
        const response = await axios.get('https://graph.facebook.com/oauth/access_token', {
            params: {
                grant_type: 'fb_exchange_token',
                client_id: process.env.FB_APP_ID,
                client_secret: process.env.FB_APP_SECRET,
                fb_exchange_token: shortLivedToken
            }
        });
        
        return response.data.access_token;
    } catch (error) {
        console.error('Token exchange error:', error.response?.data);
        throw new Error('Failed to exchange token');
    }
}

async function getUserPages(accessToken) {
    try {
        const response = await axios.get('https://graph.facebook.com/me/accounts', {
            params: {
                access_token: accessToken,
                fields: 'id,name,access_token,category,tasks,can_post'
            }
        });
        
        return response.data.data;
    } catch (error) {
        console.error('Get pages error:', error.response?.data);
        throw new Error('Failed to get user pages');
    }
}

async function assignPageToAdAccount(pageId) {
    try {
        const adAccountId = process.env.AGENCY_AD_ACCOUNT_ID;
        const accessToken = process.env.BUSINESS_ACCESS_TOKEN;
        
        if (!adAccountId || !accessToken) {
            console.warn('Ad account ID or access token not configured');
            return;
        }
        
        await axios.post(
            `https://graph.facebook.com/act_${adAccountId}/assigned_users`,
            {
                user: pageId,
                tasks: ['ADVERTISE']
            },
            {
                params: {
                    access_token: accessToken
                }
            }
        );
        
        console.log(`Page ${pageId} assigned to ad account`);
    } catch (error) {
        console.error(`Failed to assign page ${pageId}:`, error.response?.data);
        // Don't throw error as this is optional
    }
}

async function createAdCampaign(campaignData) {
    const adAccountId = process.env.AGENCY_AD_ACCOUNT_ID;
    const accessToken = process.env.BUSINESS_ACCESS_TOKEN;
    
    if (!adAccountId || !accessToken) {
        throw new Error('Ad account configuration missing');
    }
    
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
        console.log('Campaign created:', campaignId);
        
        // Create ad set
        const adSetResponse = await axios.post(
            `https://graph.facebook.com/act_${adAccountId}/adsets`,
            {
                name: `${campaignData.name} - Ad Set`,
                campaign_id: campaignId,
                daily_budget: (campaignData.dailyBudget || 50) * 100, // in cents
                billing_event: 'IMPRESSIONS',
                optimization_goal: 'REACH',
                targeting: {
                    geo_locations: {
                        countries: campaignData.targeting.countries || ['US']
                    },
                    age_min: campaignData.targeting.ageMin || 18,
                    age_max: campaignData.targeting.ageMax || 65,
                    ...campaignData.targeting
                },
                status: 'PAUSED'
            },
            {
                params: { access_token: accessToken }
            }
        );
        
        const adSetId = adSetResponse.data.id;
        console.log('Ad set created:', adSetId);
        
        // Create ad creative (simplified version)
        const creativeResponse = await axios.post(
            `https://graph.facebook.com/act_${adAccountId}/adcreatives`,
            {
                name: `${campaignData.name} - Creative`,
                object_story_spec: {
                    page_id: campaignData.pageId,
                    link_data: {
                        message: campaignData.creative.message || 'Check out our latest offers!',
                        link: campaignData.creative.link || 'https://example.com',
                        name: campaignData.creative.headline || campaignData.name,
                        description: campaignData.creative.description || 'Learn more about our products and services.'
                    }
                }
            },
            {
                params: { access_token: accessToken }
            }
        );
        
        const creativeId = creativeResponse.data.id;
        console.log('Creative created:', creativeId);
        
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
        
        const adId = adResponse.data.id;
        console.log('Ad created:', adId);
        
        return {
            campaign_id: campaignId,
            adset_id: adSetId,
            creative_id: creativeId,
            ad_id: adId,
            status: 'created_paused'
        };
        
    } catch (error) {
        console.error('Ad creation error:', error.response?.data || error.message);
        throw error;
    }
}

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Make sure to configure your .env file with the required variables');
});

module.exports = app;