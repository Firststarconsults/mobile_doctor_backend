import path from 'path';

// Allowed file types for different upload contexts
const ALLOWED_FILE_TYPES = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'],
  document: ['pdf', 'doc', 'docx', 'txt', 'rtf'],
  medical: ['jpg', 'jpeg', 'png', 'pdf', 'dicom'],
  profile: ['jpg', 'jpeg', 'png', 'webp'],
  prescription: ['jpg', 'jpeg', 'png', 'pdf'],
  testResult: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx']
};

// Maximum file sizes for different types (in bytes)
const MAX_FILE_SIZES = {
  image: 10 * 1024 * 1024, // 10MB
  document: 20 * 1024 * 1024, // 20MB
  medical: 50 * 1024 * 1024, // 50MB
  profile: 5 * 1024 * 1024, // 5MB
  prescription: 10 * 1024 * 1024, // 10MB
  testResult: 20 * 1024 * 1024, // 20MB
  default: 50 * 1024 * 1024 // 50MB
};

// Dangerous file extensions to block
const DANGEROUS_EXTENSIONS = [
  'exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js', 'jar', 'sh', 'php', 'asp', 'aspx',
  'jsp', 'py', 'rb', 'pl', 'cgi', 'htaccess', 'htpasswd', 'config', 'conf', 'ini', 'log'
];

// Validate file upload
export const validateFileUpload = (fileType = 'default') => {
  return (req, res, next) => {
    try {
      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({
          message: 'No files uploaded',
          error: 'File upload is required'
        });
      }

      const files = Array.isArray(req.files.file) ? req.files.file : [req.files.file];
      const allowedTypes = ALLOWED_FILE_TYPES[fileType] || ALLOWED_FILE_TYPES.default;
      const maxSize = MAX_FILE_SIZES[fileType] || MAX_FILE_SIZES.default;

      for (const file of files) {
        // Check if file exists
        if (!file) {
          return res.status(400).json({
            message: 'Invalid file upload',
            error: 'File is missing'
          });
        }

        // Get file extension
        const ext = path.extname(file.name).toLowerCase().slice(1);
        
        // Check for dangerous extensions
        if (DANGEROUS_EXTENSIONS.includes(ext)) {
          return res.status(400).json({
            message: 'Dangerous file type not allowed',
            error: `File type .${ext} is not permitted`
          });
        }

        // Check allowed file types
        if (!allowedTypes.includes(ext)) {
          return res.status(400).json({
            message: 'Invalid file type',
            error: `Allowed file types: ${allowedTypes.join(', ')}`,
            received: ext
          });
        }

        // Check file size
        if (file.size > maxSize) {
          return res.status(400).json({
            message: 'File too large',
            error: `Maximum file size is ${maxSize / (1024 * 1024)}MB`,
            received: `${(file.size / (1024 * 1024)).toFixed(2)}MB`
          });
        }

        // Additional validation for image files
        if (fileType === 'image' || fileType === 'profile') {
          // Check MIME type
          const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
          if (!allowedMimeTypes.includes(file.mimetype)) {
            return res.status(400).json({
              message: 'Invalid image format',
              error: 'Only JPEG, PNG, GIF, and WebP images are allowed'
            });
          }
        }
      }

      next();
    } catch (error) {
      console.error('File upload validation error:', error);
      res.status(500).json({
        message: 'File validation failed',
        error: error.message
      });
    }
  };
};

// Sanitize filename
export const sanitizeFileName = (filename) => {
  const ext = path.extname(filename);
  const name = path.basename(filename, ext);
  
  // Remove special characters and replace with underscores
  const sanitizedName = name
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 50); // Limit length
  
  return `${sanitizedName}${ext}`;
};

// Check for malicious file signatures
export const checkFileSignature = (buffer) => {
  const signatures = {
    'image/jpeg': [0xFF, 0xD8, 0xFF],
    'image/png': [0x89, 0x50, 0x4E, 0x47],
    'image/gif': [0x47, 0x49, 0x46],
    'application/pdf': [0x25, 0x50, 0x44, 0x46],
    'application/zip': [0x50, 0x4B, 0x03, 0x04]
  };

  for (const [mimeType, signature] of Object.entries(signatures)) {
    if (buffer.length >= signature.length) {
      const matches = signature.every((byte, index) => buffer[index] === byte);
      if (matches) {
        return mimeType;
      }
    }
  }
  
  return null;
};
