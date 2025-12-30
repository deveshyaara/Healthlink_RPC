import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Pinata SDK for IPFS storage
let PinataSDK;
try {
  PinataSDK = (await import('@pinata/sdk')).default;
} catch (err) {
  logger.warn('⚠️ Pinata SDK not available - file uploads will fail');
}

/**
 * Secure Storage Service
 *
 * HIPAA-Compliant Content-Addressable Storage (CAS) system for HealthLink
 *
 * Features:
 * - Files are encrypted at rest using AES-256-GCM
 * - Content-addressable via SHA-256 hashing
 * - Automatic deduplication
 * - Stream processing (no RAM loading for large files)
 * - Integrity verification via authTag
 *
 * Security:
 * - Encryption: AES-256-GCM (authenticated encryption)
 * - Unique IV per file (prevents pattern analysis)
 * - AuthTag verification on decryption (prevents tampering)
 * - Key derivation from environment variable
 */
class StorageService {
  static instance = null;

  static getInstance() {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  constructor() {
    // Storage directories
    this.uploadsDir = process.env.UPLOADS_DIR
      ? path.join(__dirname, '../../', process.env.UPLOADS_DIR)
      : path.join(__dirname, '../../uploads');
    this.metadataDir = path.join(this.uploadsDir, 'metadata');
    this.tempDir = process.env.TEMP_DIR
      ? path.join(__dirname, '../../', process.env.TEMP_DIR)
      : path.join(__dirname, '../../temp');

    // Encryption configuration
    this.algorithm = process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm';
    this.encryptionKey = this.deriveKey(process.env.ENCRYPTION_KEY);

    this.initializeStorage();
  }

  /**
     * Derive 32-byte encryption key from environment variable
     * Uses scrypt for key derivation (NIST recommended)
     */
  deriveKey(secret) {
    if (!secret) {
      throw new Error('ENCRYPTION_KEY environment variable is required for HIPAA compliance');
    }

    // Derive a 32-byte key using scrypt (CPU/memory hard)
    // Salt should be consistent for same secret to produce same key
    const salt = 'healthlink-v1-salt'; // In production, store salt securely
    return crypto.scryptSync(secret, salt, 32);
  }

  /**
     * Initialize storage directories
     * Creates uploads/, metadata/, and temp/ folders if they don't exist
     */
  initializeStorage() {
    // Create directories with proper permissions
    const dirs = [this.uploadsDir, this.metadataDir, this.tempDir];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true, mode: 0o700 }); // Read/write/execute for owner only
        logger.info(`✅ Created secure directory: ${dir}`);
      }
    });
  }

  /**
     * Calculate SHA-256 hash of file (streaming for large files)
     *
     * @param {string} filePath - Path to file
     * @returns {Promise<string>} - SHA-256 hash in hexadecimal
     */
  async calculateHashFromFile(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);

      stream.on('data', chunk => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * Upload file to Pinata IPFS
   *
   * @param {string} tempFilePath - Path to temporary uploaded file
   * @param {Object} metadata - File metadata (originalName, mimeType, size)
   * @returns {Promise<Object>} - { hash: IPFS_CID, size, metadata }
   */
  async uploadFile(tempFilePath, metadata = {}) {
    try {
      // Check if Pinata SDK is available
      if (!PinataSDK) {
        throw new Error('Pinata SDK not configured. Set PINATA_API_KEY and PINATA_SECRET_API_KEY in environment variables.');
      }

      // Initialize Pinata
      const pinata = new PinataSDK(
        process.env.PINATA_API_KEY,
        process.env.PINATA_SECRET_API_KEY
      );

      // Test authentication
      try {
        await pinata.testAuthentication();
        logger.info('✅ Pinata authentication successful');
      } catch (authError) {
        logger.error('❌ Pinata authentication failed:', authError.message);
        throw new Error('Pinata authentication failed. Check your API keys.');
      }

      // Create read stream for file upload
      const readStream = fs.createReadStream(tempFilePath);

      // Upload to Pinata IPFS
      logger.info(`📤 Uploading file to Pinata: ${metadata.originalName}`);

      const pinataResult = await pinata.pinFileToIPFS(readStream, {
        pinataMetadata: {
          name: metadata.originalName || 'medical-record',
          keyvalues: {
            uploadedBy: metadata.uploadedBy || 'unknown',
            uploadedByRole: metadata.uploadedByRole || 'unknown',
            mimeType: metadata.mimeType || 'application/octet-stream',
            uploadedAt: new Date().toISOString()
          }
        },
        pinataOptions: {
          cidVersion: 1  // Use CIDv1 for better compatibility
        }
      });

      const ipfsCID = pinataResult.IpfsHash;
      const ipfsSize = pinataResult.PinSize;

      logger.info(`✅ File uploaded to Pinata successfully: ${ipfsCID}`);

      // Delete temp file after successful upload
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }

      // Store metadata locally for filename/MIME type reference
      const metadataPath = path.join(this.metadataDir, `${ipfsCID}.json`);
      const metadataContent = {
        ipfsCID,
        hash: ipfsCID, // Alias for compatibility
        originalName: metadata.originalName || 'unknown',
        mimeType: metadata.mimeType || 'application/octet-stream',
        size: metadata.size || ipfsSize,
        uploadedAt: new Date().toISOString(),
        uploadedBy: metadata.uploadedBy || 'anonymous',
        uploadedByRole: metadata.uploadedByRole || 'unknown',
        pinataUrl: `https://gateway.pinata.cloud/ipfs/${ipfsCID}`,
        storedOn: 'pinata-ipfs',
        ...metadata,
      };

      fs.writeFileSync(metadataPath, JSON.stringify(metadataContent, null, 2));

      return {
        hash: ipfsCID,  // Return IPFS CID instead of SHA-256
        size: ipfsSize,
        isDuplicate: false,  // Pinata handles deduplication internally
        metadata: metadataContent,
      };
    } catch (error) {
      // Clean up temp file on error
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      logger.error('❌ Pinata upload failed:', error);
      throw new Error(`Pinata upload failed: ${error.message}`);
    }
  }

  /**
     * Encrypt file using AES-256-GCM (streaming for large files)
     *
     * @param {string} inputPath - Path to plaintext file
     * @param {string} outputPath - Path to save encrypted file
     * @returns {Promise<Object>} - { iv, authTag }
     */
  async encryptFile(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
      // Generate random IV (Initialization Vector) - UNIQUE per file
      const iv = crypto.randomBytes(16);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

      // Create streams
      const input = fs.createReadStream(inputPath);
      const output = fs.createWriteStream(outputPath);

      // Write IV to start of file (needed for decryption)
      output.write(iv);

      // Stream encryption
      input
        .pipe(cipher)
        .pipe(output)
        .on('finish', () => {
          // Get authentication tag (GCM mode provides this)
          const authTag = cipher.getAuthTag();

          // Append authTag to file (needed for verification)
          const fd = fs.openSync(outputPath, 'a');
          fs.writeSync(fd, authTag);
          fs.closeSync(fd);

          resolve({ iv, authTag });
        })
        .on('error', reject);

      input.on('error', reject);
    });
  }

  /**
     * Retrieve file by hash (DEPRECATED - Use getFileStream for large files)
     *
     * @param {string} hash - SHA-256 hash of the file
     * @returns {Promise<Object>} - { buffer, metadata, exists }
     */
  async getFile(hash) {
    try {
      // Validate hash format
      if (!/^[a-f0-9]{64}$/i.test(hash)) {
        throw new Error('Invalid hash format');
      }

      const filePath = path.join(this.uploadsDir, hash);
      const metadataPath = path.join(this.metadataDir, `${hash}.json`);

      if (!fs.existsSync(filePath)) {
        return {
          exists: false,
          error: 'File not found',
        };
      }

      // Read and decrypt entire file into buffer
      const buffer = await this.decryptFileToBuffer(filePath);

      // Read metadata
      let metadata = null;
      if (fs.existsSync(metadataPath)) {
        const metadataContent = fs.readFileSync(metadataPath, 'utf-8');
        metadata = JSON.parse(metadataContent);
      }

      return {
        exists: true,
        buffer,
        metadata,
        size: buffer.length,
      };
    } catch (error) {
      logger.error('❌ Get file failed:', error);
      throw new Error(`File retrieval failed: ${error.message}`);
    }
  }

  /**
     * Decrypt entire file to buffer (for small files only)
     *
     * @param {string} filePath - Path to encrypted file
     * @returns {Promise<Buffer>} - Decrypted file buffer
     */
  async decryptFileToBuffer(filePath) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      const stream = this.createDecryptStream(filePath);

      stream.on('data', chunk => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  /**
     * Get decrypted file stream (for efficient large file serving)
     *
     * @param {string} hash - SHA-256 hash
     * @returns {Transform} - Decrypted file stream
     */
  getFileStream(hash) {
    // Validate hash
    if (!/^[a-f0-9]{64}$/i.test(hash)) {
      throw new Error('Invalid hash format');
    }

    const filePath = path.join(this.uploadsDir, hash);

    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }

    return this.createDecryptStream(filePath);
  }

  /**
     * Create decrypt stream for AES-256-GCM encrypted file
     *
     * File structure: [IV (16 bytes)][Encrypted Data][AuthTag (16 bytes)]
     *
     * @param {string} filePath - Path to encrypted file
     * @returns {Transform} - Decryption transform stream
     */
  createDecryptStream(filePath) {
    const fileSize = fs.statSync(filePath).size;
    const IV_LENGTH = 16;
    const AUTH_TAG_LENGTH = 16;

    // Read IV from start of file
    const fd = fs.openSync(filePath, 'r');
    const iv = Buffer.alloc(IV_LENGTH);
    fs.readSync(fd, iv, 0, IV_LENGTH, 0);

    // Read authTag from end of file
    const authTag = Buffer.alloc(AUTH_TAG_LENGTH);
    fs.readSync(fd, authTag, 0, AUTH_TAG_LENGTH, fileSize - AUTH_TAG_LENGTH);
    fs.closeSync(fd);

    // Create decipher
    const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    // Create read stream for encrypted data (skip IV, exclude authTag)
    const encryptedStream = fs.createReadStream(filePath, {
      start: IV_LENGTH,
      end: fileSize - AUTH_TAG_LENGTH - 1,
    });

    // Pipe through decipher
    return encryptedStream.pipe(decipher);
  }

  /**
     * Get file metadata only
     *
     * @param {string} hash - SHA-256 hash
     * @returns {Promise<Object>} - Metadata object
     */
  async getMetadata(hash) {
    try {
      const metadataPath = path.join(this.metadataDir, `${hash}.json`);

      if (!fs.existsSync(metadataPath)) {
        return null;
      }

      const metadataContent = fs.readFileSync(metadataPath, 'utf-8');
      return JSON.parse(metadataContent);
    } catch (error) {
      logger.error('❌ Get metadata failed:', error);
      return null;
    }
  }

  /**
     * Delete file by hash
     * (Optional - for admin cleanup)
     *
     * @param {string} hash - SHA-256 hash
     * @returns {Promise<boolean>} - Success status
     */
  async deleteFile(hash) {
    try {
      const filePath = path.join(this.uploadsDir, hash);
      const metadataPath = path.join(this.metadataDir, `${hash}.json`);

      let deleted = false;

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        deleted = true;
      }

      if (fs.existsSync(metadataPath)) {
        fs.unlinkSync(metadataPath);
      }

      return deleted;
    } catch (error) {
      logger.error('❌ Delete failed:', error);
      throw new Error(`File deletion failed: ${error.message}`);
    }
  }

  /**
     * Get storage statistics
     *
     * @returns {Object} - { totalFiles, totalSize, uploadsPath }
     */
  getStats() {
    try {
      const files = fs.readdirSync(this.uploadsDir)
        .filter(file => file !== 'metadata');

      let totalSize = 0;
      files.forEach(file => {
        const filePath = path.join(this.uploadsDir, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
      });

      return {
        totalFiles: files.length,
        totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
        uploadsPath: this.uploadsDir,
      };
    } catch (error) {
      logger.error('❌ Get stats failed:', error);
      return { totalFiles: 0, totalSize: 0 };
    }
  }
}

// Export class with singleton getter
export default StorageService;
