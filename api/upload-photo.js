import { Dropbox } from 'dropbox';

/**
 * Handler para fazer upload de fotos de contestação no Dropbox
 */
export default async function handler(req, res) {
    const origin = req.headers.origin;
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });
    }

    try {
        // Obter IP do usuário
        const ip = getClientIP(req);

        // Obter dados do formulário
        const formData = await parseFormData(req);

        if (!formData.photo) {
            return res.status(400).json({
                success: false,
                error: 'Missing data'
            });
        }

        const photoBuffer = formData.photo.buffer;

        // Inicializar cliente Dropbox
        const dbx = new Dropbox({
            clientId: process.env.DROPBOX_APP_KEY,
            clientSecret: process.env.DROPBOX_APP_SECRET,
            refreshToken: process.env.DROPBOX_REFRESH_TOKEN
        });

        // Gerar nome do arquivo com IP
        const fileName = generatePhotoFileName(ip);

        // Upload da foto para Dropbox
        await dbx.filesUpload({
            path: fileName,
            contents: photoBuffer,
            mode: 'add',
            autorename: true
        });

        // Resposta de sucesso
        return res.status(200).json({
            success: true,
            message: 'Information registered successfully',
            fileName: fileName
        });

    } catch (error) {
        console.error('[Error]', {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });

        return res.status(500).json({
            success: false,
            error: 'Error processing information',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

/**
 * Obtém o IP real do cliente
 */
function getClientIP(req) {
    const forwarded = req.headers['x-forwarded-for'];

    if (forwarded) {
        // Retorna o primeiro IP da lista
        return forwarded.split(',')[0].trim();
    }

    return req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        'IP not available';
}

/**
 * Parse FormData manualmente (compatível com Vercel)
 */
async function parseFormData(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];

        req.on('data', (chunk) => {
            chunks.push(chunk);
        });

        req.on('end', () => {
            try {
                const buffer = Buffer.concat(chunks);
                const boundary = req.headers['content-type'].split('boundary=')[1];

                const parts = buffer.toString('binary').split(`--${boundary}`);
                const formData = {};

                for (let part of parts) {
                    if (part.includes('Content-Disposition')) {
                        const nameMatch = part.match(/name="([^"]+)"/);
                        if (!nameMatch) continue;

                        const fieldName = nameMatch[1];
                        const contentStart = part.indexOf('\r\n\r\n') + 4;
                        const contentEnd = part.lastIndexOf('\r\n');

                        if (fieldName === 'photo') {
                            // Extrair dados binários da foto
                            const binaryData = part.substring(contentStart, contentEnd);
                            formData.photo = {
                                buffer: Buffer.from(binaryData, 'binary')
                            };
                        } else {
                            // Dados de texto (metadata)
                            formData[fieldName] = part.substring(contentStart, contentEnd);
                        }
                    }
                }

                resolve(formData);
            } catch (error) {
                reject(error);
            }
        });

        req.on('error', reject);
    });
}

/**
 * Gera nome único para o arquivo de foto incluindo IP
 */
function generatePhotoFileName(ip) {
    const timestamp = Date.now();
    // Sanitizar IP removendo caracteres inválidos para nome de arquivo
    const sanitizedIP = ip.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `/report/${timestamp}_picture_from_${sanitizedIP}.jpg`;
}