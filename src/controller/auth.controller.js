const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models/db');
const SECRET_KEY = 'your_secret_key';
const JWT_REFRESH_SECRET_KEY = 'your_refresh_secret_key';

// signup controller
exports.signup = async (req, res) => {
    try {
        const { username, password, email } = req.body;
        if(!username || !password || password.length < 6 || !email) {
            return res.status(400).json({ message: 'Username, email and password are required' });
        }
     //check if user exists 
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already exists' });
        }

       // Hash password and create user
        const hashedPassword = await bcrypt.hash(password, 10);
       const user= await User.create({ name: username, passwordHash: hashedPassword, email, role:"USER" });
        res.status(201).json({ message: 'User created successfully', userId: user._id });
    } catch (error) {
        res.status(500).json({ message: 'Error creating user', error: error.message });
    }
};

// login controller
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if(!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        if(!user.isActive){
            return res.status(403).json({ message: 'User account is deactivated' });
        }

        // Compare password
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        // Generate JWT token
        const token = jwt.sign({ userId: user._id, role: user.role }, SECRET_KEY, { expiresIn: '1h' });
        //Generate refresh token
        const refreshToken = jwt.sign({ userId: user._id, tokenType: 'refresh' }, JWT_REFRESH_SECRET_KEY, { expiresIn: '7d' });
        //store refresh token in db
        user.refreshToken = refreshToken;
        user.lastLoginAt = new Date();
        await user.save();
        //Sent refresh token in http only cookie
        res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true, sameSite: 'Strict', maxAge: 7 * 24 * 60 * 60 * 1000 });
        res.status(200).json({ message: 'Login successful', token: token, user: { _id: user._id } });
    } catch (error) {
        res.status(500).json({ message: 'Error logging in', error: error.message });
    }
};

//Refresh token controller
exports.refreshToken = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({ message: 'Refresh token is required' });
        }

        // Verify refresh token
        const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET_KEY);
        if (decoded.tokenType !== 'refresh') {
            return res.status(401).json({ message: 'Invalid refresh token' });
        }

        // Find user by userId from refresh token
        const user = await User.findById(decoded.userId);
        if (!user || user.refreshToken !== refreshToken) {
            return res.status(401).json({ message: 'Invalid refresh token' });
        }

        // Generate new access token
        const newAccessToken = jwt.sign({ userId: user._id, role: user.role }, SECRET_KEY, { expiresIn: '1h' });

        res.status(200).json({ access: newAccessToken });
    } catch (error) {
        res.status(500).json({ message: 'Error refreshing token', error: error.message });
    }
};

exports.logout = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        
        // Clear refresh token from database
        await User.findByIdAndUpdate(userId, { refreshToken: null });
        
        res.clearCookie('refreshToken',{
            httpOnly: true,
            secure: true,
            sameSite: 'Strict'
        });
        res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
        res.status(500).json({ message: 'Error logging out', error: error.message });
    }
};