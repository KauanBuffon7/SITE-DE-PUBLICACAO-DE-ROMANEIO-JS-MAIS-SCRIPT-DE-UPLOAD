const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");

admin.initializeApp();

const bucket = admin.storage().bucket();

exports.serveFile = onRequest(
  { region: "southamerica-east1" },
  async (req, res) => {
    logger.info("Iniciando a entrega de arquivo.", { structuredData: true });

    try {
      const decodedPath = decodeURIComponent(req.path);
      const filePath = decodedPath.replace(/^\/downloads\//, "");
      
      const userId = req.query.uid;
      const action = req.query.action;

      if (!userId) {
        logger.warn("Tentativa de acesso sem UID.");
        res.status(403).send("Acesso não autorizado.");
        return;
      }

      const fullStoragePath = `pdfs/${userId}/${filePath}`;
      const file = bucket.file(fullStoragePath);

      logger.info(`Tentando servir o arquivo: ${fullStoragePath}`);

      const [exists] = await file.exists();
      if (!exists) {
        logger.error(`ARQUIVO NÃO ENCONTRADO NO STORAGE: ${fullStoragePath}`);
        res.status(404).send("Arquivo não encontrado ou você não tem permissão para acessá-lo.");
        return;
      }

      const [metadata] = await file.getMetadata();
      const fileName = metadata.name.split('/').pop();

      // --- INÍCIO DA CORREÇÃO DE CACHE ---
      // Adiciona cabeçalhos para impedir que o navegador ou o CDN guardem a resposta em cache.
      // Isto força a função a ser executada sempre, garantindo que o parâmetro 'action' seja verificado.
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      res.setHeader('Expires', '-1');
      res.setHeader('Pragma', 'no-cache');
      // --- FIM DA CORREÇÃO DE CACHE ---

      res.setHeader("Content-Type", metadata.contentType || "application/pdf");
      res.setHeader("Content-Length", metadata.size);

      let disposition = 'inline';
      if (action === 'download') {
        disposition = 'attachment';
      }

      res.setHeader(
        "Content-Disposition",
        `${disposition}; filename="${fileName}"`
      );

      file.createReadStream().pipe(res);

    } catch (error) {
      logger.error("Erro GERAL ao processar a requisição do arquivo:", error);
      res.status(500).send("Ocorreu um erro interno ao tentar acessar o arquivo.");
    }
  }
);
