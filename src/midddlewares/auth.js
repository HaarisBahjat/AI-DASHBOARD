const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/db').User;

const authMiddleware = async (req, res, next) => {
      try {
        //Verify token and find user
        const token = req.header('Authorization').replace('Bearer ', '');
        const decoded = jwt.verify(token, 'your_jwt_secret_key');
        const user = await User.findById(decoded._id);
        if (!user) {
          throw new Error('User not found');
        }
        //Attach user to request
        req.user = {
            _id: user._id,
            email: user.email,
            role: user.role
        };
        next();
      } catch (error) {
        res.status(401).send({ error: 'Invalid or expired token.' });
      }
        }
        module.exports = authMiddleware;