"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
const requireAuth = (req, res, next) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({
            success: false,
            message: "Please login to continue.",
        });
    }
    next();
};
exports.requireAuth = requireAuth;
//# sourceMappingURL=auth.middleware.js.map