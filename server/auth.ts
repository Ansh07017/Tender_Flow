import { Request, Response } from 'express';
import { query } from './db';
import { OAuth2Client } from 'google-auth-library';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import bcrypt from 'bcrypt';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const SALT_ROUNDS = 10;
export const login = async (req: Request, res: Response) => {
  const { token } = req.body;
  try {
    // 1. Verify Google Token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = payload?.email;

    if (!email) return res.status(400).json({ error: "Invalid Google Token" });

    console.log(`[AUTH] Attempting login for: ${email}`);

    // 2. Database Query
    let result = await query("SELECT * FROM vault_access WHERE recovery_email = $1", [email]);
    
    if (result.rows.length === 0) {
      console.log(`[AUTH] New user detected. Registering...`);
      await query("INSERT INTO vault_access (recovery_email, is_setup_complete) VALUES ($1, false)", [email]);
      result = await query("SELECT * FROM vault_access WHERE recovery_email = $1", [email]);
    }

    const user = result.rows[0];
    console.log(`[AUTH] Success! Setup complete: ${user.is_setup_complete}`);

    res.json({
      email: user.recovery_email,
      is_setup_complete: user.is_setup_complete,
      has_pin: !!user.pin_hash
    });
  } catch (err: any) {
    // THIS WILL SHOW THE REAL ERROR IN YOUR TERMINAL
    console.error("🔥 LOGIN ERROR DETAILS:", err.message);
    res.status(500).json({ error: "Login failed", details: err.message });
  }
};

// --- NEW FUNCTION: Handles "Set Master PIN" ---
export const setupPin = async (req: Request, res: Response) => {
  const { email, pin } = req.body;
  
  if (!pin || pin.length !== 6) {
    return res.status(400).json({ error: "Invalid PIN format" });
  }

  try {
    const hashedPin = await bcrypt.hash(pin, SALT_ROUNDS);
    await query(
      "UPDATE vault_access SET pin_hash = $1 WHERE recovery_email = $2", 
      [hashedPin, email]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to set PIN" });
  }
};
/**
 * 1. PRIMARY ACCESS & RECOVERY
 * Handles PIN verification and Google OAuth fallback
 */

export const verifyVaultAccess = async (req: Request, res: Response) => {
  const { pin, googleToken, mode, email } = req.body;

  // MODE 1: Standard PIN Access
  if (mode === 'PIN') {
    try {
      const result = await query("SELECT * FROM vault_access WHERE recovery_email = $1", [email]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "No vault account associated with this email." });
      }

      const user = result.rows[0];
      
      // Dynamic Bcrypt Comparison
      const isMatch = await bcrypt.compare(pin, user.pin_hash);
      
      if (isMatch) {
        // Check if 2FA is required before granting full access
        if (user.is_2fa_enabled) {
          return res.json({ 
            success: true, 
            requires2FA: true, 
            message: "PIN verified. Secondary authentication required." 
          });
        }
        return res.json({ success: true, token: "session_token_approved" });
      }
      
      return res.status(401).json({ error: "Invalid 6-digit PIN." });
    } catch (err) {
      return res.status(500).json({ error: "Database verification failed." });
    }
  }

  // MODE 2: Recovery via Google Auth
  if (mode === 'RECOVERY') {
    try {
      const ticket = await client.verifyIdToken({
        idToken: googleToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      
      if (payload?.email === email) {
        return res.json({ 
          success: true, 
          message: "Identity confirmed via Google. You may now reset your PIN." 
        });
      }
      return res.status(403).json({ error: "Google account does not match registered recovery email." });
    } catch (err) {
      return res.status(403).json({ error: "Google authentication failed." });
    }
  }
};

/**
 * 2. 2FA SETUP (Enrolment)
 * Generates the QR Code for Google/Microsoft Authenticator
 */
export const setup2FA = async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    const secret = speakeasy.generateSecret({
      name: `TenderFlow (${email})`,
    });

    // Save secret to PostgreSQL dynamically
    const updateResult = await query(
      "UPDATE vault_access SET two_fa_secret = $1 WHERE recovery_email = $2",
      [secret.base32, email]
    );

    if (updateResult.rowCount === 0) {
      return res.status(404).json({ error: "Account not found." });
    }

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);
    
    res.json({ 
      qrCode: qrCodeUrl, 
      manualCode: secret.base32 
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to initialize 2FA setup." });
  }
};

