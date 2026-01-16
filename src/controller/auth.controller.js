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