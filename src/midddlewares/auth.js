const express = require('express');
const jwt = require('jsonwebtoken');
const { User } = require('../models/db');
const SECRET_KEY = 'your_secret_key';

const authMiddleware = async (req, res, next) => {
      try {
        //Verify token and find user
        const authHeader = req.headers.authorization;
        console.log('Auth Header:', authHeader);
        if (!authHeader) {
          return res.status(401).json({ error: 'Authorization header missing.' });
        }
        
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
        console.log('Token:', token);
        const decoded = jwt.verify(token, SECRET_KEY);
        console.log('Decoded:', decoded);
        const user = await User.findById(decoded.userId);
        console.log('User:', user);
        if (!user) {
          return res.status(401).json({ error: 'User not found' });
        }
        //Attach user to request
        req.user = {
            _id: user._id,
          name: user.name,
            email: user.email,
            role: user.role
        };
        console.log('req.user set to:', req.user);
        next();
      } catch (error) {
        console.log('Auth Error:', error.message);
        res.status(401).json({ error: 'Invalid or expired token.' });
      }
};

module.exports = authMiddleware;