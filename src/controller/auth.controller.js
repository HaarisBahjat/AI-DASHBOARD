const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const e = require('express');
const SECRET_KEY = 'your_secret_key';

// signup controller
exports.signup = async (req, res) => {
    try {
        const { username, password, email } = req.body;
        if(!username || !password || password.length < 6 || !email) {
            return res.status(400).json({ message: 'Username, email and password are required' });
        }
     //check if user exists 
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }

       // Hash password and create user
        const hashedPassword = await bcrypt.hash(password, 10);
       const user= await User.create({ username, password: hashedPassword, email,Role:"USER" });
        res.status(201).json({ message: 'User created successfully', userId: user._id });
    } catch (error) {
        res.status(500).json({ message: 'Error creating user', error });
    }
};

// login controller
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        if(!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }

        // Find user by username
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: 'Invalid username or password' });
        }

        if(!user.isActive){
            return res.status(403).json({ message: 'User account is deactivated' });
        }

        // Compare password
        const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid username or password' });
        }

        // Generate JWT token
        const token = jwt.sign({ userId: user._id, role: user.role }, SECRET_KEY, { expiresIn: '1h' });
        //Generate refresh token
        const refreshToken = jwt.sign({ userId: user._id, tokenType: 'refresh' }, SECRET_KEY, { expiresIn: '7d' });
        //store refresh token in db
        user.refreshToken = refreshToken;
        user.lastLoginAt = new Date();
        res.status(200).json({ message: 'Login successful', token, refreshToken, userId: user._id });
        await user.save();
        //Sent refresh token in http only cookie
        res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true, sameSite: 'Strict', maxAge: 7 * 24 * 60 * 60 * 1000 });
        res.json({access: token});
    } catch (error) {
        res.status(500).json({ message: 'Error logging in', error });
    }
};

//Refresh token controller
exports.refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.cookies.refreshToken;

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

        res.json({ access: newAccessToken });
    } catch (error) {
        res.status(500).json({ message: 'Error refreshing token', error });
    }
};

exports.logout = async (req, res) => {
    try {
        const { refreshToken } = req.cookies.refreshToken;
        if (refreshToken) {
            await user.updateOne({ refreshToken }, { $unset: { refreshToken: "" } });
        }
        res.clearCookie('refreshToken',{
            httpOnly: true,
            secure: true,
            sameSite: 'Strict'
        });
        res.json({ message: 'Logout successful' });
    } catch (error) {
        res.status(500).json({ message: 'Error logging out', error });
    }
};