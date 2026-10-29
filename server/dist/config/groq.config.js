"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGroqClient = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const groq_sdk_1 = __importDefault(require("groq-sdk"));
// Robustly load environment variables from server/.env or root .env
dotenv_1.default.config();
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, "../../.env") });
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), "server/.env") });
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), ".env") });
const getGroqClient = () => {
    const apiKey = process.env.GROQ_API_KEY;
    return new groq_sdk_1.default({ apiKey });
};
exports.getGroqClient = getGroqClient;
// Create a proxy so whenever groq.chat or any property is accessed,
// it uses the current process.env.GROQ_API_KEY rather than a stale undefined key.
let cachedGroq = null;
let cachedKey = undefined;
const groqProxy = new Proxy({}, {
    get(_target, prop) {
        const currentKey = process.env.GROQ_API_KEY;
        if (!cachedGroq || cachedKey !== currentKey) {
            cachedKey = currentKey;
            cachedGroq = new groq_sdk_1.default({ apiKey: currentKey });
        }
        const val = cachedGroq[prop];
        return typeof val === "function" ? val.bind(cachedGroq) : val;
    },
});
exports.default = groqProxy;
//# sourceMappingURL=groq.config.js.map