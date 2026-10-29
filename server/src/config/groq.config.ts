import dotenv from "dotenv";
import path from "path";
import Groq from "groq-sdk";

// Robustly load environment variables from server/.env or root .env
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), "server/.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export const getGroqClient = (): Groq => {
  const apiKey = process.env.GROQ_API_KEY;
  return new Groq({ apiKey });
};

// Create a proxy so whenever groq.chat or any property is accessed,
// it uses the current process.env.GROQ_API_KEY rather than a stale undefined key.
let cachedGroq: Groq | null = null;
let cachedKey: string | undefined = undefined;

const groqProxy = new Proxy({} as Groq, {
  get(_target, prop: string | symbol) {
    const currentKey = process.env.GROQ_API_KEY;
    if (!cachedGroq || cachedKey !== currentKey) {
      cachedKey = currentKey;
      cachedGroq = new Groq({ apiKey: currentKey });
    }
    const val = (cachedGroq as any)[prop];
    return typeof val === "function" ? val.bind(cachedGroq) : val;
  },
});

export default groqProxy;
