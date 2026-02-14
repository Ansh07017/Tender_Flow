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
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = payload?.email;

    if (!email) return res.status(400).json({ error: "Invalid Google Token" });

    // Check if user exists, if not create placeholder
    let result = await query("SELECT * FROM vault_access WHERE recovery_email = $1", [email]);
    
    if (result.rows.length === 0) {
      // Auto-register logic for demo purposes
      await query("INSERT INTO vault_access (recovery_email) VALUES ($1)", [email]);
      result = await query("SELECT * FROM vault_access WHERE recovery_email = $1", [email]);
    }

    const user = result.rows[0];

    res.json({
      email: user.recovery_email,
      is_setup_complete: user.is_setup_complete,
      has_pin: !!user.pin_hash
    });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
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