// server/auth.ts

// --- 1. Check if Email Exists (Used by SignInScreen) ---
export const checkEmail = async (req: Request, res: Response) => {
  const { email } = req.body;
  try {
    const result = await query("SELECT id FROM vault_access WHERE recovery_email = $1", [email]);
    res.json({ exists: result.rows.length > 0 });
  } catch (err) {
    res.status(500).json({ error: "Database check failed" });
  }
};

// --- 2. Generate & "Send" OTP ---
export const sendAuthOtp = async (req: Request, res: Response) => {
  const { email } = req.body;
  
  // Generate a random 6-digit code
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Set expiry to 10 minutes from now
  const expiry = new Date(Date.now() + 10 * 60 * 1000);

  try {
    // Upsert: Update if exists, Insert if new
    const checkUser = await query("SELECT id FROM vault_access WHERE recovery_email = $1", [email]);
    
    if (checkUser.rows.length > 0) {
      await query(
        "UPDATE vault_access SET reset_token = $1, reset_token_expiry = $2 WHERE recovery_email = $3",
        [otp, expiry, email]
      );
    } else {
      await query(
        "INSERT INTO vault_access (recovery_email, reset_token, reset_token_expiry, is_setup_complete) VALUES ($1, $2, $3, false)",
        [email, otp, expiry]
      );
    }

    // SIMULATE EMAIL SENDING (Logs to your VS Code Terminal)
    console.log(`\n================================`);
    console.log(`🔑 DEMO OTP for ${email}: ${otp}`);
    console.log(`================================\n`);

    res.json({ success: true, message: "OTP sent" });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate OTP" });
  }
};

// --- 3. Verify OTP ---
export const verifyAuthOtp = async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  try {
    const result = await query("SELECT * FROM vault_access WHERE recovery_email = $1", [email]);
    
    if (result.rows.length === 0) return res.status(400).json({ error: "User not found" });

    const user = result.rows[0];

    // Check if OTP matches and hasn't expired
    const now = new Date();
    const expiry = new Date(user.reset_token_expiry);

    if (user.reset_token === otp && expiry > now) {
      // Clear the used token
      await query("UPDATE vault_access SET reset_token = NULL, reset_token_expiry = NULL WHERE id = $1", [user.id]);
      
      res.json({ 
        success: true, 
        is_setup_complete: user.is_setup_complete,
        has_pin: !!user.pin_hash
      });
    } else {
      res.status(400).json({ error: "Invalid or expired OTP" });
    }
  } catch (err) {
    res.status(500).json({ error: "Verification failed" });
  }
};

/**
 * 3. 2FA VERIFICATION
 * Validates the 6-digit TOTP from the app
 */
export const verify2FA = async (req: Request, res: Response) => {
  const { userCode, email } = req.body;

  try {
    const result = await query(
      "SELECT two_fa_secret FROM vault_access WHERE recovery_email = $1",
      [email]
    );
    
    if (result.rows.length === 0) return res.status(404).json({ error: "Account not found." });
    const secret = result.rows[0].two_fa_secret;

    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: userCode,
      window: 1 
    });
    
    if (verified) {
      await query("UPDATE vault_access SET is_2fa_enabled = true WHERE recovery_email = $1", [email]);
      res.json({ success: true, message: "2FA Verified. Vault Unlocked." });
    } else {
      res.status(401).json({ success: false, message: "Invalid Authenticator Code." });
    }
  } catch (err) {
    res.status(500).json({ error: "2FA verification error." });
  }
};