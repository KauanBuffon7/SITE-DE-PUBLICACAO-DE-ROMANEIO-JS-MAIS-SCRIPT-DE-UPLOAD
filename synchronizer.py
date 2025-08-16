import os
import json
import time
from datetime import datetime, timedelta
import firebase_admin
from firebase_admin import credentials, firestore, storage
from concurrent.futures import ThreadPoolExecutor, as_completed

# --- CONFIGURAÇÃO INICIAL ---

SERVICE_ACCOUNT_KEY_PATH = ''
FIREBASE_STORAGE_BUCKET = 'romaneios-frigorifico-jau.firebasestorage.app' 
CONFIG_FILE = 'config.json'
INTERVALO_DE_VERIFICACAO_SEGUNDOS = 5 # 5 SEGUNDOS 
MAX_WORKERS = 10

# --- INICIALIZAÇÃO DO FIREBASE ---

try:
    print("🚀 Iniciando conexão com o Firebase...")
    cred = credentials.Certificate(SERVICE_ACCOUNT_KEY_PATH)
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred, {
            'storageBucket': FIREBASE_STORAGE_BUCKET
        })
    db = firestore.client()
    bucket = storage.bucket()
    print("✅ Conexão com o Firebase estabelecida com sucesso!")
except Exception as e:
    print(f"❌ ERRO: Não foi possível conectar ao Firebase. Verifique seus arquivos de configuração.")
    print(f"Detalhe do erro: {e}")
    exit()

# --- FUNÇÕES DE ARQUIVO ---

def carregar_configuracao():
    try:
        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"❌ ERRO ao carregar '{CONFIG_FILE}': {e}")
        return None

def get_local_files(base_path):
    local_files = {}
    for dirpath, _, filenames in os.walk(base_path):
        for filename in filenames:
            if filename.lower().endswith('.pdf'):
                full_path = os.path.join(dirpath, filename)
                relative_path = os.path.relpath(full_path, base_path)
                local_files[relative_path.replace(os.sep, '/')] = full_path
    return local_files

def get_remote_files(cliente_uid):
    remote_files = {}
    docs = db.collection('arquivos').where('clienteId', '==', cliente_uid).stream()
    for doc in docs:
        data = doc.to_dict()
        categoria = data.get('categoria', '')
        nome_arquivo = data.get('nomeDoArquivo', '')
        key = f"{categoria}/{nome_arquivo}" if categoria else nome_arquivo
        remote_files[key] = {'id': doc.id, 'storage_path': f"pdfs/{cliente_uid}/{key}"}
    return remote_files

def delete_from_storage(storage_path):
    blob = bucket.blob(storage_path)
    if blob.exists():
        print(f"  🗑️  Apagando do Storage: {storage_path}")
        blob.delete()

def delete_from_firestore(doc_id):
    print(f"  🔥  Apagando do Firestore: {doc_id}")
    db.collection('arquivos').document(doc_id).delete()

def upload_para_storage(caminho_local, caminho_destino_storage):
    print(f"  ☁️  Fazendo upload de '{os.path.basename(caminho_local)}'...")
    blob = bucket.blob(caminho_destino_storage)
    blob.upload_from_filename(caminho_local)
    blob.make_public()
    return blob.public_url

def salvar_no_firestore(cliente_uid, nome_cliente, nome_arquivo, url_download, categoria):
    print(f"  💾  Salvando no Firestore: {nome_arquivo}")
    doc_data = {
        'clienteId': cliente_uid,
        'nomeCliente': nome_cliente,
        'nomeDoArquivo': nome_arquivo,
        'urlParaDownload': url_download,
        'dataDeUpload': firestore.SERVER_TIMESTAMP,
        'categoria': categoria,
        'visualizado': False
    }
    db.collection('arquivos').add(doc_data)

# --- LÓGICA DE PROCESSAMENTO ---

