/**
 * Migration Script: Convert Legacy API Keys and Add apiKeyId
 * 
 * This script:
 * 1. Converts all legacy (unencrypted) tmdbApiKey → encrypted tmdbApiKeyEncrypted
 * 2. Adds apiKeyId (HMAC-SHA256 hash) to ALL documents for fast lookups
 * 3. Removes the legacy tmdbApiKey field after encryption
 * 
 * Run with: node src/scripts/migrate-apiKeyId.js
 */

import mongoose from 'mongoose';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { UserConfig } from '../models/UserConfig.js';
import { encrypt, decrypt } from '../utils/encryption.js';

dotenv.config();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

function computeApiKeyId(apiKey) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is required');
  return crypto.createHmac('sha256', secret).update(apiKey).digest('hex');
}

async function migrate() {
  console.log('=== Starting Migration: Legacy Keys + apiKeyId ===\n');
  
  // Verify environment
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required');
  }
  if (!process.env.ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY is required');
  }
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required');
  }
  
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected!\n');
  
  const configs = await UserConfig.find({}).lean();
  console.log(`Found ${configs.length} configs to process\n`);
  
  let legacyConverted = 0;
  let apiKeyIdAdded = 0;
  let alreadyComplete = 0;
  let errors = 0;
  
  for (const config of configs) {
    try {
      const updates = {};
      const unsets = {};
      let rawApiKey = null;
      
      // Determine the raw API key
      if (config.tmdbApiKeyEncrypted) {
        // Decrypt to get raw key
        rawApiKey = decrypt(config.tmdbApiKeyEncrypted);
      } else if (config.tmdbApiKey) {
        // Legacy key - use directly
        rawApiKey = config.tmdbApiKey;
      }
      
      if (!rawApiKey) {
        console.log(`  [SKIP] ${config.userId}: No API key found`);
        continue;
      }
      
      // Check if already has apiKeyId
      if (config.apiKeyId && config.tmdbApiKeyEncrypted && !config.tmdbApiKey) {
        alreadyComplete++;
        continue;
      }
      
      // Convert legacy to encrypted
      if (config.tmdbApiKey && !config.tmdbApiKeyEncrypted) {
        updates.tmdbApiKeyEncrypted = encrypt(rawApiKey);
        unsets.tmdbApiKey = 1;
        legacyConverted++;
        console.log(`  [CONVERT] ${config.userId}: Legacy → Encrypted`);
      }
      
      // Add apiKeyId if missing
      if (!config.apiKeyId) {
        updates.apiKeyId = computeApiKeyId(rawApiKey);
        apiKeyIdAdded++;
        console.log(`  [ADD] ${config.userId}: Added apiKeyId`);
      }
      
      // Apply updates if any
      if (Object.keys(updates).length > 0 || Object.keys(unsets).length > 0) {
        const updateOp = {};
        if (Object.keys(updates).length > 0) {
          updateOp.$set = updates;
        }
        if (Object.keys(unsets).length > 0) {
          updateOp.$unset = unsets;
        }
        
        await UserConfig.updateOne({ _id: config._id }, updateOp);
      }
      
    } catch (err) {
      console.error(`  [ERROR] ${config.userId}: ${err.message}`);
      errors++;
    }
  }
  
  console.log('\n=== Migration Complete ===');
  console.log(`  Legacy converted to encrypted: ${legacyConverted}`);
  console.log(`  apiKeyId added: ${apiKeyIdAdded}`);
  console.log(`  Already complete: ${alreadyComplete}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Total processed: ${configs.length}`);
  
  await mongoose.disconnect();
  console.log('\nDisconnected from MongoDB');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
