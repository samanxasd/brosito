require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}));
app.use(express.json());

// Ruta principal
app.get('/', (req, res) => {
    res.json({ 
        status: 'online',
        message: 'Discord Auth Backend Running'
    });
});

// Ruta de callback de Discord
app.get('/api/auth/discord/callback', async (req, res) => {
    const { code } = req.query;

    if (!code) {
        console.log('No code provided');
        return res.redirect(`${process.env.FRONTEND_URL}?error=no_code`);
    }

    try {
        // Obtener token
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            body: new URLSearchParams({
                client_id: process.env.CLIENT_ID,
                client_secret: process.env.CLIENT_SECRET,
                code,
                grant_type: 'authorization_code',
                redirect_uri: process.env.REDIRECT_URI,
                scope: 'identify'
            }),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            console.error('Token Error:', tokenData);
            return res.redirect(`${process.env.FRONTEND_URL}?error=token_error`);
        }

        // Obtener datos del usuario
        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`
            }
        });

        const userData = await userResponse.json();

        if (userData.error) {
            console.error('User Data Error:', userData);
            return res.redirect(`${process.env.FRONTEND_URL}?error=user_error`);
        }

        // Redirigir al frontend con los datos
        const redirectURL = `${process.env.FRONTEND_URL}?token=${tokenData.access_token}&user=${encodeURIComponent(JSON.stringify(userData))}`;
        console.log('Redirecting to:', redirectURL);
        res.redirect(redirectURL);

    } catch (error) {
        console.error('Auth Error:', error);
        res.redirect(`${process.env.FRONTEND_URL}?error=auth_error`);
    }
});

// Ruta para verificar token
app.get('/api/verify', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const userData = await userResponse.json();

        if (userData.error) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        res.json(userData);
    } catch (error) {
        console.error('Verify Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
