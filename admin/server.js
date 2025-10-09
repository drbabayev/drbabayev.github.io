#!/usr/bin/env node
/**
 * Blog Editor Server with Automatic Database Updates
 * This Node.js server handles database updates automatically
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8000;
const ROOT_DIR = path.join(__dirname, '..');
const DB_FILE = path.join(__dirname, 'articles-db.js');
const ARTICLES_DIR = path.join(__dirname, '..', 'blog', 'articles');

// MIME types for different file extensions
const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp'
};

// Create backup of database
function backupDatabase() {
    if (fs.existsSync(DB_FILE)) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(__dirname, `articles-db.backup.${timestamp}.js`);
        fs.copyFileSync(DB_FILE, backupFile);
        console.log(`✓ Backed up database to: ${path.basename(backupFile)}`);
        
        // Keep only last 5 backups
        const backups = fs.readdirSync(__dirname)
            .filter(f => f.startsWith('articles-db.backup.'))
            .sort()
            .reverse();
        
        if (backups.length > 5) {
            backups.slice(5).forEach(backup => {
                fs.unlinkSync(path.join(__dirname, backup));
            });
        }
    }
}

// Handle API requests
function handleAPI(req, res, pathname, query) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // API: Save database
    if (pathname === '/api/save-database' && req.method === 'POST') {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                if (!data || typeof data.content !== 'string' || data.content.length < 50) {
                    throw new Error('Invalid payload: missing or too short content');
                }

                // Basic validation to avoid accidental overwrites
                if (!/const\s+articlesDB\s*=\s*\{[\s\S]*?\};/m.test(data.content)) {
                    throw new Error('Validation failed: content does not contain a valid articlesDB object');
                }
                if (!/const\s+ArticlesDB\s*=\s*\{[\s\S]*?\};/m.test(data.content)) {
                    throw new Error('Validation failed: content does not contain a valid ArticlesDB helper');
                }
                
                // Backup old database
                backupDatabase();
                
                // Write new database atomically
                const tmpFile = DB_FILE + '.tmp';
                fs.writeFileSync(tmpFile, data.content, 'utf8');
                fs.renameSync(tmpFile, DB_FILE);
                
                console.log('✅ DATABASE UPDATED AUTOMATICALLY!');
                console.log(`   File: ${DB_FILE}`);
                console.log(`   Time: ${new Date().toLocaleString()}`);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    message: 'Database updated successfully',
                    timestamp: new Date().toISOString()
                }));
            } catch (error) {
                console.error('❌ Error updating database:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    error: error.message
                }));
            }
        });
        return;
    }

    // API: Save article HTML files
    if (pathname === '/api/save-article' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                // Expected: { code: "ART001", files: { "en": "<html>...", "tr": "..." } }
                if (!data || typeof data.code !== 'string' || !data.files || typeof data.files !== 'object') {
                    throw new Error('Invalid payload: requires code and files map');
                }
                const code = data.code;
                // Ensure target directory exists
                fs.mkdirSync(ARTICLES_DIR, { recursive: true });

                const written = [];
                for (const [lang, html] of Object.entries(data.files)) {
                    if (typeof html !== 'string' || html.length < 50) {
                        throw new Error(`Invalid HTML for ${lang}`);
                    }
                    const filePath = path.join(ARTICLES_DIR, `${code}-${lang}.html`);
                    const tmp = filePath + '.tmp';
                    fs.writeFileSync(tmp, html, 'utf8');
                    fs.renameSync(tmp, filePath);
                    written.push(`/blog/articles/${code}-${lang}.html`);
                }

                console.log(`📝 Saved article ${code}: ${written.join(', ')}`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, written }));
            } catch (error) {
                console.error('❌ Error saving article:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: error.message }));
            }
        });
        return;
    }

    // API: Delete article HTML files
    if (pathname === '/api/delete-article' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                // Expected: { code: "ART001", languages?: ["en", ...] }
                if (!data || typeof data.code !== 'string') {
                    throw new Error('Invalid payload: requires code');
                }
                const code = data.code;
                const langs = Array.isArray(data.languages) && data.languages.length
                    ? data.languages
                    : ['en','tr','az','de'];

                const deleted = [];
                fs.mkdirSync(ARTICLES_DIR, { recursive: true });
                langs.forEach(lang => {
                    const filePath = path.join(ARTICLES_DIR, `${code}-${lang}.html`);
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                        deleted.push(`/blog/articles/${code}-${lang}.html`);
                    }
                });

                console.log(`🗑️  Deleted article ${code}: ${deleted.join(', ') || '(no files found)'}`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, deleted }));
            } catch (error) {
                console.error('❌ Error deleting article:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: error.message }));
            }
        });
        return;
    }
    
    // API: Get database status
    if (pathname === '/api/database-status' && req.method === 'GET') {
        try {
            const stats = fs.statSync(DB_FILE);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                exists: true,
                size: stats.size,
                modified: stats.mtime,
                path: DB_FILE
            }));
        } catch (error) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                exists: false,
                error: error.message
            }));
        }
        return;
    }
    
    // Unknown API endpoint
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unknown API endpoint' }));
}

// Serve static files
function serveStaticFile(req, res, filePath) {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('404 - File Not Found');
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('500 - Internal Server Error');
            }
            return;
        }
        
        const ext = path.extname(filePath);
        const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
        
        res.writeHead(200, { 'Content-Type': mimeType });
        res.end(data);
    });
}

// Create HTTP server
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    let pathname = parsedUrl.pathname;
    
    console.log(`${req.method} ${pathname}`);
    
    // Handle API requests
    if (pathname.startsWith('/api/')) {
        handleAPI(req, res, pathname, parsedUrl.query);
        return;
    }
    
    // Serve index.html for root
    if (pathname === '/') {
        pathname = '/index.html';
    }
    
    // Build file path
    const filePath = path.join(ROOT_DIR, pathname);
    
    // Security check: prevent directory traversal
    if (!filePath.startsWith(ROOT_DIR)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('403 - Forbidden');
        return;
    }
    
    // Serve the file
    serveStaticFile(req, res, filePath);
});

// Start server
server.listen(PORT, () => {
    console.log('==========================================');
    console.log('🚀 Blog Editor Server with Auto-Update');
    console.log('==========================================');
    console.log(`🌐 Server running at:`);
    console.log(`   http://localhost:${PORT}/`);
    console.log(`   http://localhost:${PORT}/admin/index.html`);
    console.log('');
    console.log('✨ Features:');
    console.log('   • Automatic database updates');
    console.log('   • No file downloads needed');
    console.log('   • Automatic backups');
    console.log('   • Just click "Save to DB" and done!');
    console.log('');
    console.log('📁 Database: /admin/articles-db.js');
    console.log('💾 Backups: /admin/articles-db.backup.*.js');
    console.log('');
    console.log('⚠️  Press Ctrl+C to stop');
    console.log('==========================================');
    console.log('');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down server...');
    server.close(() => {
        console.log('👋 Server stopped. Goodbye!');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n\n🛑 Shutting down server...');
    server.close(() => {
        console.log('👋 Server stopped. Goodbye!');
        process.exit(0);
    });
});

