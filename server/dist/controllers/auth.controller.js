"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.updateProfile = exports.getMe = exports.login = exports.signup = void 0;
const user_1 = __importDefault(require("../model/user"));
const signup = async (req, res) => {
    try {
        const { name, username, password, confirmPassword, location, area, profilePhoto } = req.body;
        if (!name || typeof name !== "string" || !name.trim()) {
            return res.status(400).json({ success: false, message: "Full Name is required." });
        }
        if (!username || typeof username !== "string" || !username.trim()) {
            return res.status(400).json({ success: false, message: "Username is required." });
        }
        if (!password || typeof password !== "string" || !password.trim()) {
            return res.status(400).json({ success: false, message: "Password is required." });
        }
        if (confirmPassword && password !== confirmPassword) {
            return res.status(400).json({ success: false, message: "Passwords do not match." });
        }
        const normalizedUsername = username.trim().toLowerCase();
        const existingUser = await user_1.default.findOne({ username: normalizedUsername });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Username is already taken." });
        }
        // Determine stored profilePhoto path
        let photoPath = req.file ? `/uploads/profile/${req.file.filename}` : profilePhoto || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";
        // Safe location parsing
        let parsedLocation = {
            area: null,
            latitude: null,
            longitude: null,
        };
        if (location) {
            if (typeof location === "string") {
                try {
                    const parsed = JSON.parse(location);
                    parsedLocation = {
                        area: parsed.area ?? area ?? null,
                        latitude: parsed.latitude !== undefined && parsed.latitude !== null ? Number(parsed.latitude) : null,
                        longitude: parsed.longitude !== undefined && parsed.longitude !== null ? Number(parsed.longitude) : null,
                    };
                }
                catch {
                    parsedLocation = {
                        area: location || area || null,
                        latitude: req.body.latitude ? Number(req.body.latitude) : null,
                        longitude: req.body.longitude ? Number(req.body.longitude) : null,
                    };
                }
            }
            else if (typeof location === "object") {
                parsedLocation = {
                    area: location.area ?? area ?? null,
                    latitude: location.latitude !== undefined && location.latitude !== null ? Number(location.latitude) : null,
                    longitude: location.longitude !== undefined && location.longitude !== null ? Number(location.longitude) : null,
                };
            }
        }
        else {
            parsedLocation = {
                area: area || null,
                latitude: req.body.latitude ? Number(req.body.latitude) : null,
                longitude: req.body.longitude ? Number(req.body.longitude) : null,
            };
        }
        // Storing password as plain text string intentionally for prototype as specified
        const newUser = new user_1.default({
            name: name.trim(),
            username: normalizedUsername,
            password: password.trim(),
            profilePhoto: photoPath,
            location: parsedLocation,
        });
        await newUser.save();
        // DO NOT automatically log in after signup (No req.session.userId)
        const safeUser = {
            id: newUser._id.toString(),
            username: newUser.username,
            name: newUser.name,
            profilePhoto: newUser.profilePhoto,
            location: newUser.location,
        };
        return res.status(201).json({
            success: true,
            message: "Account created successfully. Please login.",
            user: safeUser,
        });
    }
    catch (error) {
        console.error("signup error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to create account",
        });
    }
};
exports.signup = signup;
const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "Username and password are required.",
            });
        }
        const normalizedUsername = username.trim().toLowerCase();
        const user = await user_1.default.findOne({ username: normalizedUsername });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid username or password.",
            });
        }
        // Prototype plain string comparison
        if (user.password !== password.trim()) {
            return res.status(401).json({
                success: false,
                message: "Invalid username or password.",
            });
        }
        // Set session
        req.session.userId = user._id.toString();
        const safeUser = {
            id: user._id.toString(),
            username: user.username,
            name: user.name,
            profilePhoto: user.profilePhoto,
            location: user.location,
        };
        return res.status(200).json({
            success: true,
            message: "Logged in successfully",
            user: safeUser,
        });
    }
    catch (error) {
        console.error("login error:", error);
        return res.status(500).json({
            success: false,
            message: "Login failed",
        });
    }
};
exports.login = login;
const getMe = async (req, res) => {
    try {
        const userId = req.session?.userId;
        if (!userId) {
            return res.status(200).json({
                success: true,
                authenticated: false,
                user: null,
            });
        }
        const user = await user_1.default.findById(userId).select("-password");
        if (!user) {
            return res.status(200).json({
                success: true,
                authenticated: false,
                user: null,
            });
        }
        return res.status(200).json({
            success: true,
            authenticated: true,
            user: {
                id: user._id.toString(),
                username: user.username,
                name: user.name,
                profilePhoto: user.profilePhoto,
                location: user.location,
                createdAt: user.createdAt,
            },
        });
    }
    catch (error) {
        console.error("getMe error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch user session",
        });
    }
};
exports.getMe = getMe;
const updateProfile = async (req, res) => {
    try {
        const userId = req.session?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Please login to edit profile.",
            });
        }
        const { name, area, latitude, longitude } = req.body;
        const user = await user_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        if (name && typeof name === "string" && name.trim()) {
            user.name = name.trim();
        }
        if (req.file) {
            user.profilePhoto = `/uploads/profile/${req.file.filename}`;
        }
        if (!user.location) {
            user.location = { area: null, latitude: null, longitude: null };
        }
        if (area !== undefined) {
            user.location.area = area ? area.trim() : null;
        }
        if (latitude !== undefined && latitude !== null && !isNaN(Number(latitude))) {
            user.location.latitude = Number(latitude);
        }
        if (longitude !== undefined && longitude !== null && !isNaN(Number(longitude))) {
            user.location.longitude = Number(longitude);
        }
        await user.save();
        const safeUser = {
            id: user._id.toString(),
            username: user.username,
            name: user.name,
            profilePhoto: user.profilePhoto,
            location: user.location,
            createdAt: user.createdAt,
        };
        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: safeUser,
        });
    }
    catch (error) {
        console.error("updateProfile error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update profile",
        });
    }
};
exports.updateProfile = updateProfile;
const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Logout session destroy error:", err);
            return res.status(500).json({
                success: false,
                message: "Failed to log out",
            });
        }
        res.clearCookie("connect.sid");
        return res.status(200).json({
            success: true,
            message: "Logged out successfully",
        });
    });
};
exports.logout = logout;
//# sourceMappingURL=auth.controller.js.map