def processar_cliente(cliente):
    cliente_uid = cliente['uid']
    nome_cliente = cliente['nome']
    caminho_pasta_local = cliente['pasta_local']
    
    if not os.path.isdir(caminho_pasta_local):
        return 0, 0

    local_files = get_local_files(caminho_pasta_local)
    remote_files = get_remote_files(cliente_uid)
    
    uploads_count = 0
    deletions_count = 0

    # Adições
    for local_path, full_local_path in local_files.items():
        if local_path not in remote_files:
            print(f"\n   ➕ Novo arquivo para upload: '{local_path}' para {nome_cliente}")
            storage_path = f"pdfs/{cliente_uid}/{local_path}"
            categoria = os.path.dirname(local_path)
            
            try:
                url = upload_para_storage(full_local_path, storage_path)
                salvar_no_firestore(cliente_uid, nome_cliente, os.path.basename(local_path), url, categoria)
                uploads_count += 1
            except Exception as e:
                print(f"   ❌ ERRO AO FAZER UPLOAD de '{local_path}': {e}")

    # Exclusões
    for remote_path, remote_data in remote_files.items():
        if remote_path not in local_files:
            print(f"\n   ➖ Arquivo para apagar: '{remote_path}' de {nome_cliente}")
            try:
                delete_from_storage(remote_data['storage_path'])
                delete_from_firestore(remote_data['id'])
                deletions_count += 1
            except Exception as e:
                print(f"   ❌ ERRO AO APAGAR '{remote_path}': {e}")
                
    return uploads_count, deletions_count

def sincronizar_pastas():
    timestamp_atual = datetime.now().strftime('%d/%m/%Y %H:%M:%S')
    print(f"\n[{timestamp_atual}] --- INICIANDO VERIFICAÇÃO COMPLETA ---")
    
    config = carregar_configuracao()
    if not config or not config.get('clientes'):
        return

    total_uploads, total_deletions = 0, 0
    
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futuros = {executor.submit(processar_cliente, cliente): cliente for cliente in config['clientes']}
        
        for futuro in as_completed(futuros):
            try:
                uploads, deletions = futuro.result()
                total_uploads += uploads
                total_deletions += deletions
            except Exception as e:
                print(f"   ❌ ERRO grave ao processar o cliente {futuros[futuro]['nome']}: {e}")

    print("\n--- RESUMO DA SINCRONIZAÇÃO ---")
    print(f"  ✅ {total_uploads} arquivo(s) adicionado(s).")
    print(f"  🗑️  {total_deletions} arquivo(s) removido(s).")
    print("👍 Sincronização completa.")

# --- PONTO DE ENTRADA DO SCRIPT ---
if __name__ == '__main__':
    print("=====================================================")
    print(" Sincronizador Automático de PDFs - v3.0 (Final)")
    print(f" O script irá verificar as pastas a cada {int(INTERVALO_DE_VERIFICACAO_SEGUNDOS / 60)} minutos.")
    print(" Pressione CTRL+C para parar a execução.")
    print("=====================================================")
    
    while True:
        try:
            sincronizar_pastas()
            proxima_verificacao = datetime.now() + timedelta(seconds=INTERVALO_DE_VERIFICACAO_SEGUNDOS)
            print(f"\n⏳ Próxima verificação agendada para: {proxima_verificacao.strftime('%H:%M:%S')}")
            time.sleep(INTERVALO_DE_VERIFICACAO_SEGUNDOS)
        except KeyboardInterrupt:
            print("\n👋 Sincronizador interrompido pelo usuário. Até logo!")
            break
        except Exception as e:
            print(f"🚨 Ocorreu um erro inesperado no loop principal: {e}")
            print(f"Aguardando {int(INTERVALO_DE_VERIFICACAO_SEGUNDOS / 60)} minutos antes de tentar novamente...")
            time.sleep(INTERVALO_DE_VERIFICACAO_SEGUNDOS)
